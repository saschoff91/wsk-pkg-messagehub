/**
 * Demo whisk action to publish a message to message hub.
 */

function main(msg) {

	console.log("PARAMS: ", msg);

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
	
	var uri = 'https://'+restHost+':'+restPort+'/admin/topics/'+topic;

	request({
		method: 'DELETE',
		uri: uri,
		headers: { 'X-Auth-Token': apiKey, 
			'Content-Type': 'application/json' },
	}, function(error, response, body) {
		if (!error && response.statusCode == 202) {
			//console.log('Create '+topic+ ' done!');
			whisk.done({result: "Deleting done"});
		} else {
			//console.log('Create '+topic+ ' failed!');
			whisk.error({error: "Error while deleting"});
		}
	});
	
	return whisk.async();
}
