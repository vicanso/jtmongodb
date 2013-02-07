
/**!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
*/


(function() {
  var Client, JTMongodb, logger, noop, _,
    __slice = [].slice;

  _ = require('underscore');

  Client = require('./client');

  logger = console;

  noop = function() {};

  JTMongodb = (function() {
    /**
     * constructor 创建JTMongodb对象
     * @return {JTMongodb} 返回JTMongodb实例
    */

    function JTMongodb() {
      this.client = new Client;
    }

    /**
     * getConstructor 返回构造函数（因为直接require的时候都会直接实例化了一个对象，一般不需要再用实例化其它的，若真有需要，可以通过此方法 获取，再去new新的实例）
     * @return {JTMongodb} [description]
    */


    JTMongodb.prototype.getConstructor = function() {
      return JTMongodb;
    };

    /**
     * set 该方法直接调用Client的set方法
     * @param {String, Object} key 要设置的key或者{key : value}
     * @param {String, Object} {optional} value 要设置的值
    */


    JTMongodb.prototype.set = function(key, value) {
      this.client.set(key, value);
      return this;
    };

    /**
     * getServerInfo 返回mongodb服务器信息
     * @param  {String} dbName 数据库的标识名
     * @param  {[type]} args... [description]
     * @param  {Function} cbf 回调函数
     * @return {JTMongodb} 返回JTMongodb实例
    */


    JTMongodb.prototype.getServerInfo = function() {
      var args, cbf, dbName, _i;
      dbName = arguments[0], args = 3 <= arguments.length ? __slice.call(arguments, 1, _i = arguments.length - 1) : (_i = 1, []), cbf = arguments[_i++];
      this.client.getServerInfo(dbName, cbf);
      return this;
    };

    /**
     * getClient 获取dbName对应的的db client对象（该对象有JTMongodb的所有方法，除'getClient set'外，且所有的方法调用时不再需要传参数dbName和collectionName）
     * @param  {String} dbName 数据库的标识名
     * @param  {String} {optional} collectionName collection的名字
     * @return {[type]}        [description]
    */


    JTMongodb.prototype.getClient = function(dbName, collectionName) {
      var client, self, unwrapFunctions;
      self = this;
      client = {};
      unwrapFunctions = 'getClient set'.split(' ');
      _.each(_.functions(self), function(funcName) {
        if (_.indexOf(unwrapFunctions, funcName) === -1) {
          return client[funcName] = function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            if (collectionName) {
              args.unshift(collectionName);
            }
            args.unshift(dbName);
            return self[funcName].apply(self, args);
          };
        }
      });
      return client;
    };

    /**
     * getCollection 获取collection对象（由于collection也是动态初始化，所以获取是要通过异步来完成）
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名字
     * @param  {Function} cbf 回调函数
     * @return {JTMongodb} 返回JTMongodb实例
    */


    JTMongodb.prototype.getCollection = function() {
      var args, cbf, client;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      client = this.client;
      cbf = _.last(args);
      args.length = 2;
      args.push(cbf);
      client.collection.apply(client, args);
      return this;
    };

    /**
     * find mongodb的find方法
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {Object} query 查询条件
     * @param  {String} {optional} fields 查询字段（参数位置可与options互换）
     * @param  {Object} {optional} options 查询选项
     * @param  {Function} cbf 回调函数（默认为空函数）
     * @return {JTMongodb} 返回JTMongodb对象
    */


    JTMongodb.prototype.find = function(dbName, collectionName, query, fields, options, cbf) {
      var args, argsTotal, newOptions, _ref;
      if (cbf == null) {
        cbf = noop;
      }
      args = _.toArray(arguments);
      argsTotal = args.length;
      if (argsTotal < 6) {
        cbf = args.pop();
      }
      if (argsTotal === 6) {
        if (_.isObject(fields)) {
          newOptions = fields;
          fields = options;
          options = newOptions;
        }
      } else if (argsTotal === 5) {
        if (_.isObject(fields)) {
          options = fields;
          fields = null;
        } else {
          options = {};
        }
      } else if (argsTotal === 4) {
        fields = null;
        options = {};
      }
      fields = this.convertFileds(fields);
      if ((_ref = options.limit) == null) {
        options.limit = 30;
      }
      this.client.handle(dbName, collectionName, 'find', query, fields, options, cbf);
      return this;
    };

    /**
     * findById mongodb的findById
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {String} id 查询的mongodb id
     * @param  {String} {optional} fields 显示的字段
     * @param  {Function} cbf 回调函数，默认为空函数
     * @return {JTMongodb}
    */


    JTMongodb.prototype.findById = function(dbName, collectionName, id, fields, cbf) {
      var query;
      if (cbf == null) {
        cbf = noop;
      }
      if (_.isFunction(fields)) {
        cbf = fields;
        fields = null;
      }
      query = {
        _id: id
      };
      this.findOne(dbName, collectionName, query, fields, cbf);
      return this;
    };

    /**
     * findOne 查找一条记录
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {Object} query 查询条件
     * @param  {String} {optional} fields 返回的查询字段（可与参数optional互换位置）
     * @param  {Object} {optional} options 查询选项
     * @param  {Function} cbf 回调函数，默认为空函数
     * @return {JTMongodb}
    */


    JTMongodb.prototype.findOne = function(dbName, collectionName, query, fields, options, cbf) {
      var args, argsTotal, newOptions;
      if (cbf == null) {
        cbf = noop;
      }
      args = _.toArray(arguments);
      argsTotal = args.length;
      if (argsTotal < 6) {
        cbf = args.pop();
      }
      if (argsTotal === 6) {
        if (_.isObject(fields)) {
          newOptions = fields;
          fields = options;
          options = newOptions;
        }
      } else if (argsTotal === 5) {
        if (_.isObject(fields)) {
          options = fields;
          fields = null;
        } else {
          options = {};
        }
      } else if (argsTotal === 4) {
        fields = null;
        options = {};
      }
      fields = this.convertFileds(fields);
      this.client.handle(dbName, collectionName, 'findOne', query, fields, options, cbf);
      return this;
    };

    /**
     * count 计算记录总数
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @return {JTMongodb}
    */


    JTMongodb.prototype.count = function() {
      var args, collectionName, dbName;
      dbName = arguments[0], collectionName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      args.unshift(dbName, collectionName, 'count');
      this.client.handle.apply(this.client, args);
      return this;
    };

    /**
     * save 保存一条记录
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @return {JTMongodb}
    */


    JTMongodb.prototype.save = function() {
      var args, client, collectionName, dbName;
      dbName = arguments[0], collectionName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      client = this.client;
      args.unshift(dbName, collectionName, 'save');
      client.handle.apply(client, args);
      return this;
    };

    /**
     * findByIdAndUpdate 根据id查询并更新数据
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {String} id mongodb id
     * @param  {Object} updateData 需要更新的数据
     * @param  {Function} cbf 回调函数，默认为空函数
     * @return {JTMongodb}
    */


    JTMongodb.prototype.findByIdAndUpdate = function() {
      var args, collectionName, dbName, id, query, update, updateData;
      dbName = arguments[0], collectionName = arguments[1], id = arguments[2], updateData = arguments[3], args = 5 <= arguments.length ? __slice.call(arguments, 4) : [];
      query = {
        _id: id
      };
      delete updateData._id;
      update = {
        '$set': updateData
      };
      args.unshift(dbName, collectionName, query, update);
      this.update.apply(this, args);
      return this;
    };

    /**
     * update 更新数据
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {Object} query 查询条件
     * @param  {Object} updateData 更新的数据
     * @param  {Object} {optional} options 更新操作的选项
     * @param  {Function} cbf 回调函数，默认为空函数
     * @return {JTMongodb}
    */


    JTMongodb.prototype.update = function(dbName, collectionName, query, updateData, options, cbf) {
      var _ref;
      if (cbf == null) {
        cbf = noop;
      }
      if ((_ref = updateData['$set']) == null) {
        updateData['$set'] = {};
      }
      updateData['$set'].modifiedAt = new Date;
      delete updateData['$set'].createdAt;
      if (_.isFunction(options)) {
        cbf = options;
        options = null;
      }
      this.client.handle(dbName, collectionName, 'update', query, updateData, options, cbf);
      return this;
    };

    /**
     * insert 插入多条记录
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {Array} docs 要插入的多条记录
     * @param  {Array} args... 不定长参数
     * @return {JTMongodb}                [description]
    */


    JTMongodb.prototype.insert = function() {
      var args, cbf, collectionName, dbName, docs;
      dbName = arguments[0], collectionName = arguments[1], docs = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      if (!_.isArray(docs)) {
        cbf = args.pop();
        if (_.isFunction(cbf)) {
          cbf(new Error('the insert data is not array!'));
        }
        return;
      }
      args.unshift(dbName, collectionName, 'insert', docs);
      this.client.handle.apply(this.client, args);
      return this;
    };

    /**
     * addSchema 添加schema
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名称
     * @param  {Object} schema schema对象
     * @return {JTMongodb}
    */


    JTMongodb.prototype.addSchema = function(dbName, collectionName, schema) {
      if (_.isObject(schema)) {
        this.client.schema(dbName, collectionName, schema);
      }
      return this;
    };

    /**
     * convertFileds 将fields转换
     * @param  {String, Object} fields 查询结果返回的字段（字符串以空格分隔）
     * @return {Object} 返回转换后的查询字段格式
    */


    JTMongodb.prototype.convertFileds = function(fields) {
      var newFields;
      if (!fields) {
        return {};
      } else if (_.isObject(fields)) {
        return fields;
      } else {
        newFields = {};
        _.each(fields.split(' '), function(field) {
          return newFields[field] = true;
        });
        return newFields;
      }
    };

    return JTMongodb;

  })();

  _.each('ensureIndex dropIndex indexInformation isCapped indexExists stats distinct findAndModify findAndRemove reIndex mapReduce group options geoNear geoHaystackSearch indexes aggregate'.split(' '), function(func) {
    return JTMongodb.prototype[func] = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      args.splice(2, 0, func);
      return this.client.handle.apply(this.client, args);
    };
  });

  module.exports = new JTMongodb;

}).call(this);
