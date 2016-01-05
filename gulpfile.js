/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
// var browserSync = require('browser-sync');
var fs = require('fs');
var historyApiFallback = require('connect-history-api-fallback');
// var proxy = require('http-proxy-middleware');
// var HttpsProxyAgent = require('https-proxy-agent');
var secureApp = require('./server/security-app.js');

// Serve files from dist directory.
gulp.task('default', function () {
  // var corporateProxyServer = process.env.http_proxy || process.env.HTTP_PROXY;
  // console.log("corporateProxyServer: " + corporateProxyServer);
  var uaaConfig = JSON.parse(fs.readFileSync('./dist/uaaConfig.json', 'utf-8'));
  console.log('UAA URL from config file: ' + uaaConfig.url);
  // var proxyOptions = {
  //   target: uaaConfig.url,
  //   changeOrigin: true,
  //   logLevel: 'debug',
  //   pathRewrite: { '^/api/': '/'}
  //   // onProxyReq: function onProxyReq(proxyReq, req, res) {
  //   //   console.log('UAA URL from form: ' + secureApp.uaaUrl);
  //   // }
  // };
  //
  // if (corporateProxyServer) {
  //   proxyOptions.agent = new HttpsProxyAgent(corporateProxyServer);
  // }
  // browserSync({
  //   port: 5000,
  //   notify: false,
  //   logPrefix: 'PSK',
  //   server: {
  //     baseDir: ['dist'],
  //     middleware: [ proxy('/api', proxyOptions), proxy('/github', githubProxyOptions), historyApiFallback() ]
  //   }
  // });

  // secureApp.use(proxy('/api', proxyOptions));
  secureApp.use(historyApiFallback());
  secureApp.listen(5000);
});
