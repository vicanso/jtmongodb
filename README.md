# jtmongodb - node.js的mongodb操作类，其基于node-mongodb-native，封装了对mongodb的操作。

##特性：

- [动态的数据库初始化] 只需要配置好相关的mongodb相关信息，不用担心数据库是否连接，即使数据库未初始化完成，也可以调用相关的数据库操作
- [同一时刻相同的数据库操作只会执行一次] 如果有一个mongod的操作还在进行中，又有一个相同的操作被调用，后一个操作并不会直接的去连接mongodb，会在前一个操作返回时，将结果复制的返回给两个操作，对数据库数据有修改的操作例外
- [可以限制同一时间对mongodb的操作数] 使用jttask限制所有对mongodb的操作，也可以不限制
- [允许使用更高效的缓存机制来缓存查询的数据] 如果提供一个cacheClient，如redis等，在查询mongodb之前，会先去缓存中查询是否有相应的数据，有则直接返回，不进行真正的mongodb查询，缓存的数据可以设置ttl
- [允许设置schema] 允许设置schema，对某些collection需要对数据有校验的则添加，无需要的则不用添加
- [支持单个Server或者ReplSetServers] 


##Demo
```js
var jtMongodb = require('jtmongodb');
jtMongodb.set({
  queryTime : true,
  valiate : true,
  limit : 100,
  timeOut : 0,
  mongodb : [
    {
      dbName : 'test',
      uri : 'mongodb://127.0.0.1:10020/test,mongodb://127.0.0.1:10021/test,mongodb://127.0.0.1:10022/test',
      immediatelyInit : true,
      options : {
        rs_name : 'vicanso',
        w : 0,
        native_parser : true,
        auto_reconnect : true,
        readPreference : 'secondaryPreferred'
      }
    }
  ]
});

testClient = jtMongodb.getClient('test');
itemsClient = jtMongodb.getClient('test', 'items');

testClient.find('items', {}, {limit : 2}, 'title score', function(err, docs){
  console.dir(docs.length);
});

itemsClient.find({}, {limit : 2}, 'title score', function(err, docs){
  console.dir(docs.length);
});
```