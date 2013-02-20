/*jslint node: true */
'use strict';

var bcrypt = require('bcrypt');
var express = require('express');
var http = require('http');
var mongo = require('mongodb');

var settings = require('./settings.js');
var templates = require('./templates/templates.js');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

module.exports = {};

function setup(app, db, idgen, collectionName) {

  // Database ..................................................................
  function getCollection(cb) {
    return db.collection(collectionName, cb);
  }

  var User = {};

  /**
   * Sanitize user input to save to the database
   * Keeps only the fields we wants
   * Hashes the password
   * @param  {Object} user
   * @return {Object}      A safe user object
   */
  User.sanitizeToSave = function(user) {
    var safeUser = {};
    safeUser.email = user.email;
    safeUser.name = user.name;

    if(user._id) {
      safeUser._id = user._id;
    }

    if(user.hash) {
      safeUser.hash = user.hash;
    }

    if(user.password) {
      safeUser.hash = bcrypt.hashSync(user.password, 10);
    }

    // Used for password resets (params token and expiry)
    if(user.reset) {
      safeUser.reset = user.reset;
    }
    
    return safeUser;
  };


  /**
   * Find a given user
   * @param  {Object}   query An object, ideally with a 'email' parameter
   * @param  {Function} done  Params (error, user)
   */
  User.findOne = function(query, done) {
    getCollection(function(error, collection) {
      collection.findOne(query, function(error, user){
        if(error) {
          done(error);
        }

        if(user) {
          user.validPassword = function(password) {
            return bcrypt.compareSync(password, user.hash);
          };
        }

        // TODO: Better error handling (are we exposing internal errors?)
        // TODO: security
        done(error, user);
      });

    });
  };


  /**
   * Create a given user
   * @param  {Object}   query An object with 'username', 'name', and 'password'
                              parameters. Username must be an email.
   * @param  {Function} done  Params (error, user)
   */
  User.create = function(query, done) {
    if(!query.email || query.email === '') {
      done({
        code: 400,
        name: 'UserCreationError',
        message: 'Email required'
      }, null);
      return;
    }

    if(!query.password || query.password === '') {
      done({
        code: 400,
        name:'UserCreationError',
        message: 'Password required'
      }, null);
      return;
    }

    // We only want to save the parameters we decide on.
    var safeQuery = User.sanitizeToSave(query);

    // Blank out the query so we can't use it anymore
    query = {};

    // Get ready to save the user
    getCollection(function(error, collection) {
      collection.insert(safeQuery, {safe: true}, function(error, documents) {
        if(error) {
          if(error.code === 11000) {
            // Mongo duplicate key error
            done({code: 400, err: 'An account with this email aready exists'});
            return;
          }
          // Some other error
          done({code: 500, err: 'Sorry, an error occurred. Please try again.'});
          return;
        }else {
          done(null, documents[0]);
        }
      });
    });

  };


  /**
   * Update a given user
   * @param  {Object}   query A user object, with ._id property
   * @param  {Function} done  Params (error)
   */
  User.update = function(query, done) {
    if(!query.email || query.email === '') {
      done({code: 400, err: 'Email required'}, null);
      return;
    }

    // We only want to save the parameters we decide on.
    var safeQuery = User.sanitizeToSave(query);
    
    // Blank out the query so we can't use it anymore
    query = {};

    getCollection(function(error, collection) {

      collection.save(safeQuery, {w: 1}, function(error, wc, something) {
        if(error) {
          // TODO: Log
          console.log('error updating: ', error.err, error.code);
          done(error);
          return;
        }

        console.log(error);
        done(null);
      });
    });
  };

  // Export the user functions for easy testing
  module.exports.User = User;

  // Some helpers we need to use
  app.use(express.cookieParser());
  app.use(express.session({ secret: settings.secret }));

  // Initialize Passport. Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.
  passport.serializeUser(function(user, done) {
    console.log('Serializing');

    // We don't want to be passing around sensitive stuff like password hashes
    var safeUser = {};
    safeUser.name = user.name;
    safeUser.email = user.email;
    safeUser._id = user._id;

    return done(null, safeUser);
  });

  passport.deserializeUser(function(user, done) {
    console.log('Deserializing');

    // We don't want to be passing around sensitive stuff
    // Like password hashes
    var safeUser = {};
    safeUser.name = user.name;
    safeUser.email = user.email;
    safeUser._id = user._id;

    return done(null, safeUser);
  });

  // Use the local authentication strategy in Passport.
  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(username, password, done) {
      User.findOne({ email: username }, function(error, user) {
        if (error) { return done(error); }
        if(!user) {
          console.log('Login: user not found');
          return done(null, false, {
            'name': 'BadRequestError',
            'message': 'Account not found'
          });
        }
        if(!user.validPassword(password)) {
          console.log('Login: password incorrect');
          return done(null, false, {
            'name': 'BadRequestError',
            'message': 'Password incorrect'
          });
        }

        return done(null, user);
      });
    }
  ));


  // User routes ..............................................................
  
  /**
   * GET /auth/return
   * Save the current redirectTo paramter to the session.
   * Used when redirecting to the login page
   */
  app.get('/auth/return', function(req, res){
    req.session.redirectTo = req.query.redirectTo;
    res.redirect('/login');
  });

  // GET /logout
  //  Does what you think it does.
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  // POST  /api/login
  // Log the user in
  app.post('/api/login', function(req, response, next) {
    passport.authenticate(
      'local',
      function(error, user, info) {

        // If there's an error, send back a generic error.
        // Note that errors are not things like 'incorrect password'
        if(error) {
          return next(error);
        }

        // If we've got a user, create a session
        if(user) {
          req.logIn(user, function(error) {
            if (error) { return next(error); }
            response.redirect('/api/user');
          });
          return;
        }

        // If there was a problem logging the user in, it'll appear here.
        if(info) {
          console.log('Info ', info);
          response.send(400, info.message);
        }
      })(req, response, next);

  });

  /**
   * Given a token, hash it for storage / reuse
   * Broken out into a function so it can be easily overridden by tests
   * @param  {String} token
   * @return {String}       bcrypt hashed token
   */
  User.hashToken = function(token) {
    return bcrypt.hashSync(token, 10);
  };

  User.createTokenExpiry = function(token) {
    var now = new Date();
    return now.setDate(now.getDate()+1);
  };

  /**
   * POST /api/user/forgot
   * Reset a user's password
   * Or, given a valid reset token, allow the user to reset their password.
   */
  app.post('/api/user/forgot', function(req, response, next){
    var email = req.body.user.email;
    if(email === undefined) {
      response.send({ type: 'PasswordResetError', message: 'Email required' }, 400);
      return;
    }

    // Find the user
    User.findOne({ email: email }, function(error, user) {
      if (error) {
        // TODO: Log
        return next(error);
      }
      if(!user) {
        // TODO: Log
        response.send({ type: 'PasswordResetError', message: 'Account not found' }, 400);
        return;
      }

      // Generate a new token
      // & set an expiration date
      var token = idgen();
      var expiry = User.createTokenExpiry();
      
      // We store the token hashed, since it's a password equivalent.
      var tokenHash = User.hashToken(token);

      // Save it to the user
      user.reset = {
        token: tokenHash,
        expiry: expiry
      };
      console.log("About to update user", user);
      User.update(user, function(error, user){
        if(error) {
          // TODO: Log
          console.log("Error saving user", error);
          return next(error);
        }

        // Generate the email
        console.log(req.headers.host);
        var host = req.headers.host;
        var resetText = templates.render('email.passwordReset', {
          'link': host + '/reset/' + token
        });
        console.log(resetEmail);
        var message = {
          // sender info
          from: 'LocalData <support@localdata.com>',
          
          // Comma separated list of recipients
          to: '"Receiver Name" <receiver@example.com>',
          
          // Subject of the message
          subject: 'Nodemailer is unicode friendly ✔', //

          // plaintext body
          text: 'Hello to myself!'
        };

        // Send the token via email
        
  
        // Tell the client we've succeeded.
        response.send(200);
      });
    });
  });

  /**
   * POST /api/user/reset
   * Reset a user's password
   * Requires a valid email (tied to a user), password, and auth token
   */
  app.post('/api/user/reset', function(req, response, next){
    // Get the parameters
    var token = req.body.reset.token;
    var password = req.body.reset.password;

    if(!token) {
      response.send({ type: 'PasswordResetError', message: 'Password reset code required' }, 400);
      return;
    }
    if(!password) {
      response.send({ type: 'PasswordResetError', message: 'Password required' }, 400);
      return;
    }

    // We store the token hashed, since it's a password equivalent.
    var tokenHash = User.hashToken(token);

    // Find the user based on the token
    var user = User.findOne({'reset.token': tokenHash}, function(error, user){
      if(error) {
        return next(error);
      }
      if(user === null) {
        console.log('User not found');
        response.send('User not found', 400);
        return;
      }

      console.log("Found user", user);
      // Check that the user has a reset object
      if (user.reset === undefined) {
        response.send({ type: 'PasswordResetError', message: 'Email required' }, 400);
        return;
      }

      // Check that the token hasn't expired.
      var now = new Date().getTime();
      var expiry = new Date(user.reset.expiry);
      console.log("Expiry", expiry);
      if(expiry.getTime() < now) {
        console.log('Token expired');
        response.send('Token expired', 400);
        return;
      }

      // Change their password
      user.password = password;
      // Invalidate the reset token
      delete user.reset;

      User.update(user, function(error) {
        if(error) {
          return next(error);
        }

        // Log in the user
        req.logIn(user, function(error) {
          if (error) {
            // TODO:
            // Log
            console.log('Unexpected error', error);
            response.send(401);
          }
          response.redirect('/api/user');
          return;
        });
      });
    });
  });


  // POST /api/user
  // Create a user
  app.post('/api/user', function(req, response){
    User.create(req.body, function(error, results) {
      if(error) {
        // TODO
        // Log better
        response.send(error.code, "We're sorry, an error has occurred");
      }else {
        req.logIn(results, function(error) {
          if (error) {
            // TODO
            // Log beter
            console.log('Unexpected error', error);
            response.send(401);
          }

          var safeUser = {};
          safeUser.name = req.user.name;
          safeUser.email = req.user.email;
          safeUser._id = req.user._id;

          // If successful, give the data of the newly logged in user
          response.json(safeUser);
        });
      }
    });

  });

  // GET /api/user
  //  Return details about the current user
  //  Return a 401 if there isn't a current user
  app.get('/api/user', function(req, response){
    if(req.isAuthenticated()) {
      response.send(req.user);
    }else {
      response.send(401);
    }
  });

}


// Utility / middleware ........................................................

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.
//   Otherwise, the user will be sent a 401.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.send(401);
}

module.exports = {
  setup: setup,
  ensureAuthenticated: ensureAuthenticated
};
