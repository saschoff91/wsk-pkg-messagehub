/**
 * Demo whisk action to delete a topic on message hub
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
	
	var uri = 'https://'+restHost+':'+restPort+'/admin/topics/'+topic;

	var req = request({
		method: 'DELETE',
		uri: uri,
		headers: { 'X-Auth-Token': apiKey, 
			'Content-Type': 'application/json' }
	});
	
	req.on('error', function(e) {
		console.log(e);
		whisk.error(e);
	});
	
	req.on('response', function(response) {
		console.log('response http code ' , response.statusCode);
		if (response.statusCode == 202) {
			return whisk.done({result: "Delete Topic "+topic+ " done "});
		}
		else {
			//console.log('response code ' , response.statusCode);
			return whisk.error("Delete Topic "+topic+ " failed ");
		}
	});
	
	req.end();
	
	return whisk.async();
}
