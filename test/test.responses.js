/*jslint node: true, indent: 2, white: true, vars: true */
/*globals suite, test, setup, suiteSetup, suiteTeardown, done, teardown */
'use strict';

var server = require('../web.js');
var assert = require('assert');
var util = require('util');
var request = require('request');
var should = require('should');

var settings = require('../settings-test.js');
var filterToRemoveResults = require('../responses.js').filterToRemoveResults;


var BASEURL = 'http://localhost:' + settings.port + '/api';

suite('Responses', function () {
  var data_one = {
    "responses": [
      {
        "source": {
          "type": "mobile",
          "collector": "Name"
        },
        "geo_info": {
          "centroid": [
            42.331136749929435,
            -83.06584382779543
          ],
          "parcel_id": "06000402."
        },
        "parcel_id": "06000402.",
        "responses": {
          "parcel_id": "06000402.",
          "use-count": "1",
          "collector": "Some Name",
          "site": "parking-lot",
          "condition-1": "demolish"
        }
      }
    ]
  };
  var dataTwo = function(){
    return {
      "responses": [
        {
          "source": { "type": "mobile", "collector": "Name" },
          "geo_info": {
            "centroid": [ 42.331136749929435, -83.06584382779543 ],
            "parcel_id": "06000402."
          },
          "parcel_id": "06000402.",
          "responses": {
            "parcel_id": "06000402.",
            "use-count": "1",
            "collector": "Some Name",
            "site": "parking-lot",
            "condition-1": "demolish"
          }
        },
        {
          "source": { "type": "mobile", "collector": "Name" },
          "geo_info": {
            "centroid": [ 42.331136749929435, -83.06584382779543 ],
            "parcel_id": "06000403."
          },
          "parcel_id": "06000403.",
          "responses": {
            "parcel_id": "06000403.",
            "use-count": "1",
            "collector": "Some Name",
            "site": "parking-lot",
            "condition-1": "demolish"
          }
        }
      ]
    };
  };

  var data_twenty = (function () {
    function makeResponse(parcelId) {
      return {
        "source": { "type": "mobile", "collector": "Name" },
        "geo_info": {
          "centroid": [ 42.331136749929435, -83.06584382779543 ],
          "parcel_id": parcelId
        },
        "parcel_id": "06000402.",
        "responses": {
          "parcel_id": parcelId,
          "use-count": "1",
          "collector": "Some Name",
          "site": "parking-lot",
          "condition-1": "demolish"
        }
      };
    }
    var data = { responses: [] };
    var parcelBase = 123456;
    var i;
    for (i = 0; i < 20; i += 1) {
      data.responses.push(makeResponse((parcelBase + i).toString()));
    }
    return data;
  }());

  suiteSetup(function (done) {
    server.run(settings, done);
  });

  suiteTeardown(function () {
    server.stop();
  });

  suite('POST', function () {
    var surveyId = '123';
    var url = BASEURL + '/surveys/' + surveyId + '/responses';
    test('Posting JSON to /surveys/' + surveyId + '/responses', function (done) {
      request.post({url: url, json: data_one}, function (error, response, body) {
        assert.ifError(error);
        assert.equal(response.statusCode, 201, 'Status should be 201. Status is ' + response.statusCode);

        var i;
        for (i = 0; i < data_one.responses.length; i += 1) {
          assert.deepEqual(data_one.responses[i].source, body.responses[i].source, 'Response differs from posted data');
          assert.deepEqual(data_one.responses[i].geo_info, body.responses[i].geo_info, 'Response differs from posted data');
          assert.deepEqual(data_one.responses[i].parcel_id, body.responses[i].parcel_id, 'Response differs from posted data');
          assert.deepEqual(data_one.responses[i].parcel_id, body.responses[i].parcel_id, 'Response differs from posted data');
          assert.deepEqual(data_one.responses[i].responses, body.responses[i].responses, 'Response differs from posted data');

          assert.notEqual(body.responses[i].id, null, 'Response does not have an ID.');
          assert.equal(body.responses[i].survey, surveyId,
                       'Response does not indicate the correct survey: ' +
                       body.responses[i].survey + ' vs ' + surveyId);
          assert.notEqual(body.responses[i].created, null, 'Response does not have a creation timestamp.');
        }

        done();
      });
    });

    test('Posting bad data /surveys/' + surveyId + '/responses', function (done) {
      request.post({url: url, json: {respnoses: {}}}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(400);
        done();
      });
    });
  });

  suite('DEL', function () {
    var surveyId = '123';
    var id;

    setup(function (done) {
      request.post({url: BASEURL + '/surveys/' + surveyId + '/responses', json: dataTwo()},
                   function (error, response, body) {
        if (error) { done(error); }
        id = body.responses[0].id;
        done();
      });
    });

    test('Deleting a response', function (done) {
      request.del({url: BASEURL + '/surveys/' + surveyId + '/responses/' + id}, function (error, response, body) {
        should.not.exist(error);
        should.exist(response);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('count').equal(1);

        done();
      });
    });

  });

  suite('GET', function () {
    var surveyId = '123';
    var id;

    suiteSetup(function (done) {
      request.post({url: BASEURL + '/surveys/' + surveyId + '/responses', json: data_twenty},
                   function (error, response, body) {
        if (error) { done(error); }
        id = body.responses[0].id;
        done();
      });
    });


    test(' all responses for a survey', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/responses'}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('responses');
        parsed.responses.length.should.be.above(1);
        var i;
        var prevTime = Number.MAX_VALUE;
        var created;
        for (i = 0; i < parsed.responses.length; i += 1) {
          parsed.responses[i].survey.should.equal(surveyId);
          created = Date.parse(parsed.responses[i].created);
          created.should.not.be.above(prevTime);
          prevTime = created;
        }
        done();
      });
    });

    test(' all responses for a survey as GeoJSON', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/responses?format=geojson'}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('type');
        parsed.features.length.should.be.above(1);
        var i;
        var prevTime = Number.MAX_VALUE;
        var created;
        for (i = 0; i < parsed.features.length; i += 1) {
          parsed.features[i].should.have.property('geometry');
          parsed.features[i].should.have.property('geometry');
          parsed.features[i].properties.survey.should.equal(surveyId);
          created = Date.parse(parsed.features[i].properties.created);
          created.should.not.be.above(prevTime);
          prevTime = created;
        }
        done();
      });
    });

    test('Filtering of results', function (done) {
      var results = dataTwo().responses;
      var sanitizedResults = filterToRemoveResults(results);
      results[0].should.not.have.property('responses');
      done();
    });


    test('Get all responses for a specific parcel', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/parcels/' + data_twenty.responses[1].parcel_id + '/responses'},
       function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('responses');
        parsed.responses.length.should.be.above(0);
        parsed.responses[0].parcel_id.should.equal(data_twenty.responses[1].parcel_id);
        parsed.responses[0].survey.should.equal(surveyId);

        var i;
        var prevTime = Number.MAX_VALUE;
        var created;
        for (i = 0; i < parsed.responses.length; i += 1) {
          parsed.responses[i].survey.should.equal(surveyId);

          created = Date.parse(parsed.responses[i].created);
          created.should.not.be.above(prevTime);
          prevTime = created;
        }

        done();
      });
    });

    test('one response', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/responses/' + id},
                  function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);

        parsed.response.id.should.equal(id);
        should.deepEqual(parsed.response.source, data_twenty.responses[0].source);
        should.deepEqual(parsed.response.geo_info, data_twenty.responses[0].geo_info);
        should.deepEqual(parsed.response.responses, data_twenty.responses[0].responses);
        parsed.response.parcel_id.should.equal(data_twenty.responses[0].parcel_id);
        parsed.response.survey.should.equal(surveyId);

        done();
      });
    });

    test('Get all responses in a bounding box', function (done) {
      var center = data_twenty.responses[0].geo_info.centroid;
      var bbox = [center[0] - 0.1, center[1] - 0.1, center[0] + 0.1, center[1] + 0.1];
      var url = BASEURL + '/surveys/' + surveyId + '/responses/in/' + bbox.join(',');
      console.log(url);
      request.get({url: url}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('responses');
        parsed.responses.length.should.be.above(0);
        var i;
        var prevTime = Number.MAX_VALUE;
        var created;
        for (i = 0; i < parsed.responses.length; i += 1) {
          parsed.responses[i].survey.should.equal(surveyId);
          parsed.responses[i].geo_info.centroid.should.have.lengthOf(2);
          parsed.responses[i].geo_info.centroid[0].should.be.above(bbox[0]);
          parsed.responses[i].geo_info.centroid[0].should.be.below(bbox[2]);
          parsed.responses[i].geo_info.centroid[1].should.be.above(bbox[1]);
          parsed.responses[i].geo_info.centroid[1].should.be.below(bbox[3]);

          created = Date.parse(parsed.responses[i].created);
          created.should.not.be.above(prevTime);
          prevTime = created;
        }
        done();
      });
    });

    test('Get a chunk of responses', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/responses?startIndex=5&count=10'}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('responses');
        // Make sure we got the number we requested.
        parsed.responses.length.should.equal(10);

        // Make sure the responses are in descending order of creation time.
        var i;
        var prevTime = Number.MAX_VALUE;
        var created;
        for (i = 0; i < parsed.responses.length; i += 1) {
          parsed.responses[i].survey.should.equal(surveyId);

          created = Date.parse(parsed.responses[i].created);
          created.should.not.be.above(prevTime);
          prevTime = created;
        }

        // Make sure we got the right range of responses.
        request.get({url: BASEURL + '/surveys/' + surveyId + '/responses'}, function (error, response, body) {
          var full = JSON.parse(body);
          full.responses[5].geo_info.parcel_id.should.equal(parsed.responses[0].geo_info.parcel_id);
          done();
        });
      });
    });

    test('Get responses in ascending creation order', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/responses?sort=asc'}, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);
        response.should.be.json;

        var parsed = JSON.parse(body);
        parsed.should.have.property('responses');

        // Make sure the responses are in ascending order of creation time.
        var i;
        var prevTime = Number.MIN_VALUE;
        var created;
        for (i = 0; i < parsed.responses.length; i += 1) {
          parsed.responses[i].survey.should.equal(surveyId);

          created = Date.parse(parsed.responses[i].created);
          created.should.not.be.below(prevTime);
          prevTime = created;
        }

        done();
      });
    });


    test('Get response data as CSV', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/csv'},
                  function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);

        response.headers.should.have.property('content-type');
        response.headers['content-type'].should.equal('text/csv');

        response.headers.should.have.property('content-disposition');
        response.headers['content-disposition'].should.equal('attachment; filename=Survey Export.csv');

        done();
      });
    });

    test('Get response data as KML', function (done) {
      request.get({url: BASEURL + '/surveys/' + surveyId + '/kml'},
                  function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(200);

        response.headers.should.have.property('content-type');
        response.headers['content-type'].should.equal('application/vnd.google-earth.kml+xml');

        response.headers.should.have.property('content-disposition');
        response.headers['content-disposition'].should.equal('attachment; filename=Survey Export.kml');

        done();
      });
    });


  });
});
