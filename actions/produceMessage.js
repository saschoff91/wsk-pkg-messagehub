/**
 * Demo whisk action to publish a message to message hub.
 */

function main(msg) {

    console.log(msg);

    // Need to connect over HTTPS
    var https = require('https');

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

    var data = {records: [{value:input}]};
    
    // Set our HTTPS request options
    var options = {
        host: restHost,
        port: restPort,
        path: '/topics/' + topic,
        method: 'POST',
        json:data,
        headers: { 'X-Auth-Token': apiKey,
            'Content-Type': 'application/json' }
    };

    // Send the HTTPS request and read back the response
    var req = https.request(options, function(res) {
        console.log('Sent message and received back status code: ' + res.statusCode);
        if (res.statusCode == 200){
            console.log("[MessageHub: ", restHost, " topic: ", topic, "] Producing >>> ", data);
        }

        var responseData = '';
        res.on('data', function(data) {
            responseData += data;
        });

        res.on('end', function () {
            console.log('Sent message and received back response: ' + responseData);
        });
    });

    // The request body contains the Base64 encoded message text
    var message = { 'records':
      [
            { 'value': msg.message}
       ]
    }
    req.write(JSON.stringify(message));
    req.end();

    req.on('error', function(e) {
        console.log(e);
    });
    
    return {payload: {topic: topic, message: message}};
}

/*
var data = '{ "topic":"farm", "text":"It was the best of times it was the worst of times"}';
var packet = { payload : data };
publish(packet);
*/