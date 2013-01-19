# jtmongodb - node.js的mongodb操作类，其基于node-mongodb-native，封装了对mongodb的操作。

##特性：

- 动态的数据库初始化：只需要配置好相关的mongodb相关信息，不用担心数据库是否连接，即使数据库未初始化完成，也可以调用相关的数据库操作
- 同一时刻相同的数据库操作只会执行一次：如果有一个mongod的操作还在进行中，又有一个相同的操作被调用，后一个操作并不会直接的去连接mongodb，会在前一个操作返回时，将结果复制的返回给两个操作，对数据库数据有修改的操作例外
- 可以限制同一时间对mongodb的操作数：使用jttask限制所有对mongodb的操作，也可以不限制
- 允许使用更高效的缓存机制来缓存查询的数据：如果提供一个cacheClient，如redis等，在查询mongodb之前，会先去缓存中查询是否有相应的数据，有则直接返回，不进行真正的mongodb查询，缓存的数据可以设置ttl
- 允许设置schema：允许设置schema，对某些collection需要对数据有校验的则添加，无需要的则不用添加
- 支持单个Server或者ReplSetServers


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

##API

- [getConstructor](#apiGetConstructor)
- [set](#apiSet)
- [getServerInfo](#apiGetServerInfo)
- [isInitDb](#apiIsInitDb)
- [getClient](#apiGetClient)
- [getCollection](#apiGetCollection)
- [find](#apiFind)
- [findById](#apiFindById)
- [findOne](#apiFindOne)
- [count](#apiCount)
- [save](#apiSave)
- [findByIdAndUpdate](#apiFindByIdAndUpdate)
- [update](#apiUpdate)
- [insert](#apiInsert)
- [addSchema](#apiAddSchema)
- [convertFileds](#apiConvertFileds)
- [ensureIndex](#apiEnsureIndex)
- [dropIndex](#apiDropIndex)
- [indexInformation](#apiIndexInformation)
- [isCapped](#apiIsCapped)
- [indexExists](#apiIndexExists)
- [stats](#apiStats)

<a name="apiGetConstructor" />
## getConstructor
### 返回构造函数（因为直接require的时候都会直接实例化了一个对象，一般不需要再用实例化其它的，若真有需要，可以通过此方法 获取，再去new新的实例）

```js
var jtMongodb = require('jtmongodb');
var JTMongodb = jtMongodb.getConstructor();
jtObj = new JTMongodb();
```

<a name="apiSet" />
## set 
### 设置一些JTMongodb的配置

### 参数列表
- key 配置的属性名（也可以只传一个参数，该参数以{key : value, key : value}的形式）
- value 配置的属性值


### 可以设置的属性如下:
- log JTMongodb使用的logger（需要实现console的相同方法）
- queryTime 启动Query相同的时间记录（启动了之后就无法取消）
- cacheClient JTMongodb使用的cache对象，尽量使用redis，或者实现redis相同方法的对象
- mongodb 添加新的mongodb配置信息
- timeOut 设置timeOut时间，0为无timeOut
- limit 设置任务并发限定数量
- valiate 设置是否根据schema校验数据（除了要设置该参数，还要添加相应的schema）

```js
var jtMongodb = require('jtmongodb');
jtMongodb.set({
  queryTime : true,
  valiate : true,
  limit : 100,
  timeOut : 0
});
jtMongodb.set('mongodb', [{
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
  }]
);
testClient = jtMongodb.getClient('test');
itemsClient = jtMongodb.getClient('test', 'items');
testClient.find('items', {}, {limit : 2}, 'title score', function(err, docs){
  console.dir(docs.length);
});
itemsClient.find({}, {limit : 2}, 'title score', function(err, docs){
  console.dir(docs.length);
});
```

<a name="apiGetServerInfo" />
## getServerInfo 
### 返回mongodb服务器信息

###参数列表
- dbName 数据库的标识名
- cbf 回调函数

```js
var jtMongodb = require('jtmongodb');
jtMongodb.set('mongodb', [{
    dbName : 'test',
    uri : 'mongodb://127.0.0.1:10020/test'
  }]
);
jtMongodb.getServerInfo('test', function(err, info){
    console.dir(info);
});
```

<a name="apiGetClient" />
## getClient 
### 获取dbName对应的的db client对象（该对象有JTMongodb的所有方法，除'getClient createConnection set'外，且所有的方法调用时不再需要传参数dbName和collectionName）

###参数列表
- dbName 数据库的标识名
- collectionName collection的名字（可选参数，如果未选该参数，返回的client调用方法是要带上collection名字，如果参数则不用带）

```js
var jtMongodb = require('jtmongodb');
jtMongodb.set('mongodb', [{
    dbName : 'test',
    uri : 'mongodb://127.0.0.1:10020/test'
  }]
);
var client1 = jtMongodb.getClient('test');
var client2 = jtMongodb.getClient('test', 'items');
//下面三种方法查找的结果一致
jtMongodb.find('test', 'items', {}, function(err, docs){
  console.dir(docs.length);
});
client1.find('items', {}, function(err, docs){
  console.dir(docs.length);
});
client2.find({}, function(err, docs){
  console.dir(docs.length);
});
```

<a name="apiGetCollection" />
## getCollection 
### 获取collection对象（由于collection也是动态初始化，所以获取是要通过异步来完成），collection对象的方法可以参考node-mongodb-native，但是不建议直接使用collction对象。

###参数列表
- dbName 数据库的标识名
- collectionName collection的名字
- cbf 回调函数


<a name="apiFind" />
## find 
### mongodb的find方法

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- query 查询条件
- fields 查询字段（可选）
- options 查询选项（可选，参数位置可与fields互换）
- cbf 回调函数

```js
var jtMongodb = require('jtmongodb');
jtMongodb.set('mongodb', [{
    dbName : 'test',
    uri : 'mongodb://127.0.0.1:10020/test'
  }]
);
var itemsClient = jtMongodb.getClient('test', 'items');
itemsClient.find({category : '衣服'}, 'title price picUrl', {skip : 10, limit : 30}, function(err, docs){
  console.dir(docs.length);
});
```

<a name="apiFindById" />
## findById 
### mongodb的findById

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- id 查询的mongodb id
- fields 查询字段（可选）
- cbf 回调函数

<a name="apiFindOne" />
## findOne 
### mongodb的findOne方法（参数列表和用法参考find）


<a name="apiCount" />
## count 
### mongodb的count方法

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- args... 其它参数（参考mongodb的count方法）

<a name="apiSave" />
## save 
### mongodb的save方法（参数列表和用法参数count）

<a name="apiFindByIdAndUpdate" />
## findByIdAndUpdate 
### 根据id查询并更新数据（该方法把id参数转换为query，将updateDate转换为$set的内容，再调用update方法）

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- id mongodb id
- updateData 需要更新的数据
- args... 不定长参数

<a name="apiUpdate" />
## update 
### 根据查询条件，更新数据

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- query 查询条件
- updateData 更新的数据
- options 更新操作的选项（可选）
- cbf 回调函数

<a name="apiInsert" />
## insert 
### 插入多条记录

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- docs 要插入的多条记录
- args... 不定长参数

<a name="apiAddSchema" />
## addSchema 
### 添加schema（用于校验保存的数据是否正确，若未对collection添加schema，则不用校验）

###参数列表
- dbName 数据库的标识名
- collectionName collection的名称
- schema schema对象


<a name="apiConvertFileds" />
## convertFileds 
### 将fields转换，将'title name'转换为mongodb的{title : true, name : true}的形式

###参数列表
- fields 查询结果返回的字段（字符串以空格分隔）


##其它的方法的调用参考node-mongodb-native




