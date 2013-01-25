
/**!
* Copyright(c) 2012 vicanso 腻味
* MIT Licensed
*/


(function() {
  var QueryCache, _;

  _ = require('underscore');

  QueryCache = (function() {

    function QueryCache(cacheClient) {
      this.cacheClient = cacheClient;
      this.cacheFunctions = [];
    }

    /**
     * client 设置或获取缓存的client对象
     * @param  {Object} client 缓存对象
     * @return {QueryCache, Object} 若设置则返回QueryCache对象，若获取则返回缓存对象
    */


    QueryCache.prototype.client = function(client) {
      if (client) {
        this.cacheClient = client;
        return this;
      } else {
        return this.cacheClient;
      }
    };

    /**
     * key 返回该查询条件对应的缓存key,若该方法不可被缓存，直接返回null
     * @param  {String} query 查询条件的序列化
     * @param  {String} func 查询方法名
     * @return {String, null} 返回相应的key或者null
    */


    QueryCache.prototype.key = function(query, func) {
      var crypto;
      if (this.isCacheAvailable(func)) {
        crypto = require('crypto');
        return 'jtmongodb_' + crypto.createHash('sha1').update(query).digest('hex');
      } else {
        return null;
      }
    };

    /**
     * get 获取key对应的缓存数据
     * @param  {String} key 查询条件对应的hash key
     * @param  {Function} cbf 回调函数
     * @return {QueryCache}
    */


    QueryCache.prototype.get = function(key, cbf) {
      var cacheClient;
      if (cbf == null) {
        cbf = noop;
      }
      cacheClient = this.cacheClient;
      if (key) {
        if (!cacheClient) {
          cbf(null, null);
        } else {
          cacheClient.hgetall(key, function(err, data) {
            var cache;
            if (!err && (data != null ? data.cache : void 0)) {
              cache = JSON.parse(data.cache);
              return cbf(null, cache);
            } else {
              return cbf(err, null);
            }
          });
        }
      } else {
        cbf(null, null);
      }
      return this;
    };

    /**
     * set 设置缓存的值，若ttl小于0，则不作缓存
     * @param {String} key  查询条件对应的hash key
     * @param {Object} data 缓存的数据
     * @param {Number} ttl  缓存的TTL
     * @return {QueryCache}
    */


    QueryCache.prototype.set = function(key, data, ttl) {
      var cacheClient;
      if (ttl == null) {
        ttl = -1;
      }
      cacheClient = this.cacheClient;
      if (cacheClient && key && data && ttl > 0) {
        cacheClient.hmset(key, 'cache', JSON.stringify(data), 'createTime', Date.now(), function(err) {
          if (err) {
            return logger.error(err);
          } else {
            return cacheClient.expire(key, ttl);
          }
        });
      }
      return this;
    };

    /**
     * isCacheAvailable 判断该方法类型是否可缓存（有写入的操作都不缓存）
     * @param  {String}  func 方法名
     * @return {Boolean}               [description]
    */


    QueryCache.prototype.isCacheAvailable = function(func) {
      var cacheFunctions;
      cacheFunctions = this.cacheFunctions;
      return _.indexOf(cacheFunctions, func, true) !== -1;
    };

    /**
     * setCacheFunctions 设置可缓存的方法列表名
     * @param {String, Array} functions 可缓存的方法，数组或者以空格隔开的字符串
     * @return {QueryCache}
    */


    QueryCache.prototype.setCacheFunctions = function(functions) {
      if (_.isArray(functions)) {
        this.cacheFunctions = functions.sort();
      } else {
        this.cacheFunctions = functions.split(' ').sort();
      }
      return this;
    };

    return QueryCache;

  })();

  module.exports = QueryCache;

}).call(this);
