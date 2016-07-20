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

var https = require('https');

/**
 * Openwhisk action to get all topics from bluemix message hub instance
 * @param      {string}  restUrl                    (required)  MessageHub url instance
 * @param      {string}  restPort                   (required)  MessageHub port, default 443
 * @param      {string}  apikey                     (required)  MessageHub Api key
 * @return     {Object}                                         Done with the result of invocation
 **/

function main(params) {
	var requiredParams = ["restUrl", "restPort", 'apikey'];

	checkParameters(params, requiredParams, function(missingParams) {
		if (missingParams != "") {
			console.error("Missing required parameters: " + missingParams);
			return whisk.error("Missing required parameters: " + missingParams);
		} else {
			var options = {
					host: params.restUrl,
					port: params.restPort,
					path: '/admin/topics',
					method: 'GET',
					headers: { 'X-Auth-Token': params.apikey,
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

		}

	});

	return whisk.async();
}

/**
 *  A function that check whether the parameters passed are required or not
 *
 * @param      {object}    params    An object contains the parameter required
 *                                   in order to check it and generate a string
 *                                   that contains a list of missing parameters
 * @param      {Function}  callback  the callback function has the generated
 *                                   array or an empty one if the params is
 *                                   empty or nothing is missing
 */
function checkParameters(params, requiredParams, callback) {
	console.log("Checking Existence of Required Parameters");
	var missingParams = [];
	for (var i = requiredParams.length - 1; i >= 0; i--) {
		console.log(requiredParams[i]);
		if (!params.hasOwnProperty(requiredParams[i])) {
			missingParams.push(requiredParams[i]);
		}
		if (i == 0)
			return callback(missingParams);
	}
}
