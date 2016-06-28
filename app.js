var express = require('express');
var app = express();

//var http = require('http');

var bodyParser = require('body-parser');

var request = require('request');

var logger = require('./Logger');

//var io = require('socket.io')(http);

//retry routine while deleting kafka customer
var retry = require('retry');
var operation = retry.operation({
	  retries: 4,           // try 1 time and retry 2 times if needed, total = 3
	  minTimeout: 1 * 2000, // the number of milliseconds before starting the first retry
	  maxTimeout: 3 * 2000  // the maximum number of milliseconds between two retries
	});


var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var messageHub = appEnv.getServiceCreds('Message Hub-db');

/*
 * Get message hub credentials
 */
var messagehubApiKey = messageHub.api_key;

var messagehubRestUrl =messageHub.kafka_rest_url;

var routerHost = process.env.ROUTER_HOST || 'openwhisk.ng.bluemix.net';

//Allow invoking servers with self-signed certificates.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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

	addFeed(args.trigger, args.topic, args.namespace, args.pollingInterval, function(response){
		if (response.statusCode == 409) {
			return sendError(method, 409, 'Error code 40902 – Consumer instance with the specified name already exists.', res);
		}
		if (response.statusCode == 422) {
			return sendError(method, 422, 'Error code 42204 – Invalid consumer configuration. One of the settings specified in the request contained an invalid value.', res);
		} else {
			return sendResponse(method, 200, "Trigger and feed '"+args.trigger+"' created", res);
		}
	});	
});

/*
 * Associated function to POST/messagehubfeeds/:id
 * Send POST request to message hub instance, to create a consumer (trigger)
 * Call method startPolling
 */
function addFeed(id, topic, namespace, pollingInterval, _callback) {
	var method = 'FUNCTION: addFeed';

	if (!pollingInterval) {
		pollingInterval = 5000; //default: 5s, if not specified
	}

	var headers = {
			'Content-Type': 'application/vnd.kafka.v1+json',
			'X-Auth-Token': messagehubApiKey 
	};
	var dataString = '{"name":"'+id+'", "format": "binary", "auto.offset.reset": "largest", "auto.commit.enable":"true"}';

	var options = {
			url: messagehubRestUrl+'/consumers/'+id,
			method: 'POST',
			headers: headers,
			body: dataString
	};

	request(options, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			logger.info("OK", method, 'New Feed ', id,' created on Topic "',topic , '" !');	

			feeds[id] = {topic:topic, namespace:namespace, pollingInterval:pollingInterval, polling:false};

			startPolling(id, topic, pollingInterval);
		}
		else {
			deleteTriggerFeed(id);
		}
		_callback(response);
	});
}

function deleteTriggerFeed(triggerName) {
	var method = 'FUNCTION: deleteTrigger';
	logger.info(triggerName, method, 'Cannot create trigger, cause of error in creation of feed');
	var apiKey = "52a41dd3-ecc0-4eb2-af96-46af7083fa1c:eqd3fBvDmFpUZbU5WmuKoKucMAFEpMEkV21byvRYH7GIcCoAS45AJGMu2XLB5mUF";
	//var form = {payload:message};
	var auth = apiKey.split(':');
	var uri = ' https://openwhisk.ng.bluemix.net/api/v1/namespaces/'+feeds[id].namespace+'/triggers/'+triggerName;

	logger.info(tid, method, uri, message);
	request({
		method: 'DELETE',
		uri: uri,
		auth: {
			user: auth[0],
			pass: auth[1]
		},
		//json: form
	}, function(error, response, body) {
		logger.info(tid, method, 'done http request, STATUS', response ? response.statusCode : response);
		logger.info(tid, method, 'done http request, body', body);
		if (!error && response.statusCode == 200) {
			logger.info(tid, method, body);
		} else {
			logger.error(tid, method, 'Error delete whisk trigger: ', response ? response.statusCode : response, error, body);
		}
	});
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
	var headers = {
			//'Accept': 'application/vnd.kafka.binary.v1+json',
			'Accept': 'application/json',
			'X-Auth-Token': messagehubApiKey
	};
	var options = {
			url: messagehubRestUrl+'/consumers/'+id+'/instances/'+id+'/topics/'+topic,
			headers: headers
	};
	var feed = setInterval(function(){
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {		
				if (response.headers['content-length'] > 2 ) {
					logger.info(id, method, 'Incoming Message on topic ', topic,' with content ', response.body);
					invokeWhiskAction(id, response.body);
				}
				/*
				else { // for debbuging
					logger.info(id, method, 'No new messages on ', topic);
				}*/
			} 
		});
	},pollingInterval);
	feedLoops[id] = {feed:feed};
	logger.info(id, method, 'Feed start polling ',id,' on topic', topic, ' each ',pollingInterval, ' ms');
	feeds[id].polling = true;
	feeds[id].pollingInterval = pollingInterval;
	return feedLoops[id];
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

	if (feeds[id]) {
		
		if (feeds[id].polling == true) {
			stopPolling(id);
		}
		
		deleteRoutine(id, function(err,result) {
			if (err) {
				logger.info(id, method, 'Deleting trigger and feed ', id, ' failed ');
				return sendError(method, 404, 'Feed "'+id+'" deletion failed.',res);
			} else {
				logger.info(id, method, 'Deleting trigger and feed ', id, ' done ');
				return sendResponse(method, 200, 'Feed "'+id+'" deleted correctly.',res);
			}
		});
		//deleteFeed(id, function(response){
		//	if (response.statusCode == 204) {
		//		return sendResponse(method, 204, 'Feed "'+id+'" deleted.');
		//	} 
		//});
	} else {
		return sendError(method, 404, "Error code 40403 – Consumer instance not found", res);
	}
});

function deleteRoutine(input, callback) {
	  operation.attempt(function(currentAttempt) {

		    deleteFeed(input, function(err, result) {

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
function deleteFeed(id,_callback) {

	var method = "FUNCTION: deleteFeed";
	var headers = {
			'X-Auth-Token': messagehubApiKey 
	};
	var options = {
			url: messagehubRestUrl+'/consumers/'+id+'/instances/'+id,
			method: 'DELETE',
			headers: headers
	};
	var req = request(options, function(error, response, body) {
		if (response.statusCode == 204) {
			logger.info("No Content", method, 'Feed deleted ', id);
			delete feeds[id];
			_callback(null, 'ok');
		} else {
			logger.info("Conflict",method, 'Error code 40910 - Another request is in progress for consumer "'+id+'". Request may be retried when response is received for the previous request.')
			_callback(new Error());
		}

	});
}


/**
 * Fire the whisk trigger
 */
function invokeWhiskAction(id, message) {
	var method = 'FUNCTION: invokeWhiskAction';
	var tid = "???";
	logger.info(tid, method, 'for trigger', id, 'invoking action', id, 'with incoming message', message);
	var apiKey = "52a41dd3-ecc0-4eb2-af96-46af7083fa1c:eqd3fBvDmFpUZbU5WmuKoKucMAFEpMEkV21byvRYH7GIcCoAS45AJGMu2XLB5mUF";
	var form = {payload:message};
	var auth = apiKey.split(':');
	var uri = ' https://openwhisk.ng.bluemix.net/api/v1/namespaces/'+feeds[id].namespace+'/triggers/'+id;

	logger.info(tid, method, uri, message);
	request({
		method: 'POST',
		uri: uri,
		auth: {
			user: auth[0],
			pass: auth[1]
		},
		json: form
	}, function(error, response, body) {
		logger.info(tid, method, 'done http request, STATUS', response ? response.statusCode : response);
		logger.info(tid, method, 'done http request, body', body);
		if (!error && response.statusCode == 200) {
			logger.info(tid, method, body);
		} else {
			logger.error(tid, method, 'Error invoking whisk action:', response ? response.statusCode : response, error, body);
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



