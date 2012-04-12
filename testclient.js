var request = require('request');
var fs = require('fs');

var BASEURL = 'http://localhost:3000';

var SURVEYID = '1';

function JSONpretty(data) {
  return JSON.stringify(data, null, '  ');
}
function handleError(error, response, body) {
  if (error != null) {
    console.log('Received an error: ' + error.message);
    return true;
  } else if (response.statusCode != 200) {
    console.log('Received non-200 status code: ' + response.statusCode);
    if (body != null) console.log(body);
    return true;
  }
  return false;
}

// Seed the database with forms
function seedforms() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/forms';
  var data = {
    forms: [
      { parcels: [ {parcel_id: '10', bubblesets: []} ]
      , mapping: {}
      }
    , { parcels: [ {parcel_id: '11', bubblesets: []} ]
      , mapping: {}
      }
    ]
  };
  console.log('Posting to url: ' + url);
  request.post({url: url, json: data}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error posting forms to the server: ' + error.message);
    } else {
      console.log('Posted forms to the server successfully.');
      console.log('Count: ' + body.forms.length);
      console.log('Data:');
      console.log(JSONpretty(body));
    }
  });
}

// Delete the forms for this survey
function clearforms() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/forms';
  console.log('Deleting at url: ' + url);
  request.del({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error forms : ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log('Deleted ' + body.count + ' forms successfully.');
    }
  });
}

// Add a single form
function addform() {
  var input_file = 'form_constructor.json';
  var url = BASEURL + '/surveys/' + SURVEYID + '/forms';
  data = JSON.parse(fs.readFileSync(input_file, 'utf8'));
  console.log('Posting to url: ' + url);
  request.post({url: url, json: data}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error posting forms to the server: ' + error.message);
    } else {
      console.log('Posted form to the server successfully.');
      console.log('ID: ' + body.forms[0].id);
      console.log('Data:');
      console.log(JSONpretty(body));
    }
  });
}

// Get a single form
function getform(formid) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/forms/' + formid;
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error getting form ' + formid + ': ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log(JSONpretty(body.form));
    }
  });
}

// Get all the forms
function getallforms() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/forms';
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error getting forms: ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log('Received ' + body.forms.length + ' forms:');
      console.log(JSONpretty(body.forms));
    }
  });
}

// Get forms for a certain parcel
function getformsbyparcel(pid) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/parcels/' + pid + '/forms';
  console.log('Getting forms for parcel: ' + pid);
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (handleError(error, response, body)) return;
    body = JSON.parse(body);
    console.log('Received ' + body.forms.length + ' forms:');
    console.log(JSONpretty(body.forms));
  });
}

// Get all the responses
function getallresponses() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/responses';
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error getting responses : ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log('Received ' + body.responses.length + ' responses:');
      console.log(JSONpretty(body.responses));
    }
  });
}

// Get a single response
function getresponse(responseid) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/responses/' + responseid;
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error getting response ' + responseid + ': ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log(JSONpretty(body.response));
    }
  });
}

// Get responses associated with a parcel
function getparcelresponses(parcel_id) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/parcels/' + parcel_id + '/responses';
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error getting response for parcel ' + parcel_id + ': ' + error.message);
    } else {
      body = JSON.parse(body);
      console.log(JSONpretty(body.responses));
    }
  });
}

// Seed the database with responses
function seedresponses() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/responses';
  var data = {
    responses: [
      { parcel_id: '10', responses: {'Q0': 0, 'Q1': 3}}
    , { parcel_id: '11', responses: {'Q0': 1, 'Q1': 4}}
    ]
  };
  console.log('Posting to url: ' + url);
  request.post({url: url, json: data}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error posting responses to the server: ' + error.message);
    } else if (response.statusCode != 200) {
      console.log('Received non-200 status code.');
      console.log(body);
    } else {
      console.log('Posted responses to the server successfully.');
      console.log('Count: ' + body.responses.length);
      console.log('Data:');
      console.log(JSONpretty(body));
    }
  });
}

// Add a single response to the database
function addresponse() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/responses';
  var data = {
    responses: [
      { parcel_id: '10', responses: {'Q0': 0, 'Q1': 3}}
    ]
  };
  console.log('Posting to url: ' + url);
  request.post({url: url, json: data}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error posting response to the server: ' + error.message);
    } else if (response.statusCode != 200) {
      console.log('Received non-200 status code.');
      console.log(body);
    } else {
      console.log('Posted response to the server successfully.');
      console.log('ID: ' + body.responses[0].id);
      console.log('Data:');
      console.log(JSONpretty(body));
    }
  });
}

// Clear all of the responses for the survey
function clearresponses() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/responses';
  console.log('Deleting at url: ' + url);
  request.del({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error deleting all responses: ' + error.message);
    } else if (response.statusCode != 200) {
      console.log('Received non-200 status code: ' + response.statusCode);
      console.log(body);
    } else {
      body = JSON.parse(body);
      console.log('Deleted ' + body.count + ' responses successfully.');
    }
  });
}

// Add a collector
function addcollector() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/collectors';
  console.log('Adding a collector');
  var collector = {};
  var data = {collectors: [collector]};
  request.post({url: url, json: data}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error: ' + error.message);
    } else if (response.statusCode != 200) {
      console.log('Received non-200 status code: ' + response.statusCode);
      console.log(body);
    } else {
      console.log('Successfully added a collector:');
      console.log(JSONpretty(body));
    }
  });
}

// Get a collector
function getcollector(cid) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/collectors/' + cid;
  console.log('Getting collector ' + cid);
  request.get({url: url}, function(error, response, body) {
    if (error != null) {
      console.log('Received an error: ' + error.message);
    } else if (response.statusCode != 200) {
      console.log('Received non-200 status code: ' + response.statusCode);
      console.log(body);
    } else {
      body = JSON.parse(body);
      console.log(JSONpretty(body));
    }
  });
}

// Assign work to a collector
function assignwork(cid) {
  var formsUrl = BASEURL + '/surveys/' + SURVEYID + '/forms';
  var collectorUrl = BASEURL + '/surveys/' + SURVEYID + '/collectors/' + cid;
  console.log('Getting all forms in survey');
  request.get({url: formsUrl}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    body = JSON.parse(body);
    var forms = body.forms;
    console.log('Getting collector ' + cid);
    request.get({url: collectorUrl}, function(error, response, body) {
      if (handleError(error, response, body)) return;

      var collector = JSON.parse(body).collector;
      collector.forms = forms.map(function(form) { return form.id; } );

      console.log('Updating collector with ' + collector.forms.length + ' forms.');
      request.put({url: collectorUrl, json: {collector: collector}}, function(error, response, body) {
        if (handleError(error, response, body)) return;

        console.log(body.collector);
      });
    });

  });
}

// Get all of the survey objects
function getallsurveys() {
  var url = BASEURL + '/surveys';
  console.log('Getting url: ' + url);
  request.get({url: url}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var surveys = JSON.parse(body).surveys;
    console.log('Got ' + surveys.length + ' surveys:');
    console.log(JSONpretty(surveys));
  });
}

// Get a survey object
function getsurvey(sid) {
  var url = BASEURL + '/surveys/' + sid;
  request.get({url: url}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var survey = JSON.parse(body).survey;
    console.log('Got a survey with ID ' + survey.id + ':');
    console.log(JSONpretty(survey));
  });
}

// Add a new survey object
function addsurvey() {
  var input_file = 'survey_constructor.json';
  var url = BASEURL + '/surveys';
  data = JSON.parse(fs.readFileSync(input_file, 'utf8'));
  console.log('Adding survey with data:');
  console.log(JSONpretty(data));
  request.post({url: url, json: data}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var surveys = body.surveys;
    console.log('Posted survey:');
    console.log(JSONpretty(surveys));
  });
}

// Get the data for a scanned image
// Use getscanimage to download the actual image
function getscandata(id) {
  var url = BASEURL + '/surveys/' + SURVEYID + '/scans/' + id;
  request.get({url: url}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var data = JSON.parse(body);
    console.log('Got data for scan: ' + data.id);
    console.log(JSONpretty(data));
  });
}

// Get a scanned image
// Writes the data to STDOUT, so probably you want to pipe it to a file
// This is basically curl, but for completeness we can test the functionality
// here.
function getscanimage(url) {
  request.get({url: url}).pipe(process.stdout);
}

// Get the data for all of the scanned images
function getallscandata() {
  var url = BASEURL + '/surveys/' + SURVEYID + '/scans/';
  request.get({url: url}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var data = JSON.parse(body);
    console.log('Got ' + data.scans.length + ' scans:');
    console.log(JSONpretty(data));
  });
}

var STATUS_PENDING = 'pending';
var STATUS_WORKING = 'working';
var STATUS_COMPLETE = 'complete';
// Update the scan info with a new status
function updatescanstatus(id, status) {
  switch(status) {
    case STATUS_PENDING:
    case STATUS_WORKING:
    case STATUS_COMPLETE:
    case 'intentional': // Used to confirm that the API rejects bad statuses
      console.log('Setting status of scan ' + id + ' to ' + status);
      break;
    default:
      console.log('Invalid status: ' + status);
      return;
  }
  var url = BASEURL + '/surveys/' + SURVEYID + '/scans/' + id;
  data = {scan: {status: status}};
  request.put({url: url, json: data}, function(error, response, body) {
    if (handleError(error, response, body)) return;

    var data = body;
    console.log('Updated status for scan: ' + data.id);
    console.log(JSONpretty(data));
  });
}


var cmd = process.argv[2];
switch(cmd) {
  // Forms
  case 'seedforms':
    seedforms();
    break;
  case 'clearforms':
    clearforms();
    break;
  case 'addform':
    addform();
    break;
  case 'getform':
    getform(process.argv[3]);
    break;
  case 'getallforms':
    getallforms();
    break;
  case 'getformsbyparcel':
    getformsbyparcel(process.argv[3]);
    break;
    
  // Responses
  case 'seedresponses':
    seedresponses();
    break;
  case 'clearresponses':
    clearresponses();
    break;
  case 'addresponse':
    addresponse();
    break;
  case'getresponse':
    getresponse(process.argv[3]);
    break;
  case 'getparcelresponses':
    getparcelresponses(process.argv[3]);
    break;
  case 'getallresponses':
    getallresponses();
    break;
      
  // Collectors
  case 'getcollector':
    getcollector(process.argv[3]);
    break;
  case 'addcollector':
    addcollector();
    break;
  case 'assignwork':
    assignwork(process.argv[3]);
    break;

  // Surveys
  case 'getallsurveys':
    getallsurveys();
    break;
  case 'getsurvey':
    getsurvey(process.argv[3]);
    break;
  case 'addsurvey':
    addsurvey();
    break;

  // Scans
  case 'getscandata':
    getscandata(process.argv[3]);
    break;
  case 'getscanimage':
    getscanimage(process.argv[3]);
    break;
  case 'getallscandata':
    getallscandata();
    break;
  case 'updatescanstatus':
    updatescanstatus(process.argv[3], process.argv[4]);
    break;
    
  // Default handler
  default:
    console.log('Not implemented by test client.');
    break;
}
