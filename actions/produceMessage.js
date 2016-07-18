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
 * Openwhisk action to get all topics from bluemix message hub instance
 * @param      {string}  restUrl                    (required)  MessageHub url instance
 * @param      {string}  restPort                   (required)  MessageHub port, default 443
 * @param      {string}  apikey                     (required)  MessageHub Api key
 * @param      {string}  topic                      (required)  MessageHub topic for producing messages
 * @param      {string}  message                    (required)  Binary message content
 * @return     {Object}                                         Done with the result of invocation
 **/

function main(params) {
	var requiredParams = ["restUrl", "restPort", 'apikey', 'topic', 'message'];

	checkParameters(params, requiredParams, function(missingParams) {
		if (missingParams != "") {
			console.error("Missing required parameters: " + missingParams);
			return whisk.error("Missing required parameters: " + missingParams);
		} else {

			//Using Kafka REST API on Message Hub only supports binary embedded format
			var data = {records: [ { key: null, value: params.message }]};

			var options = {
					url: 'https://'+params.restUrl+':'+params.restPort+'/topics/'+params.topic,
					method: 'POST',
					headers: { 
						'X-Auth-Token': params.apikey
					},
					body: JSON.stringify(data)
			};


			request(options, function(err, res, body) {
				if (!err && res.statusCode === 200) {
					var parsedBody = JSON.parse(body);
					console.log("Message successfully produced")
					return whisk.done(parsedBody);

				} else {
					return whisk.error({
						statusCode: (res || {}).statusCode,
						error: err,
						body: body
					});
				}
			});
		}
	});

    /*
    * Cause of missing supported embedded json/avro format, this produces messages for master thesis demo scenario
    * Have a look at this doc https://console.ng.bluemix.net/docs/services/MessageHub/index.html#messagehub
	if (input.sensorId) {
		//if report is from sensor
		var data = {records: [{ key : null , value: "{"+input.sensorId +" / " +   input.location +" / "+ input.sensorType +" / "+ input.value + "/ " }]};
	} else {
		if (input.title) {
			// if report is from human
			var data = {records: [ {key: null, value: "{"+ input.title+" / " + input.description +" / " + input.location +" / " + input.attachment +" / " + input.author+"/ " } ]};
		} else {
			whisk.error({error: 'Unkown report input!'});
		}
	}
	 */

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
