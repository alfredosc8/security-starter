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
var HttpsProxyAgent = require('https-proxy-agent');
var helmet = require('helmet');

var sockets = {};
var corporateProxyAgent;
var sessionOptions = {
	secret: 'njk2389adsf98yr23hre98',
	name: 'security-starter-cookie',
	resave: true,
	saveUninitialized: false,
	cookie: {secure: true}
};

// Set up some options for cloud vs. local, and proxy vs. no proxy.
var corporateProxyServer = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
if (corporateProxyServer) {
		corporateProxyAgent = new HttpsProxyAgent(corporateProxyServer);
}

app.use(helmet());
app.enable('trust proxy');

app.use(function(req, res, next) {
	console.log('PAIN!!!!!!');
	console.log('request: ' + JSON.stringify(req.headers));
	console.log('referer: ' + req.get('referer'));
	var protocol = url.parse(req.get('referer') || '').protocol;
	console.log('original protocol: ' + protocol);
	if (protocol === 'https:') { // || req.session.redirected) {
		// req.session.redirected = false;
		next();
	} else {
		console.log('NOT HTTPS');
		// req.session.redirected = true;
		res.redirect('https://' + req.headers.host + req.url);
	}
	// next();
});

if (process.env.NODE_ENV === 'local') {
	app.use(express.static(path.join(__dirname, '../.tmp')));
	app.use('/bower_components', express.static(path.join(__dirname, '../bower_components')));
	app.use(express.static(path.join(__dirname, '../app')));
} else {
	app.use(express.static(path.join(__dirname, '../www')));
}

if (process.env.VCAP_SERVICES) {  // use redis when running in cloud
	var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
	var vcapRedis = (vcapServices['redis-1'] || vcapServices['p-redis'] || vcapServices['redis'])[0];
	// console.log('VCAP Redis:' + JSON.stringify(vcapRedis));
	sessionOptions.store = new RedisStore({
		host: vcapRedis.credentials.host,
		port: vcapRedis.credentials.port,
		pass: vcapRedis.credentials.password,
		ttl: 1200 // seconds = 20 min
	});
}

app.use(session(sessionOptions));

function cleanResponseHeaders (rsp, data, req, res, cb) {
	res.removeHeader('Access-Control-Allow-Origin');
	// res.removeHeader('X-Powered-By');
	res.removeHeader('www-authenticate'); // prevents browser from popping up a basic auth window.
	cb(null, data);
}

function getUaaUrlFromSession(req) {
	console.log('UAA URL from session: ' + req.session.uaaUrl);
	return req.session.uaaUrl;
}

function setProxyAgent(req) {
	if (corporateProxyAgent) {
		req.agent = corporateProxyAgent;
	}
	return req;
}

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

app.use('/logout', function logout(req, res) {
		req.session.destroy();
		res.status(200).send({"message": "Session destroyed."});
});

app.use('/api', function(req, res, next) {
	if (!req.session.uaaUrl) {
		res.status(500).send({"error": "No UAA URL in session. Please login again."});
	} else {
		next();
	}
});

// using express-http-proxy, we can pass in a function to get the target URL for dynamic proxying:
app.use('/api', expressProxy(getUaaUrlFromSession, {
		https: true,
		forwardPath: function (req) {
			//   console.log("Forwarding request: " + req.originalUrl);
			  var forwardPath = url.parse(req.url).path;
			//   console.log("forwardPath returns; " + forwardPath);
			  return forwardPath;
		},
		intercept: cleanResponseHeaders,
		decorateRequest: setProxyAgent
	}
));

app.use('/uaalogin', expressProxy(getUaaUrlFromSession, {
		https: true,
		forwardPath: function () {
			return '/oauth/token';
		},
		intercept: cleanResponseHeaders,
		decorateRequest: setProxyAgent
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
	},
	intercept: cleanResponseHeaders,
	decorateRequest: setProxyAgent
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
			res.status(500).send({"error": error + '', "url": wsUrl});
		});
		socket.on('close', function(code, message) {
			console.log('socket closed. ' + code + ' ' + message);
			// console.log('ready state: ' + socket.readyState);
		});
		socket.on('open', function() {
			// console.log('socket opened!?!?');
			// store socket in memory with an ID & expiration
			// return socket ID to browser
			var socketId = Math.random() * 10000000000000000000;
			socket.socketId = socketId;
			socket.exp = Date.now() + 1200000; // 20 min
			sockets[socketId] = socket;
			// console.log('ready state: ' + socket.readyState);
			console.log('sockets: ' + Object.keys(sockets).length);
			res.status(200).send({"socketId": socketId});
		});
	}
});

app.use('/close-ws', function(req, res) {
	// find socket in memory by ID. close & delete.
	if (req.get('x-socketid') && sockets[req.get('x-socketid')]) {
		sockets[req.get('x-socketid')].terminate();
		delete sockets[req.get('x-socketid')];
		console.log('deleted a socket. sockets remaining: ' + Object.keys(sockets).length);
	}
	res.status(200).send({"message": "Socket closed."});
});

app.use(historyApiFallback());
app.use(function logErrors(err, req, res, next) {
	console.error(err.stack);
	console.error('-- From Request: ', req.url);
	next();
});

////////// Web socket server ////////
var wsServer = new WebSocketServer({
	server: httpServer,
	verifyClient: function(info) {
		console.log('verifyClient');
		// TODO: verify hostname at least
		// console.log(JSON.stringify(info));
		return true;
	}
});

wsServer.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
    // console.log('received: %s', message);
		var tsData;
		try {
			tsData = JSON.parse(message);
		} catch (e) {
			ws.send('{"error": ' + e + '}');
			return;
		}
		if (!tsData.socketId) {
			ws.send('{"error": "missing socketId"}');
			return;
		}
		var apiSocket = sockets[tsData.socketId];
		if (!apiSocket || apiSocket.readyState !== WebSocket.OPEN) {
			ws.send('{"error": "socket to back end API has closed."}');
			delete sockets[tsData.socketId];
			return;
		}
		// pass request through to back end api:
		apiSocket.send(message);
		apiSocket.on('message', function(data) {
			// console.log('data from api: ' + data);
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});
  });

});
///////// End Web socket server /////////

httpServer.on('request', app);
httpServer.listen(process.env.VCAP_APP_PORT || 5000, function() {
	console.log('Listening on port ' + httpServer.address().port);
});

module.exports = app;
