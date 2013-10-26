/*jslint node: true */
/*globals suite, test, setup, suiteSetup, suiteTeardown, done, teardown */
'use strict';

/*
 * Tests for the base geographic features API.
 */

var server = require('./lib/router');
var util = require('util');
var request = require('request');
var should = require('should');
var async = require('async');

var settings = require('../settings.js');

var BASEURL = 'http://localhost:' + settings.port + '/api';

// GETs a url relative to BASEURL, asserts that there is no error, asserts a
// 200 status and a JSON response, and passes along the parsed JSON data.
// done is called with done(error, parsed) for consistency.
function getJSON(url, done) {
  request({
    url: BASEURL + url
  }, function (error, response, body) {
    should.not.exist(error);
    response.statusCode.should.equal(200);
    response.should.be.json;
    done(error, JSON.parse(body));
  });
}

// Confirm that an item is a GeoJSON MultiPolygon geometry
function shouldBeMultiPolygon(item) {
  item.should.have.property('type');
  item.type.should.equal('MultiPolygon');
  item.should.have.property('coordinates');
  item.coordinates.should.be.an.instanceOf(Array);
  var i;
  for (i = 0; i < item.coordinates.length; i += 1) {
    item.coordinates[i].should.be.an.instanceOf(Array);
  }
}

// Confirm that an item is a GeoJSON Polygon geometry
function shouldBePolygon(item) {
  item.should.have.property('type');
  item.type.should.equal('Polygon');
  item.should.have.property('coordinates');
  item.coordinates.should.be.an.instanceOf(Array);
  var i;
  for (i = 0; i < item.coordinates.length; i += 1) {
    item.coordinates[i].should.be.an.instanceOf(Array);
  }
}

// Confirm that an item is a GeoJSON Point geometry
function shouldBePoint(item) {
  item.should.have.property('type');
  item.type.should.equal('Point');
  item.should.have.property('coordinates');
  item.coordinates.should.be.an.instanceOf(Array);
  var i;
  for (i = 0; i < item.coordinates.length; i += 1) {
    item.coordinates[i].should.be.a.Number;
  }
}

// Confirm that an item is a GeoJSON Feature object
function shouldBeFeature(item) {
  item.should.have.property('type');
  item.type.should.equal('Feature');
  item.should.have.property('geometry');
  item.should.have.property('properties');
}

// Confirm that an item is a GeoJSON FeatureCollection object
function shouldBeFeatureCollection(item) {
  item.should.have.property('type');
  item.type.should.equal('FeatureCollection');
  item.should.have.property('features');
  item.features.should.be.an.instanceOf(Array);
  item.features.forEach(shouldBeFeature);
}

// Confirm that the feature has the standard properties
function checkStandardProperties(feature) {
  feature.properties.should.have.property('source');
  feature.properties.should.have.property('type');
  feature.properties.should.have.property('shortName');
  feature.properties.should.have.property('longName');
  feature.properties.should.have.property('info');
}

function checkParcels(data) {
  shouldBeFeatureCollection(data);

  data.features.forEach(function (feature) {
    // Parcel ID
    feature.should.have.property('id');

    // Properties
    checkStandardProperties(feature);

    // Geometry type
    feature.geometry.type.should.match(/^(MultiPolygon|Polygon)$/);
    if (feature.geometry.type === 'MultiPolygon') {
      shouldBeMultiPolygon(feature.geometry);
    } else if (feature.geometry.type === 'Polygon') {
      shouldBePolygon(feature.geometry);
    }
  });
}

function checkPoints(data) {
  shouldBeFeatureCollection(data);

  data.features.forEach(function (feature) {
    // Parcel ID
    feature.should.have.property('id');
    // Properties
    checkStandardProperties(feature);
    // Geometry type
    shouldBePoint(feature.geometry);
  });
}

suite('Features', function () {
  suiteSetup(function (done) {
    server.run(done);
  });

  suiteTeardown(function () {
    server.stop();
  });

  test('Get type=parcels inside a bounding box', function (done) {
    // lower-left longitude, lower-left latitude,
    // upper-right longitude, upper-right latitude
    getJSON('/features?type=parcels&bbox=-83.0805,42.336,-83.08,42.34', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.be.above(40);
      parsed.features.forEach(function (feature) {
        feature.properties.type.should.equal('parcels');
      });

      done();
    });
  });

  test('Get type=lighting inside a bounding box', function (done) {
    // lower-left longitude, lower-left latitude,
    // upper-right longitude, upper-right latitude
    getJSON('/features?type=lighting&bbox=-83.0805,42.336,-83.08,42.34', function (error, parsed) {
      checkPoints(parsed);
      parsed.features.length.should.be.above(5);
      parsed.features.forEach(function (feature) {
        feature.properties.type.should.equal('lighting');
      });

      done();
    });
  });

  test('Get source=detroit-parcels features inside a bounding box', function (done) {
    // lower-left longitude, lower-left latitude,
    // upper-right longitude, upper-right latitude
    getJSON('/features?source=detroit-parcels&bbox=-83.0805,42.336,-83.08,42.34', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.be.above(40);
      parsed.features.forEach(function (feature) {
        feature.properties.type.should.equal('parcels');
        feature.properties.source.should.equal('detroit-parcels');
      });

      done();
    });
  });

  test('Get source=detroit-streetlights points inside a bounding box', function (done) {
    // lower-left longitude, lower-left latitude,
    // upper-right longitude, upper-right latitude
    getJSON('/features?source=detroit-streetlights&bbox=-83.0805,42.336,-83.08,42.34', function (error, parsed) {
      checkPoints(parsed);
      parsed.features.length.should.be.above(5);
      parsed.features.forEach(function (feature) {
        feature.properties.type.should.equal('lighting');
        feature.properties.source.should.equal('detroit-streetlights');
      });

      done();
    });
  });

  test('Do not allow unbounded feature queries', function (done) {
    // We should get "413 Request Entity Too Large" if we don't specify a
    // bounding box.
    async.parallel([
      function (next) {
        request({url: BASEURL + '/features?type=parcels'}, function (error, response, body) {
          should.not.exist(error);
          response.statusCode.should.equal(413);

          next();
        });
      }, function (next) {
        request({url: BASEURL + '/features?source=detroit-streetlights'}, function (error, response, body) {
          should.not.exist(error);
          response.statusCode.should.equal(413);

          next();
        });
      }
    ], done);
  });

  test('Get parcels at a point', function (done) {
    getJSON('/features?type=parcels&lon=-83.08076&lat=42.338', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.be.above(0);

      done();
    });
  });

  test('Do not allow bounding box with lat-lon query', function (done) {
      request({
        url: BASEURL + '/features?type=parcels&bbox=-83.0805,42.336,-83.08,42.34&lon=-83.08076&lat=42.338'
      }, function (error, response, body) {
        should.not.exist(error);
        // We should get "400 Bad Request" if we specify both a bounding box
        // and a point.
        response.statusCode.should.equal(400);

        done();
      });
  });

  test('Get parcels at a point query with no results', function (done) {
    // lon=105.436096, lat=-6.152738 is in the water, in Indonesia, so we
    // should not find any parcels.
    getJSON('/features?type=parcels&lon=105.436096&lat=-6.152738', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.equal(0);

      done();
    });
  });

  test('Bounding box query with no results', function (done) {
    // bounding box 105.43,-6.154,105.44,-6.144 is in the water, in
    // Indonesia, so we should not find any parcels.
    getJSON('/features?type=parcels&bbox=105.43,-6.154,105.44,-6.144', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.equal(0);

      done();
    });
  });

  test('ETag and 304 response', function (done) {
    // bounding box -122.431640625,37.77288579232438,-122.42889404296875,37.77505678240507
    // is in San Francisco, so we should find parcels, and the second request
    // should receive a status code 304 response
    var url = BASEURL + '/features?type=parcels&bbox=-83.0805,42.336,-83.08,42.34';
    request({
      url: url
    }, function (error, response, body) {
      should.not.exist(error);
      response.statusCode.should.equal(200);
      response.should.be.json;

      var etag = response.headers.etag;
      request({
        url: url,
        headers: {
          'If-None-Match': etag
        }
      }, function (error, response, body) {
        should.not.exist(error);
        response.statusCode.should.equal(304);
        response.headers.etag.should.equal(etag);

        done();
      });
    });
  });

  test('Explicitly specify .geojson format', function (done) {
    getJSON('/features.geojson?type=parcels&bbox=-83.0805,42.336,-83.08,42.34', function (error, parsed) {
      checkParcels(parsed);
      parsed.features.length.should.be.above(40);

      done();
    });
  });
});