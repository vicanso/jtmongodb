(function() {
  var goodsClient, itemsClient, jtMongodb;

  jtMongodb = require('jtmongodb');

  jtMongodb.set({
    queryTime: true,
    valiate: true,
    timeOut: 0,
    mongodb: [
      {
        dbName: 'test',
        uri: 'mongodb://127.0.0.1:10020/test,mongodb://127.0.0.1:10021/test,mongodb://127.0.0.1:10022/test',
        immediatelyInit: true,
        options: {
          w: 0,
          native_parser: true,
          auto_reconnect: true,
          read_secondary: true,
          readPreference: 'secondaryPreferred'
        }
      }, {
        dbName: 'vicanso',
        uri: 'mongodb://127.0.0.1:10020/vicanso',
        options: {
          w: 0,
          native_parser: true,
          auto_reconnect: true
        }
      }
    ]
  });

  itemsClient = jtMongodb.getClient('test', 'items');

  itemsClient.save({
    title: '测试数据'
  }, function(err, doc) {
    return console.dir(doc);
  });

  itemsClient.find({}, {
    limit: 5
  }, function(err, docs) {
    return console.dir(docs.length);
  });

  goodsClient = jtMongodb.getClient('vicanso', 'goods');

  goodsClient.save({
    title: '测试数据'
  }, function(err, doc) {
    return console.dir(doc);
  });

  goodsClient.find({}, function(err, docs) {
    return console.dir(docs.length);
  });

}).call(this);
