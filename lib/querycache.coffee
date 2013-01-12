###*!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
###

_ = require 'underscore'
class QueryCache
  constructor : (cacheClient) ->
    @cacheClient = cacheClient
    @queryStatus = new QueryStatus
    @cacheFunctions = []
  ###*
   * client 设置或获取缓存的client对象
   * @param  {Object} client 缓存对象
   * @return {QueryCache, Object} 若设置则返回QueryCache对象，若获取则返回缓存对象
  ###
  client : (client) ->
    if client
      @cacheClient = client
      return @
    else
      return @cacheClient
  ###*
   * key 返回该查询条件对应的缓存key,若该方法不可被缓存，直接返回null
   * @param  {String} query 查询条件的序列化
   * @param  {String} func 查询方法名
   * @return {String, null} 返回相应的key或者null
  ###
  key : (query, func) ->
    if @isCacheAvailable func
      crypto = require 'crypto'
      return 'jtmongodb_' + crypto.createHash('sha1').update(query).digest 'hex'
    else
      return null
  ###*
   * get 获取key对应的缓存数据
   * @param  {String} key 查询条件对应的hash key
   * @param  {Function} cbf 回调函数
   * @return {QueryCache} 
  ###
  get : (key, cbf = noop) ->
    cacheClient = @cacheClient
    queryStatus = @queryStatus
    if key
      if queryStatus.isQuering key
        queryStatus.addQuery key, cbf
      else
        queryStatus.setQuering key
        if !cacheClient
          cbf null, null
        else
          cacheClient.hgetall key, (err, data) ->
            if !err && data?.cache
              cache = JSON.parse data.cache
              queryStatus.execQuery key, cache
              cbf null, cache
            else
              cbf err, null
    else
      cbf null, null
    return @
  ###*
   * set 设置缓存的值，若ttl小于0，则不作缓存
   * @param {String} key  查询条件对应的hash key
   * @param {Object} data 缓存的数据
   * @param {Number} ttl  缓存的TTL
   * @return {QueryCache} 
  ###
  set : (key, data, ttl = -1) ->
    @queryStatus.execQuery key, data
    cacheClient = @cacheClient
    if cacheClient && key && data && ttl > 0
      cacheClient.hmset key, 'cache', JSON.stringify(data), 'createTime', Date.now(), (err) ->
        if err
          logger.error err
        else
          cacheClient.expire key, ttl
    return @
  ###*
   * next 让等待的下一条查询执行
   * @param  {String} key 查询条件对应的hash key
   * @return {QueryCache} 
  ###
  next : (key) ->
    @queryStatus.next key
    return @
  ###*
   * isCacheAvailable 判断该方法类型是否可缓存（有写入的操作都不缓存）
   * @param  {String}  func 方法名
   * @return {Boolean}               [description]
  ###
  isCacheAvailable : (func) ->
    cacheFunctions = @cacheFunctions
    return _.indexOf(cacheFunctions, func, true) != -1
  ###*
   * setCacheFunctions 设置可缓存的方法列表名
   * @param {String, Array} functions 可缓存的方法，数组或者以空格隔开的字符串
   * @return {QueryCache} 
  ###
  setCacheFunctions : (functions) ->
    if _.isArray functions
      @cacheFunctions = functions.sort()
    else
      @cacheFunctions = functions.split(' ').sort()
    return @

class QueryStatus
  ###*
   * queries 保存查询状态的列表
   * @type {QueryStatus}
  ###
  constructor : () ->
    @queries = {}
  ###*
   * setQuering 设置该key对应的查询为正在查询
   * @param {String} key 查询条件对应的hash key   
   * @type {QueryStatus}
  ### 
  setQuering : (key) ->
    self = @
    if key
      self.queries[key] = {
        status : 'quering'
        execFunctions : []
      }
    return @
  ###*
   * isQuering 判断是否已有相同的查询现在进行
   * @param  {String}  key 查询条件对应的hash key
   * @return {Boolean}     [description]
  ###
  isQuering : (key) ->
    self = @
    if key
      queries = self.queries
      query = queries[key]
      if query?.status == 'quering'
        return true
      else
        return false
    else
      return false
  ###*
   * addQuery 添加查询列表（等正在查询的完成时，顺序回调所有的execFunction）
   * @param {String} key 查询条件对应的hash key
   * @param {Function} execFunction 查询回调函数
   * @return {QueryCache} 
  ###
  addQuery : (key, execFunction) ->
    self = @
    if key && _.isFunction execFunction
      queries = self.queries
      query = queries[key]
      if query?.execFunctions
        query.execFunctions.push execFunction
    return @
  ###*
   * execQuery 执行所有的execFunction函数
   * @param  {String} key  查询条件对应的hash key
   * @param  {Object} data 查询的返回的数据
   * @return {QueryCache}     
  ###
  execQuery : (key, data) ->
    self = @
    if key && data
      queries = self.queries
      query = queries[key]
      dataJSONStr = JSON.stringify data
      if query?.execFunctions
        _.each query.execFunctions, (execFunction) ->
          execFunction null, JSON.parse dataJSONStr
    delete self.queries[key]
    return @
  ###*
   * next 让等待的下一条查询执行
   * @param  {String}   key 查询条件对应的hash key
   * @return {QueryCache}  
  ###
  next : (key) ->
    self = @
    if key
      queries = self.queries
      query = queries[key]
      if query?.execFunctions.length != 0
        execFunction = query.execFunctions.pop()
        execFunction null, null

module.exports = QueryCache