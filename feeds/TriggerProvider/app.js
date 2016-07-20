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

var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var logger = require('./Logger');

//retry routine while deleting kafka customer
var retry = require('retry');
var operation = retry.operation({
	retries: 4,           // try 1 time and retry 2 times if needed, total = 3
	minTimeout: 1 * 2000, // the number of milliseconds before starting the first retry
	maxTimeout: 3 * 1000  // the maximum number of milliseconds between two retries
});

var storeOperation = retry.operation({
	retries: 5,
	factor: 3,
	minTimeout: 1 * 1000,
	maxTimeout: 60 * 1000
});

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

/*
 * Get message hub credentials
 */
/*****MESSAGEHUB******/
var messageHub = appEnv.getServiceCreds('Message Hub-db');
var messagehubApiKey = messageHub.api_key;
var messagehubRestUrl =messageHub.kafka_rest_url;
/*****MESSAGEHUB******/

/*****CLOUDANT******/
var cloudant = appEnv.getServiceCreds('cloudant-for-openwhisk');
var cloudantUsername = cloudant.username;
var cloudantPassword = cloudant.password;
var cloudantDatabase = 'messagehub_triggers';
var nano = require('nano')(cloudant.url);
nano.db.create(cloudantDatabase);
var db = nano.db.use(cloudantDatabase);
/*****CLOUDANT******/

//Allow invoking servers with self-signed certificates.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('port', process.env.PORT || 80);

feeds={}; //data structure for all triggers
feedLoops= {}; // data structure for all polling loops of each trigger

/*
 * Returns a list of all triggers (included inactive polling)
 */

app.get('/messagehubfeeds', function(req, res) {
	var method = 'GET / messagehubfeeds'
		var retn = {};
	Object.keys(feeds).forEach(function(id) {
		logger.debug("OK", method, id);
		var feed = feeds[id];
		var feedCopy = {};
		Object.keys(feed).forEach(function(key) {
			if (key != 'trigger')
				feedCopy[key] = feed[key];
		});
		retn[id] = feedCopy;
	});;
	logger.info('output', method,'All feeds : ', retn);
	res.send(retn);
	res.end();
});

/*
 * Create Trigger and start polling on a topic.
 * Create datastrucutre for trigger instance.
 */
app.post('/messagehubfeeds',isAuthenticated, function(req, res) {
	var method = 'POST / createFeed';
	var args = typeof req.body === 'object' ? req.body : JSON.parse(req.body);

	if (!args.trigger) {
		return sendError(method, 400, "Missing parameters: required id as feed name", res);
	}
	if (!args.topic) {
		return sendError(method, 400, "Missing parameters: required topic for message hub listening", res);
	}
	if (!args.namespace) {
		return sendError(method, 400, "Missing parameters: required namespace", res);
	}

	handleTriggerCreation(args, function(response){
		if (response == "stored") {
			sendResponse(method, 200, "Trigger and feed '"+args.trigger+"' created", res);
		} else {
			if (response == "failToStoreRollbackSuccess") {
				return sendError(method, 500, "Fail to store trigger in cloudant. Roĺlback successful!", res);
			} else {
				if (response == "failToStoreRollbackFailed") {
					return sendError(method, 500, "Fail to store trigger in cloudant. Roĺlback failed too!", res);
				} else {
					return sendError(method, 500, "Fail to create consumer in message hub", res);
				}
			}
		}
	});	
});

function handleTriggerCreation(args, _callback) {
	var method = 'FUNCTION: addFeed';
	var trigger = args.trigger;
	var topic = args.topic;
	var namespace = args.namespace;
	var pollingInterval = args.pollingInterval;
	var apikey = args.apikey;

	if (!pollingInterval) {
		pollingInterval = 5000; //default: 5s, if not specified
	}

	createConsumer(trigger, function(response) {
		if (response.statusCode == 200) {	
			//logger.info("OK", method, 'New Feed ', trigger,' created !');	
			storeTrigger(args, function(stored) {
				if (stored == "stored") {
					feeds[trigger] = {topic:topic, namespace:namespace, pollingInterval:pollingInterval, apikey:apikey, polling:false};	
					startPolling(trigger, topic, pollingInterval);
					_callback('stored');
				} else {
					deleteRoutine(trigger, function(err,result) {
						if (err) {
							console.log('Deleting trigger and feed ', trigger, ' failed ');
							_callback('failToStoreRollbackSuccess');
						} else {
							console.log( 'Deleting trigger and feed ', trigger, ' done ');
							_callback('failToStoreRollbackFailed');
						}
					});
				}
			});
		} else {
			_callback('failToCreateConsumer');
		}
	});
}

function createConsumer(trigger, _callback) {
	var headers = {
			'Content-Type': 'application/vnd.kafka.v1+json',
			'X-Auth-Token': messagehubApiKey
	};
	var data = {'name':trigger, 'format': 'binary', 'auto.offset.reset': 'largest', 'auto.commit.enable':'true'}; //binary consumer
	var options = {
			url: messagehubRestUrl+'/consumers/'+trigger,
			method: 'POST',
			headers: headers
	};
	var req = request(options);
	req.on('response', function(response) {
		_callback(response);
	});
	req.write(JSON.stringify(data));
	req.end();
}

function deleteRoutine(input, callback) {
	operation.attempt(function(currentAttempt) {

		deleteConsumer(input, function(err, result) {

			console.log('Current attempt: ' + currentAttempt);

			if (operation.retry(err)) {  // retry if needed
				return;
			}

			callback(err ? operation.mainError() : null, result);
		});
	});
}
/*
 * Send DELETE request to message hub to delete consumer (trigger)
 */
function deleteConsumer(trigger,_callback) {
	var headers = {
			'Content-Type': 'application/vnd.kafka.v1+json',
			'X-Auth-Token': messagehubApiKey 
	};
	var options = {
			url: messagehubRestUrl+'/consumers/'+trigger+'/instances/'+trigger,
			method: 'DELETE',
			headers: headers
	};
	var req = request(options);

	req.on('response', function(resp) {
		if (resp.statusCode == 204)  {
			console.log( 'Feed deleted ', trigger);
			//delete feeds[trigger];
			_callback(null, 'ok');
		} else {
			console.log('Error code 40910 - Another request is in progress for consumer "'+trigger+'". Request may be retried when response is received for the previous request.')
			_callback(new Error());
		}
	});

	req.end();
}


function storeTrigger(newTrigger, _callback) {
	storeOperation.attempt((currentAttempt) => {
		db.insert(newTrigger, newTrigger.trigger, (err) => {
			if (operation.retry(err)) {
				console.log(err);
				console.log("trigger can not be inserted into DB, currentAttempt: ", currentAttempt, "out of :");
				return;
			}
			console.log("inserted successfully");
			_callback("stored");
		});
	});
}

function deleteTrigger(trigger, _callback) {
	db.get(trigger, (err, body) => {
		if (!err) {
			db.destroy(body._id, body._rev, (err) => {
				if (err) {
					console.error(err);
					_callback(false);
				}
			});
		} else {
			console.error(method, 'there was an error while deleting', trigger, 'from database');
			_callback(false);
		}
	});
	_callback(true);
}

function handleTriggerDeletion(trigger, _callback) {
	var method = 'deleteTrigger';
	if (feeds[trigger]) {
		console.log(feeds[trigger]);

		stopPolling(trigger);

		deleteRoutine(trigger, function(err,result) {
			if (err) {
				console.log('Deleting consumer from messagehub failed ');
				_callback(false);
			} else {
				console.log( 'Deleting consumer from messagehub done ');
				deleteTrigger(trigger, function(result) {
					if (result) {
						delete feeds[trigger];
						_callback(true);
					} else {
						console.log( 'Deleting trigger from db failed ');
						_callback(false);
					}
				});
			}
		});
	} else {
		console.log('trigger', trigger, 'could not be found');
		_callback(false);
	}
}

/*
 * Receive message for starting polling 
 * Call startPolling method
 */
app.post('/messagehubfeeds/:id/startPolling/:topic',isAuthenticated,function(req, res) {
	var method = 'GET / startPolling';

	var args = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
	var id = req.params.id;
	id = id.replace(/:/g, "/");

	var topic = req.params.topic;
	topic = topic.replace(/:/g, "/");

	var pollingInterval = args.pollingInterval;

	if ((feeds[id])&&(feeds[id].topic == topic)) {
		if (feeds[id].polling == false) {
			startPolling(id, topic, pollingInterval);
			return sendResponse(method, 200, "Trigger '"+id+"' start polling on topic '"+topic+"'", res);
		} else {
			return sendError(method, 400, "Trigger '"+id+"' already poll on topic '"+topic+"'" , res);
		}
	}
	else {
		return sendError(method, 400, "Trigger '"+id+"' not exist for polling", res);
	}
});

/*
 * Send GET request to message hub instance
 * Default: Every 5 seconds
 */
function startPolling(id, topic, pollingInterval) {
	var method = "FUNCTION: startPolling";

	var feed = setInterval(function(){
		poll(id, topic, function(error, response, body) {
			if (!error && response.statusCode == 200) {		
				if (response.headers['content-length'] > 2 ) {
					//logger.info(id, method, 'Incoming Message on topic ', topic,' with content ', response.body);
					invokeWhiskAction(id, response.body);
				} else { // for debbuging
					logger.info(id, method, 'No new messages on ', topic, ' content ', response.body);
				}
			} else {
				logger.info(id, method, 'Something is wrong while polling: ', response.statusCode, 'with body ', response.body);
			}
		});
	},pollingInterval);

	feedLoops[id] = {feed:feed};

	logger.info(id, method, 'Feed start polling ',id,' on topic', topic, ' each ',pollingInterval, ' ms');

	feeds[id].polling = true;
	feeds[id].pollingInterval = pollingInterval;
	return feedLoops[id];
}

function poll(id, topic, _callback){
	var headers = {
			'X-Auth-Token': messagehubApiKey,
			'Accept': 'application/vnd.kafka.binary.v1+json' //binary consumer
				//'Accept':'application/vnd.kafka.avro.v1+json'	//avro consumer
				//'Accept': 'application/vnd.kafka.json.v1+json'
	};
	var options = {
			url: messagehubRestUrl+'/consumers/'+id+'/instances/'+id+'/topics/'+topic,
			headers: headers
	};

	request(options, function(error, response, body) {
		_callback(error, response, body);
	});
}

/*
 * Receive stop polling message for a trigger
 * Call stopPolling method
 */
app.get('/messagehubfeeds/:id'+'/stopPolling',isAuthenticated, function(req, res) {
	var method = 'GET / stopPolling';

	var args = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
	var id = req.params.id;
	id = id.replace(/:/g, "/");	

	if (feeds[id].polling == true) {
		stopPolling(id);
		return sendResponse(method, 200, "Feed '"+id+"' stopped Polling", res);
	} else {
		return sendError(method, 400, "Feed '"+id+"' already stopped polling", res);
	}
});

/*
 * Clear the Interval for the requestLoop of a trigger
 * Remove the polling loop from the data structure
 */
function stopPolling(id) {
	var method = 'FUNCTION: stopPolling';
	clearInterval(feedLoops[id].feed); //clear polling loop, stopping
	delete feedLoops[id]; //remove from data structure 
	logger.info(id, method, 'Stopping polling feed ', id, ' ! ');
	feeds[id].polling = false;
	feeds[id].pollingInterval = 0;
}


/*
 * Receive DELETE request for delete a trigger
 * First, stop polling, then call method for deletion of a trigger
 */
app.delete('/messagehubfeeds/:id', isAuthenticated,function(req,res) {
	var method = 'DELETE / messageFeed';
	var args = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
	var id = req.params.id;
	id = id.replace(/:/g, "/");

	handleTriggerDeletion(id, function(deleted) {
		if (deleted)
			res.status(200).json({
				ok: 'trigger ' + id + ' successfully deleted'
			});
		else
			res.status(404).json({
				error: 'trigger ' + id + ' not found'
			});
	});
});



/**
 * Fire the whisk trigger
 */
function invokeWhiskAction(id, message) {
	var method = 'FUNCTION: invokeWhiskAction';
	var tid = "??";
	logger.info(id, method, 'for trigger', id, 'invoking action', id, 'with incoming message', message);
	var apiKey = "52a41dd3-ecc0-4eb2-af96-46af7083fa1c:eqd3fBvDmFpUZbU5WmuKoKucMAFEpMEkV21byvRYH7GIcCoAS45AJGMu2XLB5mUF";

	var form = {payload:message};

	var auth = apiKey.split(':');

	var uri = ' https://openwhisk.ng.bluemix.net/api/v1/namespaces/'+feeds[id].namespace+'/triggers/'+id;

	logger.info(tid, method, uri, message);

	var options= {
			method: 'POST',
			uri: uri,
			auth: {
				user: auth[0],
				pass: auth[1]
			},
			json:form
	};
	request(options, function(error, response, body) {
		logger.info(id, method, 'done http request, STATUS', response ? response.statusCode : response);

		if (!error && response.statusCode == 200) {
			logger.info(id, method, 'Done trigger fired, body', body);
		} else {
			logger.error(id, method, 'Error fire trigger:', response ? response.statusCode : response, error, body);
		}
	});
}

function isAuthenticated(req, res, next) {
	var method = req.method + " " + req.path;
	if (!req.headers.authorization)
		return sendError(method, 401, "Unauthorized: authentication header expected", res);

	var parts = req.headers.authorization.split(" ");
	if (parts[0].toLowerCase() !== 'basic' || !parts[1])
		return sendError(method, 401, "Unauthorized: authentication header expected", res);

	var auth = new Buffer(parts[1], 'base64').toString();
	auth = auth.match(/^([^:]*):(.*)$/);
	if (!auth)
		return sendError(method, 401, "Unauthorized: authentication header expected", res);

	req.user = {
			uuid: auth[1],
			key: auth[2]
	};

	next();
}


//FUNCTION: SENDING ERROR MESSAGES
function sendError(method, statusCode, message, res) {
	console.log(method, message);
	res.status(statusCode).json({
		error: message
	});
}

function sendResponse(method, statusCode, message, res) {
	console.log(method, message);
	res.status(statusCode).json({
		response: message
	});
}


//------------------------------- MESSAGE HUB POLLING SERVER
app.listen(appEnv.port, '0.0.0.0', function() {
	var method = 'StartUp'
		// print a message when the server starts listening
		logger.info("OK",method, 'Server listen on port '+appEnv.port);
});


