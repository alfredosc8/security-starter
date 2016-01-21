'use strict';

var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');
var expressProxy = require('express-http-proxy');
var historyApiFallback = require('connect-history-api-fallback');
var RedisStore = require('connect-redis')(session);
var url = require('url');

app.use(express.static(path.join(__dirname, '../www')));

var sessionOptions = {
	secret: 'njk2389adsf98yr23hre98',
	name: 'security-starter-cookie',
	resave: true,
	saveUninitialized: false
};

if (process.env.VCAP_SERVICES) {  // use redis when running in cloud
	var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
	var vcapRedis = (vcapServices['redis-1'] || vcapServices['p-redis'])[0];
	// console.log('VCAP Redis:' + JSON.stringify(vcapRedis));
	sessionOptions.store = new RedisStore({
		host: vcapRedis.credentials.host,
		port: vcapRedis.credentials.port,
		pass: vcapRedis.credentials.password,
		ttl: 1200 // seconds = 20 min
	});
}

app.use(session({
	secret: 'localsecret',
	name: 'security-starter-cookie',
	resave: true,
	proxy: true,
	saveUninitialized: false
}));

app.use('/uaalogin', function storeUrlInSession(req, res, next) {
    var data = '';
    req.on('data', function(chunk) {
      data += chunk;
    });
    req.on('end', function() {
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
    });
	next();
});

app.use('/api', function(req, res, next) {
	if (!req.session.uaaUrl) {
		res.status(500).send({"error": "No UAA URL in session. Please login again."});
	} else {
		next();
	}
});

function getUaaUrlFromSession(req) {
	console.log('UAA URL from session: ' + req.session.uaaUrl);
	return req.session.uaaUrl;
}

// using express-http-proxy, we can pass in a function to get the target URL for dynamic proxying:
app.use('/api', expressProxy(getUaaUrlFromSession, {
		https: true,
		forwardPath: function (req) {
			//   console.log("Forwarding request: " + req.originalUrl);
			  var forwardPath = url.parse(req.url).path;
			//   console.log("forwardPath returns; " + forwardPath);
			  return forwardPath;
		}
	}
));

app.use('/uaalogin', expressProxy(getUaaUrlFromSession, {
	https: true,
	forwardPath: function () {
		return '/oauth/token';
	}
}
));

app.use('/proxy-api', expressProxy(function(req) {
	var apiUrl = req.get('x-endpoint');
	if (apiUrl) {
		apiUrl = url.parse(apiUrl).hostname;
	}
	console.log('endpoint from headers: ' + apiUrl);
	return apiUrl;
}, {
	https: true,
	forwardPath: function (req) {
		// console.log("Forwarding request: " + req.originalUrl);
		var forwardPath = url.parse(req.url).path;
		// console.log('forwardPath: ' + forwardPath);
		return forwardPath;
	}
}));

// app.use('/nosession', function(req, res) {
// 	res.status(500).send({"error": "No UAA URL found in session.  Please log in."});
// });

app.use(historyApiFallback());
app.listen(process.env.VCAP_APP_PORT || 5000);

module.exports = app;
