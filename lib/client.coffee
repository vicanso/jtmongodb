###*!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
###
_ = require 'underscore'
async = require 'async'
mongodb = require 'mongodb'
logger = console
noop = () ->


class Client
  ###*
   * constructor mongodb的client
   * @param  {Object} cacheClient 缓存mongodb的一些查询结果，若该参数为空，则不对查询结果缓存，尽量使用redis，若不使用redis，请封装redis的以下方法：hgetall, hmset, expire
   * @return {Client} 返回Client实例
  ###
  constructor : (cacheClient) ->
    @dbs = {}
    @dbCbfs = {}
    @dbInfos = {}
    @collections = {}
    @schemas = {}
    @mongodbConfigs = {}
    QueryCache = require './querycache'
    Tasks = require 'jttask'
    @tasks = new Tasks {
      autoNext : false
    }
    @cacheObj = new QueryCache cacheClient
    QUERY_CACHE @cacheObj
  ###*
   * addMongodbConfig 添加mongodb的配置信息
   * @param {Object} config 配置信息 {
   *     dbName : 'test'  //数据库的标识名（该参数只是用于标记数据库，不一定要和真正的数据库名一样，但在整个node中要保证唯一）
   *     uri : mongodb://localhost:10020/ys'  //数据库连接串
   *     immediatelyInit : true  //是否马上初始化数据库，该参数为可选，默认是使用时才动态初始化
   * }
  ###
  addMongodbConfig : (config) ->
    self = @
    callee = arguments.callee
    if _.isArray config
      configs = config
      _.each configs, (config) ->
        callee.call self, config
    else
      dbName = config.dbName
      delete config.dbName
      if @mongodbConfigs[dbName]
        logger.warn "waring:#{dbName} config is exists, it will be covered!"
      immediatelyInit = config.immediatelyInit
      delete config.immediatelyInit
      @mongodbConfigs[dbName] = config
      if immediatelyInit
        @_init dbName, config.uri, config.options
  ###*
   * getServerInfo 返回mongodb服务器信息
   * @param  {String} dbName 数据库的标识名
   * @param  {Function} cbf 回调函数
   * @return {Client} 返回Client实例
  ###
  getServerInfo : (dbName, cbf) ->
    self = @
    db = self.db dbName
    serverInfoHandle = (db) ->
      db.admin().serverInfo cbf
    if db
      serverInfoHandle db
    else
      self._addDbInitSuccessCbf dbName, serverInfoHandle
    return @
  ###*
   * getMongodbConfig 获取mongodb的配置信息
   * @param  {String} dbName 设置配置信息时的数据库标识名
   * @return {Object} 配置信息
  ###
  getMongodbConfig : (dbName) ->
    return @mongodbConfigs[dbName]
  ###*
   * set 配置Client
   * @param {String} key 需要设置的属性，现支持以下配置属性（log, queryTime, cacheClient, mongodb）
   * @param {Objct, Boolean} value 属性的值
  ###
  set : (key, value) ->
    self = @
    if _.isObject key
      obj = key
      _.each obj, (value, key) ->
        self.set key, value
    else if value?
      switch key
        when 'log' 
        then logger = value
        when 'queryTime' 
        then LOG_QUERY_TIME()
        when 'cacheClient'
        then self.cacheObj.client value
        when 'mongodb' 
        then self.addMongodbConfig value
        when 'timeOut'
        then self.tasks.set 'timeOut', value
        when 'limit'
        then self.tasks.set 'limit', value
        when 'valiate'
        then VALIDATE()
  ###*
   * dbInfo 获取、设置db的信息
   * @param  {String} dbName 数据库的标识名
   * @param  {String} info 数据库的信息，现暂用这几种状态信息（initializing, complete）,若该参数为空，则表示获取
   * @return {Client, String} 返回Client实例或该数据库的状态信息
  ###
  dbInfo : (dbName, info) ->
    if info
      @dbInfos[dbName] = info
      return @
    else
      return @dbInfos[dbName]
  ###*
   * _addDbInitSuccessCbf 添加数据库初始化完成时的回调（由于数据库有可能是动态初始化，因此在使用的时候有可能未初始化完成，因此增加该方法处理回调）
   * @param {String} dbName 数据库的标识名
   * @param {Function} cbf 回调函数
  ###
  _addDbInitSuccessCbf : (dbName, cbf) ->
    if _.isFunction cbf
      @dbCbfs[dbName] ?= []
      @dbCbfs[dbName].push cbf
    dbInfo = @dbInfo dbName
    if !dbInfo
      mongodbConfig = @getMongodbConfig dbName
      if mongodbConfig
        @_init dbName, mongodbConfig.uri, mongodbConfig.options
  ###*
   * db 获取或设置db对象
   * @param  {String} dbName 数据库的标识名
   * @param  {Db} db mongodb打开后返回的对象
   * @return {Client, Db} 返回Client实例或者mongodb数据库实例
  ###
  db : (dbName, db) ->
    self = @
    if db
      @dbs[dbName] = db
      _.each @dbCbfs[dbName], (cbf) ->
        cbf db
      return self
    else
      return @dbs[dbName]
  ###*
   * handle mongodb的处理函数
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名字
   * @param  {String} handleName 处理方法
   * @param  {Array} args... 处理函数的其它参数
   * @param  {Function} cbf 回调函数
   * @return {Client} 返回Client实例
  ###
  handle : (dbName, collectionName, handleName, args..., cbf) ->
    self = @
    cacheObj = self.cacheObj
    se = self._serializationQuery _.toArray arguments
    key = cacheObj.key se, handleName
    tasks = self.tasks
    # originCbf = args.pop()
    wrapCbf = (err, data) ->
      if data && _.isFunction data.toArray
        data.toArray (err, data) ->
          if data
            cacheObj.set key, data, 60
          cbf err, data
          tasks.next()
      else
        cacheObj.set key, data, 60
        cbf err, data
        tasks.next()
    args.push wrapCbf
    self.collection dbName, collectionName, (err, collectionObj) ->
      if err
        cbf err
      else
        query = args[0]
        id = query._id
        if id
          query._id = self._convertToObjectID id
        self.tasks.add collectionObj[handleName], args, collectionObj
    return self 
  ###*
   * collection 获取、设置collection对象（由于collection也是动态初始化，所以获取是要通过异步来完成）
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名字
   * @param  {Function, Collection} cbf 或该参数为Function则是获取，否则为设置
   * @return {Client} 返回Client对象
  ###
  collection : (dbName, collectionName, cbf) ->
    self = @
    collectionKey = "#{dbName}_#{collectionName}"
    if !_.isFunction cbf
      collectionObj = cbf
      self.collections[collectionKey] = collectionObj
      return self
    else
      collectionObj = self.collections[collectionKey]
      if collectionObj
        cbf null, collectionObj
      else
        db = self.db dbName
        collectionHandle = (db) ->
          db.collection collectionName, (err, collectionObj) ->
            if err
              cbf err
            else
              self.collection dbName, collectionName, collectionObj
              cbf null, collectionObj
        if db
          collectionHandle db
        else
          self._addDbInitSuccessCbf dbName, collectionHandle
    return self
  ###*
   * schema 设置或者获取schema（传入的schema有可能会变转换，因些有可能设置和获取到的schema结构有所变化）
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名字
   * @param  {Object} schema schema对象
   * @return {Client, Object} 
  ###
  schema : (dbName, collectionName, schema) ->
    key = "#{dbName}_#{collectionName}"
    if schema?
      schema = @_convertSchema schema
      @schemas[key] = schema
      return @
    else
      return @schemas[key]
  ###*
   * _init 初始化数据库
   * @param  {String} dbName 数据库的标识名
   * @param  {String} uri 数据库连接字符串
   * @param  {Object} options 数据库连接选项，默认值为{fsync : false}
   * @return {Client} 返回Client对象
  ###
  _init : (dbName, uri, options = {fsync : false}) ->
    self = @
    uris = uri.split ','
    connectionInfos = {}
    url = require 'url'
    _.each uris, (uri) ->
      uri = url.parse uri
      if uri.path
        db = uri.path.substring 1
      if db
        if !connectionInfos[db]
          connectionInfos[db] = []
        connectionInfos[db].push {
          host : uri.hostname
          port : GLOBAL.parseInt uri.port || 47017
        }
    _.each connectionInfos, (value, name) ->
      if !self.dbInfo dbName
        serverOptionsKey = 'readPreference ssl slaveOk poolSize socketOptions logger auto_reconnect disableDriverBSONSizeCheck'.split ' '
        replicaSetOptions = _.pick options, 'rs_name read_secondary socketOptions'.split ' '
        serverOptions = _.pick options, serverOptionsKey
        server = self._getServer value, serverOptions, replicaSetOptions
        db = new mongodb.Db name, server, options
        db.open (err, db) ->
          if err
            logger.error "init db #{dbName} fail, msg:#{err}"
          else
            logger.info "init db #{dbName} success!"
            self.db dbName, db
            self.dbInfo dbName, 'complete'
        self.dbInfo dbName, 'initializing'
    return self
  ###*
   * _getServer 获取数据库服务器对象
   * @param  {Array} infos 数据库服务器配置信息（[{port:47017, host:'127.0.0.1'}]）
   * @param  {Obejct} options 配置选项
   * @param  {Object} replicaSetOptions repl set的配置信息
   * @return {mongodb.Server, mongodb.ReplSetServers} 数据库服务器实例
  ###
  _getServer : (infos, options, replicaSetOptions) ->
    # defaults = 
    #   poolSize : 10
    # options = _.extend defaults, options
    servers = _.map infos, (info) ->
      return new mongodb.Server info.host, info.port, options
    if servers.length > 1
      return new mongodb.ReplSetServers servers, replicaSetOptions
    else
      return servers[0]
  ###*
   * _serializationQuery 序列化参数列表（参数类型不为function）
   * @param  {Array} args 参数列表
   * @return {String} 
  ###
  _serializationQuery : (args) ->
    serializationList = []
    _.each args, (arg) ->
      if! _.isFunction arg
        if _.isString arg
          serializationList.push arg
        else
          serializationList.push JSON.stringify arg
    return serializationList.join ','
    
  ###*
   * _convertToObjectID 转换查询条件的id
   * @param  {mongodb.ObjectID, Array, Object} ids _id参数
   * @return {Object} 转换后的参数
  ###
  _convertToObjectID : (ids) ->
    callee = arguments.callee
    if ids instanceof mongodb.ObjectID
      return ids
    else if _.isArray ids
      return _.map ids, (id) ->
        return new mongodb.ObjectID id
    else if _.isObject ids
      _.each ids, (id, key) ->
        ids[key] = callee id
      return ids
    else
      return new mongodb.ObjectID ids
  ###*
   * _convertSchema 转换schema
   * @param  {Object} schema schema对象
   * @return {Object} 转换后的schema对象
  ###
  _convertSchema : (schema) ->
    _.each schema, (value, key) ->
      if _.isString value
        values = value.split ' '
        if values.length == 1
          values = values[0]
        schema[key] = {
          type : values
        }
    schema = 
      properties : schema
    return schema
###*
 * QUERY_CACHE 添加查询缓存
 * @param  {QueryCache} cacheObj [description]
###
QUERY_CACHE = (cacheObj) ->
  cacheObj.setCacheFunctions 'find findOne findById count'
  Client.prototype.handle = _.wrap Client.prototype.handle, (func, args...) ->
    self = @
    se = self._serializationQuery args
    key = cacheObj.key se, args[2]
    if !key
      func.apply self, args
    else
      cbf = args[args.length - 1]
      cacheObj.get key, (err, data) ->
        if !err && data
          cbf null, data
        else
          func.apply self, args
  QUERY_CACHE = noop

###*
 * LOG_QUERY_TIME 添加查询时间的log
###
LOG_QUERY_TIME = () ->
  Client.prototype.handle = _.wrap Client.prototype.handle, (func, args...) ->
    self = @
    queryArgs = _.toArray arguments
    cbf = args.pop()
    start = Date.now()
    cbf = _.wrap cbf, (func, err, data) ->
      se = self._serializationQuery queryArgs
      logger.info "#{se} use time:#{Date.now() - start}ms"
      func err, data
    args.push cbf
    func.apply @, args
  LOG_QUERY_TIME = noop

VALIDATE = () ->
  jsonVailidator = require('amanda') 'json'
  validateFunctions = 'save update insert findByIdAndUpdate'.split(' ').sort()
  Client.prototype.handle = _.wrap Client.prototype.handle, (func, args...) ->
    self = @
    handleName = args[2]
    if !~_.indexOf validateFunctions, handleName, true
      func.apply self, args
      return 
    schema = self.schema args[0], args[1]
    if !schema
      func.apply self, args
      return 
    data = args[3]
    checkData = data
    if handleName == 'update' || handleName == 'findByIdAndUpdate'
      data = args[4]
      checkData = data['$set']
      schema = 
        properties : _.pick schema.properties, _.keys checkData
    if _.isArray data
      async.forEachLimit data, data.length, (item, cbf) ->
        jsonVailidator.validate item, schema, cbf
      ,(err) ->
        if err
          args.pop() err
        else
          func.apply self, args
    else
      jsonVailidator.validate checkData, schema, (err) ->
        if err
          args.pop() err
        else
          func.apply self, args
  VALIDATE = noop

module.exports = Client 