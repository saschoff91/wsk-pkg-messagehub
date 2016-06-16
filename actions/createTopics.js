/**
 * Whisk action to create a topic
 * IMPORTANT: isn't working at the moment
 * create a topic with curl command and same credentials works, look at testscripts/createTopics.sh
 */
var request = require('request');
var https = require('https');

function main(msg) {

	// suppress errors from unimplemented certificates
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	// get parameters from package binding for message hub instance
	var restHost = msg.resturl;
	var restPort = msg.restport;
	var apiKey = msg.apikey;
	var topic = msg.topic;

	var form = {name:topic};
	var options = {
			host: restHost,
			port: restPort,
			path: '/admin/topics',
			method: 'POST',
			form: form,
			headers: { 'X-Auth-Token': apiKey,
				'Content-Type': 'application/json' }
	};

	var req = https.request(options, function(res) {
		//console.log('Sent request for topics and received back status code: ' + res.statusCode);
		var responseData = '';

		res.on('data', function(data) {
			responseData += data;
		});

		res.on('end', function () {
			console.log('Sent request for topics and received back status code: ' + res.statusCode);
			if (res.statusCode == 200) {
				//console.log('response data is ' , responseData);
				
				var receivedMessages = JSON.parse("okkkaay");
				
				return whisk.done({topcis: receivedMessages});
			}
		});
	});
	req.end();

	req.on('error', function(e) {
		console.log(e);
		whisk.error(e);
	});
	return whisk.async();
}

