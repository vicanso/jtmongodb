
/**!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
*/


(function() {
  var Client, LOG_QUERY_TIME, QUERY_CACHE, VALIDATE, async, logger, mongodb, noop, _,
    __slice = [].slice;

  _ = require('underscore');

  async = require('async');

  mongodb = require('mongodb');

  logger = console;

  noop = function() {};

  Client = (function() {
    /**
     * constructor mongodb的client
     * @param  {Object} cacheClient 缓存mongodb的一些查询结果，若该参数为空，则不对查询结果缓存，尽量使用redis，若不使用redis，请封装redis的以下方法：hgetall, hmset, expire
     * @return {Client} 返回Client实例
    */

    function Client(cacheClient) {
      var QueryCache, Tasks;
      this.dbs = {};
      this.dbCbfs = {};
      this.dbInfos = {};
      this.collections = {};
      this.schemas = {};
      this.mongodbConfigs = {};
      QueryCache = require('./querycache');
      Tasks = require('jttask');
      this.tasks = new Tasks({
        autoNext: false
      });
      this.cacheObj = new QueryCache(cacheClient);
      QUERY_CACHE(this.cacheObj);
    }

    /**
     * addMongodbConfig 添加mongodb的配置信息
     * @param {Object} config 配置信息 {
     *     dbName : 'test'  //数据库的标识名（该参数只是用于标记数据库，不一定要和真正的数据库名一样，但在整个node中要保证唯一）
     *     uri : mongodb://localhost:10020/ys'  //数据库连接串
     *     immediatelyInit : true  //是否马上初始化数据库，该参数为可选，默认是使用时才动态初始化
     * }
    */


    Client.prototype.addMongodbConfig = function(config) {
      var callee, configs, dbName, immediatelyInit, self;
      self = this;
      callee = arguments.callee;
      if (_.isArray(config)) {
        configs = config;
        return _.each(configs, function(config) {
          return callee.call(self, config);
        });
      } else {
        dbName = config.dbName;
        delete config.dbName;
        if (this.mongodbConfigs[dbName]) {
          logger.warn("waring:" + dbName + " config is exists, it will be covered!");
        }
        immediatelyInit = config.immediatelyInit;
        delete config.immediatelyInit;
        this.mongodbConfigs[dbName] = config;
        if (immediatelyInit) {
          return this._init(dbName, config.uri, config.options);
        }
      }
    };

    /**
     * getServerInfo 返回mongodb服务器信息
     * @param  {String} dbName 数据库的标识名
     * @param  {Function} cbf 回调函数
     * @return {Client} 返回Client实例
    */


    Client.prototype.getServerInfo = function(dbName, cbf) {
      var db, self, serverInfoHandle;
      self = this;
      db = self.db(dbName);
      serverInfoHandle = function(db) {
        return db.admin().serverInfo(cbf);
      };
      if (db) {
        serverInfoHandle(db);
      } else {
        self._addDbInitSuccessCbf(dbName, serverInfoHandle);
      }
      return this;
    };

    /**
     * getMongodbConfig 获取mongodb的配置信息
     * @param  {String} dbName 设置配置信息时的数据库标识名
     * @return {Object} 配置信息
    */


    Client.prototype.getMongodbConfig = function(dbName) {
      return this.mongodbConfigs[dbName];
    };

    /**
     * set 配置Client
     * @param {String} key 需要设置的属性，现支持以下配置属性（log, queryTime, cacheClient, mongodb）
     * @param {Objct, Boolean} value 属性的值
    */


    Client.prototype.set = function(key, value) {
      var obj, self;
      self = this;
      if (_.isObject(key)) {
        obj = key;
        return _.each(obj, function(value, key) {
          return self.set(key, value);
        });
      } else if (value != null) {
        switch (key) {
          case 'log':
            return logger = value;
          case 'queryTime':
            return LOG_QUERY_TIME();
          case 'cacheClient':
            return self.cacheObj.client(value);
          case 'mongodb':
            return self.addMongodbConfig(value);
          case 'timeOut':
            return self.tasks.set('timeOut', value);
          case 'limit':
            return self.tasks.set('limit', value);
          case 'valiate':
            return VALIDATE();
        }
      }
    };

    /**
     * dbInfo 获取、设置db的信息
     * @param  {String} dbName 数据库的标识名
     * @param  {String} info 数据库的信息，现暂用这几种状态信息（initializing, complete）,若该参数为空，则表示获取
     * @return {Client, String} 返回Client实例或该数据库的状态信息
    */


    Client.prototype.dbInfo = function(dbName, info) {
      if (info) {
        this.dbInfos[dbName] = info;
        return this;
      } else {
        return this.dbInfos[dbName];
      }
    };

    /**
     * _addDbInitSuccessCbf 添加数据库初始化完成时的回调（由于数据库有可能是动态初始化，因此在使用的时候有可能未初始化完成，因此增加该方法处理回调）
     * @param {String} dbName 数据库的标识名
     * @param {Function} cbf 回调函数
    */


    Client.prototype._addDbInitSuccessCbf = function(dbName, cbf) {
      var dbInfo, mongodbConfig, _base, _ref;
      if (_.isFunction(cbf)) {
        if ((_ref = (_base = this.dbCbfs)[dbName]) == null) {
          _base[dbName] = [];
        }
        this.dbCbfs[dbName].push(cbf);
      }
      dbInfo = this.dbInfo(dbName);
      if (!dbInfo) {
        mongodbConfig = this.getMongodbConfig(dbName);
        if (mongodbConfig) {
          return this._init(dbName, mongodbConfig.uri, mongodbConfig.options);
        }
      }
    };

    /**
     * db 获取或设置db对象
     * @param  {String} dbName 数据库的标识名
     * @param  {Db} db mongodb打开后返回的对象
     * @return {Client, Db} 返回Client实例或者mongodb数据库实例
    */


    Client.prototype.db = function(dbName, db) {
      var self;
      self = this;
      if (db) {
        this.dbs[dbName] = db;
        _.each(this.dbCbfs[dbName], function(cbf) {
          return cbf(db);
        });
        return self;
      } else {
        return this.dbs[dbName];
      }
    };

    /**
     * handle mongodb的处理函数
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名字
     * @param  {String} handleName 处理方法
     * @param  {Array} args... 处理函数的其它参数
     * @param  {Function} cbf 回调函数
     * @return {Client} 返回Client实例
    */


    Client.prototype.handle = function() {
      var args, cacheObj, cbf, collectionName, dbName, handleName, key, se, self, tasks, wrapCbf, _i;
      dbName = arguments[0], collectionName = arguments[1], handleName = arguments[2], args = 5 <= arguments.length ? __slice.call(arguments, 3, _i = arguments.length - 1) : (_i = 3, []), cbf = arguments[_i++];
      self = this;
      cacheObj = self.cacheObj;
      se = self._serializationQuery(_.toArray(arguments));
      key = cacheObj.key(se, handleName);
      tasks = self.tasks;
      wrapCbf = function(err, data) {
        if (data && _.isFunction(data.toArray)) {
          return data.toArray(function(err, data) {
            if (data) {
              cacheObj.set(key, data, 60);
            }
            cbf(err, data);
            return tasks.next();
          });
        } else {
          cacheObj.set(key, data, 60);
          cbf(err, data);
          return tasks.next();
        }
      };
      args.push(wrapCbf);
      self.collection(dbName, collectionName, function(err, collectionObj) {
        var id, query;
        if (err) {
          return cbf(err);
        } else {
          query = args[0];
          id = query._id;
          if (id) {
            query._id = self._convertToObjectID(id);
          }
          return self.tasks.add(collectionObj[handleName], args, collectionObj);
        }
      });
      return self;
    };

    /**
     * collection 获取、设置collection对象（由于collection也是动态初始化，所以获取是要通过异步来完成）
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名字
     * @param  {Function, Collection} cbf 或该参数为Function则是获取，否则为设置
     * @return {Client} 返回Client对象
    */


    Client.prototype.collection = function(dbName, collectionName, cbf) {
      var collectionHandle, collectionKey, collectionObj, db, self;
      self = this;
      collectionKey = "" + dbName + "_" + collectionName;
      if (!_.isFunction(cbf)) {
        collectionObj = cbf;
        self.collections[collectionKey] = collectionObj;
        return self;
      } else {
        collectionObj = self.collections[collectionKey];
        if (collectionObj) {
          cbf(null, collectionObj);
        } else {
          db = self.db(dbName);
          collectionHandle = function(db) {
            return db.collection(collectionName, function(err, collectionObj) {
              if (err) {
                return cbf(err);
              } else {
                self.collection(dbName, collectionName, collectionObj);
                return cbf(null, collectionObj);
              }
            });
          };
          if (db) {
            collectionHandle(db);
          } else {
            self._addDbInitSuccessCbf(dbName, collectionHandle);
          }
        }
      }
      return self;
    };

    /**
     * schema 设置或者获取schema（传入的schema有可能会变转换，因些有可能设置和获取到的schema结构有所变化）
     * @param  {String} dbName 数据库的标识名
     * @param  {String} collectionName collection的名字
     * @param  {Object} schema schema对象
     * @return {Client, Object}
    */


    Client.prototype.schema = function(dbName, collectionName, schema) {
      var key;
      key = "" + dbName + "_" + collectionName;
      if (schema != null) {
        schema = this._convertSchema(schema);
        this.schemas[key] = schema;
        return this;
      } else {
        return this.schemas[key];
      }
    };

    /**
     * _init 初始化数据库
     * @param  {String} dbName 数据库的标识名
     * @param  {String} uri 数据库连接字符串
     * @param  {Object} options 数据库连接选项，默认值为{fsync : false}
     * @return {Client} 返回Client对象
    */


    Client.prototype._init = function(dbName, uri, options) {
      var connectionInfos, self, uris, url;
      if (options == null) {
        options = {
          fsync: false
        };
      }
      self = this;
      uris = uri.split(',');
      connectionInfos = {};
      url = require('url');
      _.each(uris, function(uri) {
        var db;
        uri = url.parse(uri);
        if (uri.path) {
          db = uri.path.substring(1);
        }
        if (db) {
          if (!connectionInfos[db]) {
            connectionInfos[db] = [];
          }
          return connectionInfos[db].push({
            host: uri.hostname,
            port: GLOBAL.parseInt(uri.port || 47017)
          });
        }
      });
      _.each(connectionInfos, function(value, name) {
        var db, replicaSetOptions, server, serverOptions, serverOptionsKey;
        if (!self.dbInfo(dbName)) {
          serverOptionsKey = 'readPreference ssl slaveOk poolSize socketOptions logger auto_reconnect disableDriverBSONSizeCheck'.split(' ');
          replicaSetOptions = _.pick(options, 'rs_name read_secondary socketOptions'.split(' '));
          serverOptions = _.pick(options, serverOptionsKey);
          server = self._getServer(value, serverOptions, replicaSetOptions);
          db = new mongodb.Db(name, server, options);
          db.open(function(err, db) {
            if (err) {
              return logger.error("init db " + dbName + " fail, msg:" + err);
            } else {
              logger.info("init db " + dbName + " success!");
              self.db(dbName, db);
              return self.dbInfo(dbName, 'complete');
            }
          });
          return self.dbInfo(dbName, 'initializing');
        }
      });
      return self;
    };

    /**
     * _getServer 获取数据库服务器对象
     * @param  {Array} infos 数据库服务器配置信息（[{port:47017, host:'127.0.0.1'}]）
     * @param  {Obejct} options 配置选项
     * @param  {Object} replicaSetOptions repl set的配置信息
     * @return {mongodb.Server, mongodb.ReplSetServers} 数据库服务器实例
    */


    Client.prototype._getServer = function(infos, options, replicaSetOptions) {
      var servers;
      servers = _.map(infos, function(info) {
        return new mongodb.Server(info.host, info.port, options);
      });
      if (servers.length > 1) {
        return new mongodb.ReplSetServers(servers, replicaSetOptions);
      } else {
        return servers[0];
      }
    };

    /**
     * _serializationQuery 序列化参数列表（参数类型不为function）
     * @param  {Array} args 参数列表
     * @return {String}
    */


    Client.prototype._serializationQuery = function(args) {
      var serializationList;
      serializationList = [];
      _.each(args, function(arg) {
        if (!_.isFunction(arg)) {
          if (_.isString(arg)) {
            return serializationList.push(arg);
          } else {
            return serializationList.push(JSON.stringify(arg));
          }
        }
      });
      return serializationList.join(',');
    };

    /**
     * _convertToObjectID 转换查询条件的id
     * @param  {mongodb.ObjectID, Array, Object} ids _id参数
     * @return {Object} 转换后的参数
    */


    Client.prototype._convertToObjectID = function(ids) {
      var callee;
      callee = arguments.callee;
      if (ids instanceof mongodb.ObjectID) {
        return ids;
      } else if (_.isArray(ids)) {
        return _.map(ids, function(id) {
          return new mongodb.ObjectID(id);
        });
      } else if (_.isObject(ids)) {
        _.each(ids, function(id, key) {
          return ids[key] = callee(id);
        });
        return ids;
      } else {
        return new mongodb.ObjectID(ids);
      }
    };

    /**
     * _convertSchema 转换schema
     * @param  {Object} schema schema对象
     * @return {Object} 转换后的schema对象
    */


    Client.prototype._convertSchema = function(schema) {
      _.each(schema, function(value, key) {
        var values;
        if (_.isString(value)) {
          values = value.split(' ');
          if (values.length === 1) {
            values = values[0];
          }
          return schema[key] = {
            type: values
          };
        }
      });
      schema = {
        properties: schema
      };
      return schema;
    };

    return Client;

  })();

  /**
   * QUERY_CACHE 添加查询缓存
   * @param  {QueryCache} cacheObj [description]
  */


  QUERY_CACHE = function(cacheObj) {
    cacheObj.setCacheFunctions('find findOne findById count');
    Client.prototype.handle = _.wrap(Client.prototype.handle, function() {
      var args, cbf, func, key, se, self;
      func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      self = this;
      se = self._serializationQuery(args);
      key = cacheObj.key(se, args[2]);
      if (!key) {
        return func.apply(self, args);
      } else {
        cbf = args[args.length - 1];
        return cacheObj.get(key, function(err, data) {
          if (!err && data) {
            return cbf(null, data);
          } else {
            return func.apply(self, args);
          }
        });
      }
    });
    return QUERY_CACHE = noop;
  };

  /**
   * LOG_QUERY_TIME 添加查询时间的log
  */


  LOG_QUERY_TIME = function() {
    Client.prototype.handle = _.wrap(Client.prototype.handle, function() {
      var args, cbf, func, queryArgs, self, start;
      func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      self = this;
      queryArgs = _.toArray(arguments);
      cbf = args.pop();
      start = Date.now();
      cbf = _.wrap(cbf, function(func, err, data) {
        var se;
        se = self._serializationQuery(queryArgs);
        logger.info("" + se + " use time:" + (Date.now() - start) + "ms");
        return func(err, data);
      });
      args.push(cbf);
      return func.apply(this, args);
    });
    return LOG_QUERY_TIME = noop;
  };

  VALIDATE = function() {
    var jsonVailidator, validateFunctions;
    jsonVailidator = require('amanda')('json');
    validateFunctions = 'save update insert findByIdAndUpdate'.split(' ').sort();
    Client.prototype.handle = _.wrap(Client.prototype.handle, function() {
      var args, checkData, data, func, handleName, schema, self;
      func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      self = this;
      handleName = args[2];
      if (!~_.indexOf(validateFunctions, handleName, true)) {
        func.apply(self, args);
        return;
      }
      schema = self.schema(args[0], args[1]);
      if (!schema) {
        func.apply(self, args);
        return;
      }
      data = args[3];
      checkData = data;
      if (handleName === 'update' || handleName === 'findByIdAndUpdate') {
        data = args[4];
        checkData = data['$set'];
        schema = {
          properties: _.pick(schema.properties, _.keys(checkData))
        };
      }
      if (_.isArray(data)) {
        return async.forEachLimit(data, data.length, function(item, cbf) {
          return jsonVailidator.validate(item, schema, cbf);
        }, function(err) {
          if (err) {
            return args.pop()(err);
          } else {
            return func.apply(self, args);
          }
        });
      } else {
        return jsonVailidator.validate(checkData, schema, function(err) {
          if (err) {
            return args.pop()(err);
          } else {
            return func.apply(self, args);
          }
        });
      }
    });
    return VALIDATE = noop;
  };

  module.exports = Client;

}).call(this);
