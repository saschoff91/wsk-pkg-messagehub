var request = require('request');


function main(params) {
	var serviceEndpoint = 'http://messagehubapplication.mybluemix.net';
	//var requiredParams = ['apikey', 'topic', 'triggerName'];
	//var lifecycleEvent = params.lifecycleEvent;
	var triggerAction = params.triggerName.split("/");
	var whiskKey = whisk.getAuthKey().split(":");

	var lifecycleEvent = params.lifecycleEvent || 'CREATE';
	if (lifecycleEvent == 'CREATE') {
		console.log('CREATEING', params.triggerName);
		var body = {
			"topic": params.topic,
			"trigger": triggerAction[2],
			"namespace": triggerAction[1],
		    "pollingInterval": params.polling
		};

		var options = {
			method: 'POST',
			url: serviceEndpoint+'/messagehubtriggers',
			json: body,
			auth: {
				user: whiskKey[0],
				pass: whiskKey[1]
			}
		};

		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				return whisk.done({"result":"done creation"});
			} else {
				console.log('http status code:', (response || {}).statusCode);
				console.log('error:', error);
				console.log('body:', body);
				whisk.error({
					error: error
				});
			}
		});
	} else if (lifecycleEvent == 'RESUME') {
		return whisk.error({
			error: "RESUME lifecycleEvent not implemented"
		});
	} else if (lifecycleEvent == 'PAUSE') {
		return whisk.error({
			error: "PAUSE lifecycleEvent not implemented"
		});
	} else {
		console.log('DELETING ', params.triggerName);

		var options = {
			method: "DELETE",
			url: serviceEndpoint + "/messagehubtriggers/"+triggerAction[2],
			auth: {
				user: whiskKey[0],
				pass: whiskKey[1]
			},
			headers: {
				'Content-Type': 'application/json'
			}
		};

		request(options, function(error, response, body) {
			if (response.statusCode == 204) {
				return whisk.done(JSON.parse(body));
			} else {
				console.log('http status code:', (response || {}).statusCode);
				console.log('error:', error);
				console.log('body:', body);
				whisk.error({
					error: error
				});
			}
		});
	}

	return whisk.async();
}
