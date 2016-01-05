'use strict';

var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');
var expressProxy = require('express-http-proxy');

app.use(express.static(path.join(__dirname, '../dist')));

// Initializing default session store
// *** this session store in only development use redis for prod **
app.use(session({
	secret: 'predixsample',
	name: 'cookie_name',
	proxy: true,
	resave: true,
	saveUninitialized: false}));

app.use(function storeUrlInSession(req, res, next) {
    var contentType = req.get('Content-Type');
    console.log(req.url);
    console.log('content type: ' + contentType);
    if (contentType !== 'application/x-www-form-urlencoded') {
        return next();
    }
    var data = '';
    // req.setEncoding('utf8');
    req.on('data', function(chunk) {
      data += chunk;
    });
    req.on('end', function() {
		console.log('** req end');
		console.log('storeUrlInSession - raw body: ' + data);
		// May want to add a separate path for admin login, which stores URL in session??
        if (req.url.indexOf('oauth/token') >= 0 && data.indexOf('uaaUrlInput') >= 0) {
            // assume user is logging in as admin
			// don't use body-parser, because it changes the body.  We'll read the form values with plain javascript.
			var params = data.split('&');
			params.forEach(function(p) {
				var kvp = p.split('=');
				if (kvp[0] === 'uaaUrlInput' && kvp[1]) {
					var uaaHost = kvp[1].replace(encodeURIComponent('https://'), '');
					console.log('storing URL in session. ' + uaaHost);
					req.session.uaaUrl = uaaHost;
				}
			});
			// req.session.uaaUrl = 'e0a59a9c-56c2-4ff0-88e3-232330128974.predix-uaa.run.aws-usw02-pr.ice.predix.io';
        }
        // next();
    });

	next();
});

// using express-http-proxy, we can pass in a function to get the target URL for dynamic proxying:
app.use('/api', expressProxy(function(req) {
	console.log('UAA URL from session: ' + req.session.uaaUrl);
	return req.session.uaaUrl || 'no url found in session';
}, {
	https: true,
	forwardPath: function (req) {
	//   console.log("Forwarding request: " + req.originalUrl);
	  var forwardPath = require('url').parse(req.url).path;
	//   console.log("forwardPath returns; " + forwardPath);
	  return forwardPath;
	}
}
));

module.exports = app;
