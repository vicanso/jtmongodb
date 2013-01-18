###*!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
###

_ = require 'underscore'
Client = require './client'
logger = console

noop = () ->

class JTMongodb
  ###*
   * constructor 创建JTMongodb对象
   * @return {JTMongodb} 返回JTMongodb实例
  ###
  constructor : () ->
    @client = new Client
  ###*
   * getConstructor 返回构造函数（因为直接require的时候都会直接实例化了一个对象，一般不需要再用实例化其它的，若真有需要，可以通过此方法 获取，再去new新的实例）
   * @return {JTMongodb} [description]
  ###
  getConstructor : () ->
    return JTMongodb
  ###*
   * set 该方法直接调用Client的set方法
   * @param {String, Object} key 要设置的key或者{key : value}
   * @param {String, Object} {optional} value 要设置的值 
  ###
  set : (key, value) ->
    @client.set key, value
    return @
  ###*
   * getServerInfo 返回mongodb服务器信息
   * @param  {String} dbName 数据库的标识名
   * @param  {[type]} args... [description]
   * @param  {Function} cbf 回调函数
   * @return {JTMongodb} 返回JTMongodb实例
  ###
  getServerInfo : (dbName, args..., cbf) ->
    @client.getServerInfo dbName, cbf
    return @
  ###*
   * isInitDb 判断数据库是否已初始化（因为数据库可以动态初始化，在使用前并不需要等待初始化的完成）
   * @param  {String}  dbName 数据库的标识名
   * @return {Boolean} 
  ###
  isInitDb : (dbName) ->
    if @client.db dbName
      return true
    else
      return false
  ###*
   * getClient 获取dbName对应的的db client对象（该对象有JTMongodb的所有方法，除'getClient createConnection isInitDb set'外，且所有的方法调用时不再需要传参数dbName）
   * @param  {String} dbName 数据库的标识名
   * @param  {String} {optional} collectionName collection的名字
   * @return {[type]}        [description]
  ###
  getClient : (dbName, collectionName) ->
    self = @
    client = {}
    unwrapFunctions = 'getClient createConnection isInitDb set'.split ' '
    _.each _.functions(self), (funcName) ->
      if _.indexOf(unwrapFunctions, funcName) == -1
        client[funcName] = (args...) ->
          if collectionName
            args.unshift collectionName
          args.unshift dbName
          self[funcName].apply self, args
    return client
  ###*
   * collection 获取、设置collection对象（由于collection也是动态初始化，所以获取是要通过异步来完成）
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名字
   * @param  {Function, Collection} cbf 或该参数为Function则是获取，否则为设置
   * @return {JTMongodb} 返回JTMongodb实例
  ###
  getCollection : (args...) ->
    client = @client
    client.collection.apply client, args
    return @
  ###*
   * find mongodb的find方法
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {Object} query 查询条件
   * @param  {String} {optional} fields 查询字段（参数位置可与options互换）
   * @param  {Object} {optional} options 查询选项
   * @param  {Function} cbf 回调函数（默认为空函数）
   * @return {JTMongodb} 返回JTMongodb对象
  ###
  find : (dbName, collectionName, query, fields, options, cbf = noop) ->
    args = _.toArray arguments
    argsTotal = args.length
    if argsTotal < 6
      cbf = args.pop()
    if argsTotal == 6
      if _.isObject fields
        newOptions = fields
        fields = options
        options = newOptions
    else if argsTotal ==5
      if _.isObject fields
        options = fields
        fields = null
      else
        options = {}
    else if argsTotal == 4
      fields = null
      options = {}
    fields = @convertFileds fields
    options.limit ?= 30
    @client.handle dbName, collectionName, 'find', query, fields, options, cbf
    return @
  ###*
   * findById mongodb的findById
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {String} id 查询的mongodb id
   * @param  {String} {optional} fields 显示的字段
   * @param  {Function} cbf 回调函数，默认为空函数
   * @return {JTMongodb} 
  ###
  findById : (dbName, collectionName, id, fields, cbf = noop) ->
    if _.isFunction fields
      cbf = fields
      fields = null
    query = 
      _id : id
    @findOne dbName, collectionName, query, fields, cbf
    return @
  ###*
   * findOne 查找一条记录
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {Object} query 查询条件
   * @param  {String} {optional} fields 返回的查询字段（可与参数optional互换位置）
   * @param  {Object} {optional} options 查询选项
   * @param  {Function} cbf 回调函数，默认为空函数
   * @return {JTMongodb}
  ###
  findOne : (dbName, collectionName, query, fields, options, cbf = noop) ->
    args = _.toArray arguments
    argsTotal = args.length
    if argsTotal < 6
      cbf = args.pop()
    if argsTotal == 6
      if _.isObject fields
        newOptions = fields
        fields = options
        options = newOptions
    else if argsTotal ==5
      if _.isObject fields
        options = fields
        fields = null
      else
        options = {}
    else if argsTotal == 4
      fields = null
      options = {}
    fields = @convertFileds fields
    @client.handle dbName, collectionName, 'findOne', query, fields, options, cbf
    return @
  ###*
   * count 计算记录总数
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @return {JTMongodb} 
  ###
  count : (dbName, collectionName, args...) ->
    args.unshift dbName, collectionName, 'count'
    @client.handle.apply @client, args 
    return @
  ###*
   * save 保存一条记录
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @return {JTMongodb}
  ###
  save : (dbName, collectionName, args...) ->
    client = @client
    args.unshift dbName, collectionName 'save'
    client.handle.apply client, args
    return @
  ###*
   * findByIdAndUpdate 根据id查询并更新数据
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {String} id mongodb id
   * @param  {Object} updateData 需要更新的数据
   * @param  {Function} cbf 回调函数，默认为空函数
   * @return {JTMongodb} 
  ###
  findByIdAndUpdate : (dbName, collectionName, id, updateData, args...) ->
    query = 
      _id : id
    delete updateData._id
    update = 
      '$set' : updateData
    args.unshift dbName, collectionName, query, update
    @update.apply @, args
    return @
  ###*
   * update 更新数据
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {Object} query 查询条件
   * @param  {Object} updateData 更新的数据
   * @param  {Object} {optional} options 更新操作的选项
   * @param  {Function} cbf 回调函数，默认为空函数
   * @return {JTMongodb} 
  ###
  update : (dbName, collectionName, query, updateData, options, cbf = noop) ->
    updateData['$set'] ?= {}
    updateData['$set'].modifiedAt = new Date
    delete updateData['$set'].createdAt 
    if _.isFunction options
      cbf = options
      options = null
    @client.handle dbName, collectionName, 'update', query, updateData, options, cbf
    return @
  insert : (dbName, collectionName, docs, args...) ->
    if !_.isArray docs
      cbf = args.pop()
      if _.isFunction cbf
        cbf new Error 'the insert data is not array!'
      return
    args.unshift dbName, collectionName, 'insert', docs
    @client.handle.apply @client, args
    return @
  ###*
   * addSchema 添加schema
   * @param  {String} dbName 数据库的标识名
   * @param  {String} collectionName collection的名称
   * @param  {Object} schema schema对象
   * @return {JTMongodb}
  ###
  addSchema : (dbName, collectionName, schema) ->
    if _.isObject schema
      @client.schema dbName, collectionName, schema
    return @
  ###*
   * convertFileds 将fields转换
   * @param  {String, Object} fields 查询结果返回的字段（字符串以空格分隔）
   * @return {Object} 返回转换后的查询字段格式
  ###
  convertFileds : (fields) ->
    if !fields
      return {}
    else if _.isObject fields
      return fields
    else
      newFields = {}
      _.each fields.split(' '), (field) ->
        newFields[field] = true
      return newFields

_.each 'ensureIndex dropIndex indexInformation isCapped indexExists stats'.split(' '), (func) ->
  JTMongodb.prototype[func] = (args...) ->
    args.splice 2, 0, func
    @client.handle.apply @client, args



module.exports = new JTMongodb