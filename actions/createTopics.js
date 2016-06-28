/**
 * Demo whisk action to publish a message to message hub.
 */

function main(msg) {
	console.log("PARAMS: ", msg);

	var request = require('request');

	// suppress errors from unimplemented certificates
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

	// get parameters from packagge binding
	var restHost = msg.resturl;
	var restPort = msg.restport;
	var apiKey = msg.apikey;

	//get value topic from cli --param
	var topic = msg.topic;

	var data = {name:topic};
	
	var uri = 'https://'+restHost+':'+restPort+'/admin/topics';

	var req= request({
		method: 'POST',
		uri: uri,
		headers: { 'X-Auth-Token': apiKey, 
			'Content-Type': 'application/json' }
	});
	req.write(JSON.stringify(data));
	
	req.on('error', function(e) {
		console.log(e);
		return whisk.error(e);
	});
	req.on('response', function(response) {
		console.log('response http code ' , response.statusCode);
		if (response.statusCode == 202) {
			return whisk.done({result: "Create Topic "+topic+ " done "});
		}
		else {
			//console.log('response code ' , response.statusCode);
			return whisk.error("Create Topic "+topic+ " failed ");
		}
	});
	
	req.end();


	
	return whisk.async();

}
