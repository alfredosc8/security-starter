'use strict';

var httpServer = require('http').createServer();
var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');
var expressProxy = require('express-http-proxy');
var historyApiFallback = require('connect-history-api-fallback');
var RedisStore = require('connect-redis')(session);
var url = require('url');
var WebSocketServer = require('ws').Server;
var WebSocket = require('ws');
var sockets = {};

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

app.use(session(sessionOptions));

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

app.use('/open-ws', function(req, res) {
	var wsUrl = req.get('x-endpoint'),
	    auth = req.get('authorization'),
			zone = req.get('predix-zone-id');
	if (!auth || !zone || !wsUrl) {
		res.status(500).send({"error": "one of the required headers is missing: x-endpoint, authorization, or predix-zone-id."});
	} else {
		console.log('opening a socket to: ' + wsUrl);
		// TODO: check origin? do some security stuff.
		// open socket to wsUrl, pass in authorization & zone-id headers.
		var headers = {
			"authorization": auth,
			"predix-zone-id": zone,
			"origin": "http://www.predix.io" // some value is required here.
		};
		// console.log('headers: ' + JSON.stringify(headers));
		var socket = new WebSocket(wsUrl, {headers: headers});
		socket.on('error', function(error) {
			console.log('error opening socket: ' + error);
		});
		socket.on('open', function() {
			// console.log('socket opened!?!?');
			// store socket in memory with an ID & expiration
			// return socket ID to browser
			var socketId = Math.random() * 10000000000000000000;
			socket.socketId = socketId;
			socket.exp = Date.now() + 1200000; // 20 min
			sockets[socketId] = socket;
			console.log('sockets: ' + Object.keys(sockets).length);
			res.status(200).send({"socketId": socketId});
		});
	}
});

app.use('/close-ws', function(req, res) {
	// find socket in memory by ID. close & delete.
	delete sockets[req.get('x-socketid')];
	console.log('deleted a socket. sockets remaining: ' + Object.keys(sockets).length);
	res.status(200).send({"message": "Socket closed."});
});

app.use(historyApiFallback());
// app.listen(process.env.VCAP_APP_PORT || 5000);

////////// Web socket server ////////
var wsServer = new WebSocketServer({
	server: httpServer,
	verifyClient: function(info) {
		console.log('verifyClient');
		console.log(JSON.stringify(info));
		return true;
	}
});

wsServer.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});
///////// End Web socket server /////////

httpServer.on('request', app);
httpServer.listen(process.env.VCAP_APP_PORT || 5000, function() {
	console.log('Listening on port ' + httpServer.address().port);
});

module.exports = app;
