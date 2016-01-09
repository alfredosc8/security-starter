'use strict';

var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');
var expressProxy = require('express-http-proxy');
var historyApiFallback = require('connect-history-api-fallback');
var RedisStore = require('connect-redis')(session);

app.use(express.static(path.join(__dirname, '../www')));

var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
var vcapRedis = (vcapServices['redis-1'] || vcapServices['p-redis'])[0];
// console.log('VCAP Redis:' + JSON.stringify(vcapRedis));

app.use(session({
	store: new RedisStore({
		host: vcapRedis.credentials.host,
		port: vcapRedis.credentials.port,
		pass: vcapRedis.credentials.password,
		ttl: 1200 // seconds = 20 min
	}),
	secret: 'fiddlesticks',
	name: 'security-starter-cookie',
	resave: true,
	saveUninitialized: false
}));

app.use(function storeUrlInSession(req, res, next) {
    var contentType = req.get('Content-Type');
    // console.log(req.url);
    // console.log('content type: ' + contentType);
    if (!contentType || contentType.indexOf('application/x-www-form-urlencoded') < 0) {
        return next();
    }
    var data = '';
    // req.setEncoding('utf8');
    req.on('data', function(chunk) {
      data += chunk;
    });
    req.on('end', function() {
		// console.log('** req end');
		// console.log('storeUrlInSession - raw body: ' + data);
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
        }
    });
	next();
});

// using express-http-proxy, we can pass in a function to get the target URL for dynamic proxying:
app.use('/api', expressProxy(function(req) {
	console.log('UAA URL from session: ' + req.session.uaaUrl);
	return req.session.uaaUrl || '/error';
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

app.use(historyApiFallback());
app.listen(process.env.VCAP_APP_PORT || 5000);

module.exports = app;
