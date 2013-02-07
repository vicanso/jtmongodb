(function() {
  var Collection, assert, async, collectionName, gameScoreClient, gameScoreId, jtMongodb, _;

  _ = require('underscore');

  async = require('async');

  Collection = require('mongodb').Collection;

  assert = require('assert');

  jtMongodb = require('../index');

  jtMongodb.set({
    mongodb: {
      dbName: 'test',
      uri: 'mongodb://localhost:10020/test'
    }
  });

  collectionName = 'GameScore';

  gameScoreClient = jtMongodb.getClient('test', collectionName);

  gameScoreId = '50f6277012b9b00e04000002';

  describe('jtMongodb', function() {
    describe('#check functions', function() {
      var unwrapFunctions;
      unwrapFunctions = 'getClient set'.split(' ');
      return _.each('addSchema convertFileds count dropIndex ensureIndex indexExists indexInformation find findById findOne findByIdAndUpdate getClient getCollection getConstructor getServerInfo insert isCapped save set stats update distinct findAndModify findAndRemove reIndex mapReduce group options geoNear geoHaystackSearch indexes aggregate'.split(' '), function(func) {
        return describe("\#" + func, function() {
          return it('it should be a function', function() {
            assert.equal(true, _.isFunction(jtMongodb[func]));
            if (!~_.indexOf(unwrapFunctions, func)) {
              return assert.equal(true, _.isFunction(gameScoreClient[func]));
            }
          });
        });
      });
    });
    describe('#convertFileds()', function() {
      return it('it should return a object', function() {
        var fields, fieldsStr;
        fields = jtMongodb.convertFileds('title price picUrl');
        fieldsStr = JSON.stringify({
          title: true,
          price: true,
          picUrl: true
        });
        return assert.equal(fieldsStr, JSON.stringify(fields));
      });
    });
    describe('#count()', function() {
      return it('it should return a total by callback', function(done) {
        return gameScoreClient.count({}, function(err, total) {
          if (err) {
            return done(err);
          } else if (!_.isNumber(total)) {
            return done(new Error('the total is not a number'));
          } else {
            return done();
          }
        });
      });
    });
    return describe('#ensureIndex(), #indexExists(), #indexInformation(), #dropIndex(), #indexes()', function() {
      it('test ensureIndex, indexExists, indexInformation, dropIndex, indexes', function(done) {
        var checkedDropSuccess, dropIndex, ensureIndex, indexExists, indexInformation, indexes;
        ensureIndex = function(cbf) {
          return gameScoreClient.ensureIndex('playerName', cbf);
        };
        indexExists = function(cbf) {
          return gameScoreClient.indexExists('playerName_1', function(err, exists) {
            if (err) {
              return cbf(err);
            } else if (!exists) {
              return cbf(new Error('ensureIndex is fail'));
            } else {
              return cbf();
            }
          });
        };
        indexInformation = function(cbf) {
          return gameScoreClient.indexInformation(cbf);
        };
        dropIndex = function(cbf) {
          return gameScoreClient.dropIndex('playerName_1', cbf);
        };
        checkedDropSuccess = function(cbf) {
          return gameScoreClient.indexExists('playerName_1', function(err, exists) {
            if (err) {
              return cbf(err);
            } else if (exists) {
              return cbf(new Error('dropIndex is fail'));
            } else {
              return cbf();
            }
          });
        };
        indexes = function(cbf) {
          return gameScoreClient.indexes(cbf);
        };
        return async.series([ensureIndex, indexExists, indexInformation, dropIndex, checkedDropSuccess, indexes], done);
      });
      describe('#find(), #findById(), #findOne()', function() {
        return it('test find, findOne', function(done) {
          var find, findById, findOne;
          find = function(cbf) {
            return gameScoreClient.find({}, function(err, docs) {
              if (err) {
                return cbf(err);
              } else if (!_.isArray(docs)) {
                return cbf(new Error('the find result is not a array'));
              } else {
                return cbf(null, docs);
              }
            });
          };
          findById = function(cbf) {
            return gameScoreClient.findById(gameScoreId, cbf);
          };
          findOne = function(cbf) {
            return gameScoreClient.findOne({}, function(err, doc) {
              if (err) {
                return cbf(err);
              } else if (!doc) {
                return cbf(new Error('the doc is null'));
              } else {
                return cbf(null, doc);
              }
            });
          };
          return async.series([find, findById, findOne], done);
        });
      });
      describe('#findByIdAndUpdate()', function() {
        return it('test findByIdAndUpdate', function(done) {
          var checkUpdateSuccess, findByIdAndUpdate, score;
          score = _.random(1000, 5000);
          findByIdAndUpdate = function(cbf) {
            return gameScoreClient.findByIdAndUpdate(gameScoreId, {
              score: score
            }, cbf);
          };
          checkUpdateSuccess = function(cbf) {
            return gameScoreClient.findById(gameScoreId, function(err, doc) {
              if (err) {
                return cbf(err);
              } else if (!doc) {
                return cbf(new Error('the doc is null'));
              } else if (doc.score === score) {
                return cbf();
              }
            });
          };
          return async.series([findByIdAndUpdate, checkUpdateSuccess], done);
        });
      });
      describe('#getCollection()', function() {
        return it('test getCollection', function(done) {
          return gameScoreClient.getCollection(collectionName, function(err, collectionObj) {
            if (err) {
              return done(err);
            } else {
              assert.equal(true, collectionObj instanceof Collection);
              return done();
            }
          });
        });
      });
      describe('#getConstructor()', function() {
        return it('test getConstructor', function() {
          var JTMongodb;
          JTMongodb = gameScoreClient.getConstructor();
          return assert.equal(true, jtMongodb instanceof JTMongodb);
        });
      });
      describe('#getServerInfo()', function() {
        return it('test getServerInfo', function(done) {
          return gameScoreClient.getServerInfo(done);
        });
      });
      describe('#insert(), #save()', function() {
        return it('test insert, save', function(done) {
          var insert, insertData, save;
          insertData = [
            {
              score: 1800,
              playerName: 'mytest'
            }, {
              score: 1900,
              playerName: 'myvalue'
            }
          ];
          insert = function(cbf) {
            return gameScoreClient.insert(insertData, function(err, docs) {
              if (err) {
                return cbf(err);
              } else {
                if (insertData.length !== docs.length) {
                  return cbf(new Error('total of result is not equal insert data'));
                } else {
                  return cbf(null, docs);
                }
              }
            });
          };
          save = function(cbf) {
            return gameScoreClient.save({
              score: 1234,
              playerName: 'mynick'
            }, cbf);
          };
          return async.series([insert, save], done);
        });
      });
      describe('#distinct()', function() {
        return it('test distinct', function(done) {
          var distinct;
          distinct = function(cbf) {
            return gameScoreClient.distinct('score', function(err, docs) {
              if (err) {
                return cbf(err);
              } else if (!_.isArray(docs)) {
                return cbf(new Error('the result is not a array'));
              } else {
                return cbf(null, docs);
              }
            });
          };
          return async.series([distinct], done);
        });
      });
      describe('#findAndModify(), #findAndRemove()', function() {
        return it('test findAndModify, findAndRemove', function(done) {
          var findAndModify, findAndRemove;
          findAndModify = function(cbf) {
            return gameScoreClient.findAndModify({
              score: 1900
            }, [['score', 1]], {
              score: 2900
            }, {
              'new': true,
              upsert: true,
              w: 1
            }, function(err, doc) {
              if (err) {
                return cbf(err);
              } else if (doc.score !== 2900) {
                return cbf(new Error('findAndModify is fail'));
              } else {
                return cbf();
              }
            });
          };
          findAndRemove = function(cbf) {
            return gameScoreClient.findAndRemove({
              score: 1900
            }, [['score', 1]], cbf);
          };
          return async.series([findAndModify], done);
        });
      });
      return describe('#reIndex(), #mapReduce() ', function() {
        return it('test reIndex mapReduce group', function() {
          assert.equal(true, _.isFunction(gameScoreClient.reIndex));
          return assert.equal(true, _.isFunction(gameScoreClient.mapReduce));
        });
      });
    });
  });

}).call(this);
