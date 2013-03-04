/*jslint node: true, indent: 2, white: true, vars: true */
/*globals suite, test, setup, suiteSetup, suiteTeardown, done, teardown */
'use strict';

var server = require('../web.js');

var assert = require('assert');
var mongo = require('mongodb');
var request = require('request');
var should = require('should');
var util = require('util');

var settings = require('../settings-test.js');
var users = require('../users.js');
var surveys = require('../surveys.js');

var passport = require('passport');


var BASEURL = 'http://localhost:' + settings.port + '/api';

suite('Surveys', function () {

  /**
   * Remove all results from a collection
   * @param  {String}   collection Name of the collection
   * @param  {Function} done       Callback, accepts error, response
   */
  var clearCollection = function(collectionName, done) {
    var db = new mongo.Db(settings.mongo_db, new mongo.Server(settings.mongo_host,
                                                          settings.mongo_port,
                                                          {}), { w: 1, safe: true });

    db.open(function() {
      db.collection(collectionName, function(error, collection) {
        if(error) {
          console.log("BIG ERROR");
          console.log(error);
          assert(false);
          done(error);
        }

        // Remove all the things!
        collection.remove({}, function(error, response){
          done(error, response);
        });
      });

    });
  };

  var userA = {
    'name': 'User A',
    'email': 'a@localdata.com',
    'password': 'password'
  };

  var userB = {
    'name': 'User B',
    'email': 'b@localdata.com',
    'password': 'drowssap'
  };

  var data_one = {
    "surveys" : [ {
      "name": "Just a survey",
      "users": ["A", "B"],
      "paperinfo": {
        "dpi": 150,
        "regmarks": [
          {"type": 0, "bbox": [20, 20, 70, 70]},
          {"type": 0, "bbox": [20, 1580, 70, 1630]},
          {"type": 0, "bbox": [1205, 1580, 1255, 1630]}
        ],
        "barcode": {"bbox": [1055, 20, 1255, 220]}
      }
    } ]
  };

  var data_two = {
    "surveys" : [ {
      "name": "Test survey 1",
      "paperinfo": {
        "dpi": 150,
        "regmarks": [
          {"type": 0, "bbox": [20, 20, 70, 70]},
          {"type": 0, "bbox": [20, 1580, 70, 1630]},
          {"type": 0, "bbox": [1205, 1580, 1255, 1630]}
        ],
        "barcode": {"bbox": [1055, 20, 1255, 220]}
      }
    }, {
      "name": "Test survey 2",
      "users": ["2"],
      "paperinfo": {
        "dpi": 150,
        "regmarks": [
          {"type": 0, "bbox": [20, 20, 70, 70]},
          {"type": 0, "bbox": [20, 1580, 70, 1630]},
          {"type": 0, "bbox": [1205, 1580, 1255, 1630]}
        ],
        "barcode": {"bbox": [1055, 20, 1255, 220]}
      }
    } ]
  };

  var sampleSurvey = {
    "name": "Sample survey",
    "slug": "sample-survey",
    "id": "1234",
    "users": ["2"],
    "paperinfo": {
      "dpi": 150,
      "regmarks": [
        {"type": 0, "bbox": [20, 20, 70, 70]},
        {"type": 0, "bbox": [20, 1580, 70, 1630]},
        {"type": 0, "bbox": [1205, 1580, 1255, 1630]}
      ],
      "barcode": {"bbox": [1055, 20, 1255, 220]}
    }
  };

  var userAJar = request.jar();
  var userBJar = request.jar();

  var data_slug = {
    "surveys" : [ {
      "name": "Someone's cool, \"hip\" survey ~!@#$%^&*()-=_+<>?,./;: title",
      "users": ["A", "B"],
      "paperinfo": {
        "dpi": 150,
        "regmarks": [
          {"type": 0, "bbox": [20, 20, 70, 70]},
          {"type": 0, "bbox": [20, 1580, 70, 1630]},
          {"type": 0, "bbox": [1205, 1580, 1255, 1630]}
        ],
        "barcode": {"bbox": [1055, 20, 1255, 220]}
      }
    } ]
  };

  suiteSetup(function (done) {
    server.run(settings, function(){
      var url = BASEURL + '/user';
      clearCollection('usersCollection', function(error, response){
        request.post({url: url, json: userA, jar: userAJar}, function (error, response, body) {
          console.log("RETURNED USER", body, userAJar);
          userA._id = body._id;

          request.post({url: url, json: userB, jar: userBJar}, function (error, response, body) {
            userB._id = body._id;

            done();
          });
        });

        request = request.defaults({jar: userAJar});
      });
    });
  });

  suiteTeardown(function () {
    server.stop();
  });

  suite("Utilities:", function() {
    test('Filter sensitive data from a survey', function (done) {
      var filteredSurvey = surveys.filterSurvey(sampleSurvey);

      filteredSurvey.should.have.property('name');
      filteredSurvey.should.have.property('slug');
      filteredSurvey.should.have.property('id');

      filteredSurvey.should.not.have.property('users');

      done();
    });
  });

  suite('POST', function () {
    var url = BASEURL + '/surveys';

    var surveyId;

    test('Posting JSON to /surveys', function (done) {
      request.post({url: url, json: data_two}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(201);

        var i;
        for (i = 0; i < data_two.surveys.length; i += 1) {
          // Save the survey id for later tests
          surveyId = body.surveys[i]._id;

          assert.equal(data_two.surveys[i].name, body.surveys[i].name, 'Response differs from posted data');
          assert.deepEqual(data_two.surveys[i].paperinfo, body.surveys[i].paperinfo, 'Response differs from posted data');

          assert.notEqual(body.surveys[i].id, null, 'Response does not have an ID.');

          body.surveys[i].should.have.property('users');
          assert.equal(userA._id, body.surveys[i].users[0], 'Wrong or no user stored');

          // Security tests
          assert.equal(1, body.surveys[i].users.length, 'There should be only one user assigned, even though the POST had two');
          assert.notEqual(userB._id, body.surveys[i].users[0], 'Wrong user stored');

          // Slug tests
          body.surveys[i].should.have.property('slug');
          body.surveys[i].slug.should.be.a('string');
        }

        done();
      });
    });

    test('Posting a survey with funny characters', function (done) {
      request.post({ url: url, json: data_slug }, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(201);
        body.surveys.length.should.equal(1);
        var survey = body.surveys[0];
        survey.should.have.property('slug');
        survey.slug.should.be.a('string');

        // Test for unacceptable characters
        /[~`!@#$%\^&*()+;:'",<>\/?\\{}\[\]|]/.test(survey.slug).should.equal(false);

        done();
      });
    });

  });

  suite('GET', function () {
    var id;
    var surveyTwo;

    setup(function (done) {
      request.post({url: BASEURL + '/surveys', json: data_two}, function(error, response, body) {
        if (error) { done(error); }
        id = body.surveys[0].id;
        surveyTwo = body.surveys[1];
        done();
      });
    });

    test('Getting all surveys for this user', function (done) {
      request.get({url: BASEURL + '/surveys'}, function (error, response, body) {
        assert.ifError(error);
        assert.equal(response.statusCode, 200, 'Status should be 200. Status is ' + response.statusCode);

        var parsed = JSON.parse(body);

        assert.notEqual(parsed.surveys, null, 'Parsed response body should contain a property called "surveys".');
        assert.ok(util.isArray(parsed.surveys), 'Response should contain an array');
        var i;
        for (i = 0; i < parsed.surveys.length; i += 1) {
          assert.notEqual(parsed.surveys[i].id, null, 'Returned surveys should have IDs.');
          parsed.surveys[i].should.have.property('slug');
          parsed.surveys[i].slug.should.be.a('string');
        }

        done();
      });
    });

    test('Getting a survey', function (done) {
      request.get({url: BASEURL + '/surveys/' + id}, function (error, response, body) {
        assert.ifError(error);
        assert.equal(response.statusCode, 200, 'Status should be 200. Status is ' + response.statusCode);

        var parsed = JSON.parse(body);

        assert.ok(parsed.survey, 'Parsed response body should have a property called "survey".');

        assert.equal(parsed.survey.id, id, 'The returned survey should match the requested ID.');
        assert.equal(data_two.surveys[0].name, parsed.survey.name, 'Response differs from posted data');
        assert.deepEqual(data_two.surveys[0].paperinfo, parsed.survey.paperinfo, 'Response differs from posted data');

        parsed.survey.should.have.property('slug');
        parsed.survey.slug.should.be.a('string');

        done();
      });
    });

  });

  suite('PUT: ', function () {
    var url = BASEURL + '/surveys';

    var surveyId;

    test('PUT JSON to /surveys', function (done) {
      request.post({url: url, json: data_two}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(201);

        var surveyToChange = body.surveys[0];
        surveyToChange.name = 'new name';

        url = BASEURL + '/surveys/' + surveyToChange.id;
        request.put({
          url: url,
          json: {'survey': surveyToChange}
        }, function (error, response, body) {
          should.not.exist(error);
          response.statusCode.should.equal(200);

          body.survey.name.should.equal('new name');
          done();
        });
      });
    });

    test('PUT JSON to /surveys from an unauthorized user', function (done) {
      var url = BASEURL + '/surveys';

      request.post({url: url, json: data_one}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(201);

        var surveyToChange = body.surveys[0];
        surveyToChange.name = 'new name';

        // Log in as a new user and try to change the survey
        url = BASEURL + '/surveys/' + surveyToChange.id;
        request.put({
          url: url,
          json: {'survey': surveyToChange},
          jar: userBJar
        }, function (error, response, body) {
          console.log(body);
          should.not.exist(error);
          response.statusCode.should.equal(401);

          done();
        });

      });
    });

  });

  suite('DEL', function () {
    var id;

    setup(function (done) {
      request.post({url: BASEURL + '/surveys', json: data_one}, function(error, response, body) {
        if (error) { done(error); }
        id = body.surveys[0].id;
        done();
      });
    });

    // test('Deleting a survey', function (done) {
    //   request.del({url: BASEURL + '/surveys/' + id}, function (error, response, body) {
    //     assert.ifError(error);
    //     response.statusCode.should.equal(200);
// 
    //     var parsed = JSON.parse(body);
// 
    //     assert.equal(parsed.count, 1, 'We should have deleted 1 item.');
// 
    //     done();
    //   });
    // });

  });

});

