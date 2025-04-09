var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');
var https = require('https');

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var webhookHostname = process.env.WEBHOOK_HOSTNAME || '';
var webhookPath = process.env.WEBHOOK_PATH || '';

var token = process.env.TOKEN || 'token';
var received_updates = [];

app.get('/', function (req, res) {
  console.log(req);
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get(['/facebook', '/instagram', '/threads'], function (req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function (req, res) {
  console.log('Facebook request body:', JSON.stringify(req.body));
  console.log('Facebook request headers:', JSON.stringify(req.headers));

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    //res.sendStatus(401);
    //return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here

  const options = {
    hostname: webhookHostname,
    path: webhookPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': JSON.stringify(req.body).length
    }
  };

  console.log("Webhook host:", webhookHostname);
  console.log("Webhook path:", webhookPath);

  const reqwh = https.request(options, function (reswh) {
    console.log('Status Code:', reswh.statusCode);
    reswh.on('data', function (chunk) {
      console.log("Response BODY:", chunk);
    });
    reswh.on('end', function () {
      console.log("Response end");
    });

  }).on("error", function (err) {
    console.log("Error: ", err.message);
  });

  reqwh.write(JSON.stringify(req.body));
  reqwh.end();

  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.post('/instagram', function (req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});


app.listen();
