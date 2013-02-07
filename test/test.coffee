_ = require 'underscore'
async = require 'async'
Collection = require('mongodb').Collection
assert = require 'assert'
jtMongodb = require '../index'
jtMongodb.set {
  mongodb : {
    dbName : 'test'
    uri : 'mongodb://localhost:10020/test'
  }
}
collectionName = 'GameScore'
gameScoreClient = jtMongodb.getClient 'test', collectionName
gameScoreId = '50f6277012b9b00e04000002'

describe 'jtMongodb', () ->
  describe '#check functions', () ->
    unwrapFunctions = 'getClient set'.split ' '
    _.each 'addSchema convertFileds count dropIndex ensureIndex indexExists indexInformation find findById findOne findByIdAndUpdate getClient getCollection getConstructor getServerInfo insert isCapped save set stats update distinct findAndModify findAndRemove reIndex mapReduce group options geoNear geoHaystackSearch indexes aggregate'.split(' '), (func) ->
      describe "\##{func}", () ->
        it 'it should be a function', () ->
          assert.equal true, _.isFunction jtMongodb[func]
          if !~_.indexOf unwrapFunctions, func
            assert.equal true, _.isFunction gameScoreClient[func]
  describe '#convertFileds()', () ->
    it 'it should return a object', () ->
      fields = jtMongodb.convertFileds 'title price picUrl'
      fieldsStr = JSON.stringify {
        title : true
        price : true
        picUrl : true
      }
      assert.equal fieldsStr, JSON.stringify fields
  describe '#count()', () ->
    it 'it should return a total by callback', (done) ->
      gameScoreClient.count {}, (err, total) ->
        if err
          done err
        else if !_.isNumber total
          done new Error 'the total is not a number'
        else
          done()
  describe '#ensureIndex(), #indexExists(), #indexInformation(), #dropIndex(), #indexes()', () ->
    it 'test ensureIndex, indexExists, indexInformation, dropIndex, indexes', (done) ->
      ensureIndex = (cbf) ->
        gameScoreClient.ensureIndex 'playerName', cbf
      indexExists = (cbf) ->
        gameScoreClient.indexExists 'playerName_1', (err, exists) ->
          if err
            cbf err
          else if !exists
            cbf new Error 'ensureIndex is fail'
          else
            cbf()
      indexInformation = (cbf) ->
        gameScoreClient.indexInformation cbf
      dropIndex = (cbf) ->
        gameScoreClient.dropIndex 'playerName_1', cbf
      checkedDropSuccess = (cbf) ->
        gameScoreClient.indexExists 'playerName_1', (err, exists) ->
          if err
            cbf err
          else if exists
            cbf new Error 'dropIndex is fail'
          else
            cbf()
      indexes = (cbf) ->
        gameScoreClient.indexes cbf
      async.series [
        ensureIndex
        indexExists
        indexInformation
        dropIndex
        checkedDropSuccess
        indexes
      ], done
    describe '#find(), #findById(), #findOne()', () ->
      it 'test find, findOne', (done) ->
        find = (cbf) ->
          gameScoreClient.find {}, (err, docs) ->
            if err
              cbf err
            else if !_.isArray docs
              cbf new Error 'the find result is not a array'
            else
              cbf null, docs
        findById = (cbf) ->
          gameScoreClient.findById gameScoreId, cbf
        findOne = (cbf) ->
          gameScoreClient.findOne {}, (err, doc) ->
            if err
              cbf err
            else if !doc
              cbf new Error 'the doc is null'
            else
              cbf null, doc
        async.series [
          find
          findById
          findOne
        ], done

    describe '#findByIdAndUpdate()', () ->
      it 'test findByIdAndUpdate', (done) ->
        score = _.random 1000, 5000
        findByIdAndUpdate = (cbf) ->
          gameScoreClient.findByIdAndUpdate gameScoreId, {
            score : score
          }, cbf
        checkUpdateSuccess = (cbf) ->
          gameScoreClient.findById gameScoreId, (err, doc) ->
            if err
              cbf err
            else if !doc
              cbf new Error 'the doc is null'
            else if doc.score == score
              cbf()
        async.series [
          findByIdAndUpdate
          checkUpdateSuccess
        ], done

    describe '#getCollection()', () ->
      it 'test getCollection', (done) ->
        gameScoreClient.getCollection collectionName, (err, collectionObj) ->
          if err
            done err
          else
            assert.equal true, collectionObj instanceof Collection
            done()

    describe '#getConstructor()', () ->
      it 'test getConstructor', () ->
        JTMongodb = gameScoreClient.getConstructor()
        assert.equal true, jtMongodb instanceof JTMongodb

    describe '#getServerInfo()', () ->
      it 'test getServerInfo', (done) ->
        gameScoreClient.getServerInfo done

    describe '#insert(), #save()', () ->
      it 'test insert, save', (done) ->
        insertData = [
          {
            score : 1800
            playerName : 'mytest'
          }
          {
            score : 1900
            playerName : 'myvalue'
          }
        ]
        insert = (cbf) ->
          gameScoreClient.insert insertData, (err, docs) ->
            if err
              cbf err
            else
              if insertData.length != docs.length
                cbf new Error 'total of result is not equal insert data'
              else
                cbf null, docs
        save = (cbf) ->
          gameScoreClient.save {score : 1234, playerName : 'mynick'}, cbf
        async.series [
          insert
          save
        ], done

    describe '#distinct()', () ->
      it 'test distinct', (done) ->
        distinct = (cbf) ->
          gameScoreClient.distinct 'score', (err, docs) ->
            if err
              cbf err
            else if !_.isArray docs
              cbf new Error 'the result is not a array'
            else
              cbf null, docs
        async.series [
          distinct
        ], done

    describe '#findAndModify(), #findAndRemove()', () ->
      it 'test findAndModify, findAndRemove', (done) ->
        findAndModify = (cbf) ->
          gameScoreClient.findAndModify {score : 1900}, [['score', 1]], {score : 2900}, {'new' : true, upsert : true, w : 1}, (err, doc) ->
            if err
              cbf err
            else if doc.score != 2900
              cbf new Error 'findAndModify is fail'
            else
              cbf()
        findAndRemove = (cbf) ->
          gameScoreClient.findAndRemove {score : 1900}, [['score', 1]], cbf
        async.series [
          findAndModify
        ], done

    describe '#reIndex(), #mapReduce() ', () ->
      it 'test reIndex mapReduce group', () ->
        assert.equal true, _.isFunction gameScoreClient.reIndex
        assert.equal true, _.isFunction gameScoreClient.mapReduce
