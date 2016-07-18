/*
 * Copyright 2015-2016 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var request = require('request');

/**
 * A feed built on top of IoT RTI rules and actions to fire a trigger whenever certain conditions are met.
 * @param      {string}  triggerName      (Provided by the system)       Trigger full name i.e. /namespace/triggerName/
 * @param      {string}  apikey           (Provided by the system)       API Key of instance
 * @param      {string}  topic            (required)                     Authentication token of IoT RTI instance
 * @param      {string}  polling          (optional)                     Message Schema name
 * @param      {string}  endpoint         (optional)                     Trigger provider app url
 * @return     {Object}                                                Done with the result of invocation
 **/

function main(params) {
	var serviceEndpoint = params.endpoint || 'http://messagehubapplication.mybluemix.net';

	var triggerName = params.triggerName.split("/");

	var apikey = whisk.getAuthKey().split(":");

	var lifecycleEvent = params.lifecycleEvent || 'CREATE';
	if (lifecycleEvent == 'CREATE') {
		var requiredParams = ["triggerName", "topic" ];

		checkParameters(params, requiredParams, function(missingParams) {
			if (missingParams != "") {
				console.error("Missing required parameters: " + missingParams);
				return whisk.error("Missing required parameters: " + missingParams);
			} else {
				handleTriggerCreation(triggerName, apikey, serviceEndpoint, params.topic, params.polling);
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
	} else { //lifecycleEvent == 'DELETE'
		var requiredParams = ["triggerName"];
		checkParameters(params, requiredParams, function(missingParams) {
			if (missingParams != "") {
				console.error("Missing required parameters: " + missingParams);
				return whisk.error("Missing required parameters: " + missingParams);
			} else {
				handleTriggerDeletion(triggerName, apikey, serviceEndpoint);
			}
		});

	}

	return whisk.async();
}

/**
 *  A function that handle the trigger creation and perform request to trigger provider app
 */
function handleTriggerCreation(triggerName, apikey, serviceEndpoint, topic, polling ) {
	var body = {
			"namespace": triggerName[1],
			"trigger": triggerName[2],
			"apikey": apikey,
			"topic": topic,
			"pollingInterval": polling,

	};

	var options = {
			method: 'POST',
			url: serviceEndpoint+'/messagehubfeeds',
			json: body,
			auth: {
				user: apikey[0],
				pass: apikey[1]
			}
	};

	request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			return whisk.done({result:" trigger done creation"});
		} else {
			console.log('http status code:', (response || {}).statusCode);
			console.log('error:', error);
			console.log('body:', body);
			return whisk.error({
				error: error
			});
		}
	});
}

/**
 *  A function that handle the trigger deletion and perform request to trigger provider app
 */

function handleTriggerDeletion(triggerName, apikey, serviceEndpoint ) {
	var options = {
			method: "DELETE",
			url: serviceEndpoint + "/messagehubfeeds/"+triggerName[2],
			auth: {
				user: apikey[0],
				pass: apikey[1]
			},
			headers: {
				'Content-Type': 'application/json'
			}
	};

	request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			return whisk.done({result: "trigger deletion successful"});
		} else {
			console.log('http status code:', (response || {}).statusCode);
			console.log('error:', error);
			console.log('body:', body);
			return whisk.error({
				error: body
			});
		}
	});		
}


/**
 *  A function that check whether the parameters passed are required or not
 *
 * @param      {object}    params    An object contains the parameter required
 *                                   in order to check it and generate a sting
 *                                   that contains list of missing parameters
 * @param      {Function}  callback  the callback function has the generated
 *                                   string or an empty string if the params is
 *                                   empty
 */
function checkParameters(params, requiredParams, callback) {
	console.log("Checking Existiance of Required Parameters");
	var missingParams = [];
	for (var i = requiredParams.length - 1; i >= 0; i--) {
		if (!params.hasOwnProperty(requiredParams[i])) {
			missingParams.push(requiredParams[i]);
		}
		if (i == 0)
			return callback(missingParams);

	}
}