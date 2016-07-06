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
	console.log("Produced message content: "+input);

	console.log("Produced message content: "+input+" and sensorID" +input.sensorId);

	/*
	if (input.sensorId) {
		//if report is from sensor
		var data = {records: [{ key : null , value: "{"+input.sensorId +" / " +   input.location +" / "+ input.sensortype +" / "+ input.value + "/ " }]};
	} else {
		if (input.title) {
			// if report is from human
			var data = {records: [ {key: null, value: "{"+ input.title+" / " + input.description +" / " + input.location +" / " + input.attachment +" / " + input.author+"/ " } ]};
		} else {
			whisk.error({error: 'Unkown report input!'});
		}
	}*/
	
	var data = {records: [ { key: null, value: "{"+ input +"// }"}]};

	// Set our HTTPS request options
	var options = {
			uri: 'https://'+restHost+':'+restPort+'/topics/'+topic,

			method: 'POST',
			headers: { 'X-Auth-Token': apiKey, 
				//'Content-Type': 'application/vnd.kafka.binary.v1+json' ,
				//'Content-Length': data.length,
				//'Accept': 'application/vnd.kafka.v1+json'
			},
			json: data
	};
	/*var req = request(options);

	req.write(JSON.stringify(data));

	/*var responseData = '';
	req.on('data', function(data) {
		responseData += data;
		console.log('Sent message and received back status code: '+ responseData);
	});*/
	/*req.on('error', function(e) {
		console.log(e);
		return whisk.error({error: e});
	});

	req.on('response', function(response) {
		console.log('Received response http code: ' + response.statusCode);
		console.log('Received response message: ' + response.statusMessage);
		return whisk.done({result: "Publish message done "});

	});

	req.end();
	 */

	request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log('Produce message successful ',response);
			return whisk.done({result: "Produce Message on Messagehub successful"});
		} else {
			console.log('Error while produce message ', response.body);
			return whisk.error({error:"Failed to produce Message on Messagehub "});
		}
	});
	return whisk.async();

}
