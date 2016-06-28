/**
 * Whisk action to get all topics
 */

var https = require('https');

function main(msg) {

	// suppress errors from unimplemented certificates
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	// get parameters from package binding for message hub instance
	var restHost = msg.resturl;
	var restPort = msg.restport;
	var apiKey = msg.apikey;


	var options = {
			host: restHost,
			port: restPort,
			path: '/admin/topics',
			method: 'GET',
			headers: { 'X-Auth-Token': apiKey,
				'Content-Type': 'application/json' }
	};

	var req = https.request(options, function(res) {
		console.log('Sent request for topics and received back status code: ' + res.statusCode);
		var responseData = '';

		res.on('data', function(data) {
			responseData += data;
		});

		res.on('end', function () {
			if (res.statusCode == 200) {
				console.log('response data is ' , responseData);
				
				var receivedMessages = JSON.parse(responseData);
				
				return whisk.done({topcis: receivedMessages});
			}
			else {
				return whisk.error("Error while getting topic list");
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

