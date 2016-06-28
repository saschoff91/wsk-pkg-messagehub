/**
 * Demo whisk action to publish a message to message hub.
 */

function main(msg) {

	//console.log("PARAMS: ", msg);

	// Need to connect over HTTPS
	var https = require('https');
	var request = require('request');

	// suppress errors from unimplemented certificates
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	var text = "Now is: " + new Date();

	// get parameters from packagge binding
	var restHost = msg.resturl;
	var restPort = msg.restport;
	var apiKey = msg.apikey;

	//get value topic from cli --param
	var topic = msg.topic;

	var input = msg.message;

	//var data = {records: [{value: JSON.stringify(input)}]};
	
	//console.log("DATA::: "+JSON.stringify(data));
	// Set our HTTPS request options
	var options = {
			uri: 'https://'+restHost+':'+restPort+'/topics/'+topic,
			//host: restHost,
			//port: restPort,
			//path: '/topics/' + topic,
			method: 'POST',
			headers: { 'X-Auth-Token': apiKey, 
				'Content-Type': 'application/vnd.kafka.binary.v1+json' },
				//body:data
	};

	// Send the HTTPS request and read back the response
	var req = request(options, function(error, response, body) {
		

		var responseData = '';
		response.on('data', function(data) {
			responseData += data;
			//console.log('Sent message and received back status code: ' + response.statusCode);
		});

		response.on('end', function () {
			console.log('Sent message and received back response: ' + responseData);
		});
	});

	console.log("Produced message content: "+JSON.stringify(input));
	
	req.write(JSON.stringify(input));
	req.end();
	
	return whisk.done({result: "Publish message done "});

	
	req.on('error', function(e) {
		console.log(e);
		return whisk.error({error: e});
	});

}
