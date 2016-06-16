# wsk-pkg-messageHub
This package include the openwhisk-enablement for message hub instance on [IBM Bluemix](http://www.ibm.com/cloud-computing/bluemix/). The whole communication is based on the [Kafka REST API](http://docs.confluent.io/2.0.0/kafka-rest/docs/index.html). 

To use this package an extra node application and the message hub instance on Bluemix is required.


# Preconditions and nodejs application
For getting the latest messages from kafka, an Bluemix NodeJS application is used. An example deployment of [app.js](https://github.ibm.com/saschoff/wsk-pkg-messageHub/blob/master/app.js) can found [http://messagehubapplication.mybluemix.net] (http://messagehubapplication.mybluemix.net/). 
These application use HTTP Polling on the REST interface (i know that is not performant yet, but further work is planned to use the native kafka client). 

## Deploy application and prepare
First create a message hub instance and bind it to you node application. 

Then edit following line of [app.js](https://github.ibm.com/saschoff/wsk-pkg-messageHub/blob/master/app.js) and fill in your message hub instance name:
``` javascript
var messageHub = appEnv.getServiceCreds('Message Hub-instance');
``` 

To deploy [app.js](https://github.ibm.com/saschoff/wsk-pkg-messageHub/blob/master/app.js) perform
``` 
cf push
```
in the folder, who contains [manifest.yml](https://github.ibm.com/saschoff/wsk-pkg-messageHub/blob/master/manifest.yml) and [package.json](https://github.ibm.com/saschoff/wsk-pkg-messageHub/blob/master/package.json). 

**IMPORTANT**: Change the name of you application in manifest.yml before deploying.

## REST API
This REST API is used to create/delete kafka consumers, which listen on a topic. Also pause and resume lsitening of a trigger is implemented.

Following nodejs application http interfaces exists for communication:

| path        | HTTP method           | parameter  | description |
| ------------- |:-------------:|:-----|:-----|
| /messagehubtriggers    | GET  | - | Returns a list of existing trigegrs in JSON. No extra parameters required.|
| /messagehubtriggers | POST | trigger, topic | Create a new trigger, which poll on kafka bus. This call requires id and topic of a trigger, this equals to the "triggername" and "topic" from "wsk trigger create <triggername> "|
| /messagehubtriggers | DELETE | trigger | Delete a selected trigger when performed. Required parameter is id, like in the creation process.|
|/messagehubtriggers/*id*/startPolling/*topic* | POST | id, topic | Starts polling process of a trigger on a topic. |
|/messagehubtriggers/*id*/stopPolling | GET | id | Stops polling of a trigger. |


#Whisk side implementation
When this package is correctly created, you have to create a binding for all required parameters.

```
wsk package update messagehub -p resturl '<messageHubRestURL>' -p restport '443' -p apikey '<apikey>' 
```
To check, if you bind parameters correctly, perfom:
```
wsk package get messagehub parameters
```

##Available Actions
Following whisk actions are available in *messagehub* packages:

- showTopics

List all topics of message hub as a JSON array
```
wsk action invoke --blocking --result messagehub/showTopics
```

- createTopic

Doesn't work at the moment. Have a look at [createTopic.sh](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/scripts/createTopic.sh). This scripts create a topic with curl command.
```
wsk action invoke --blocking --result messagehub/createTopic -p topic <topicname>

```

- produceMessage

roduce a message on a topic on message hub.
```
wsk action invoke --blocking  messagehub/produceMessage --param topic '<topic>' --param message '<message>' 
```

##Create trigger with kafkaFeed action
You can create one trigger for each topic on message hub. When a new message is arriving on the kafka bus, then the feed source sends a POST request to openwhisk and invoke the trigger. The trigger can combined with a rule, so that different actions can performed to build an awesome scenario.

To create a trigger, use following command:
```
wsk trigger create <triggername> -p topic '<topic>' -p polling <milliseconds> --feed messagehub/kafkaFeed
```
- triggername is the unique name of a trigger. This value is also used to create the consumer instance for kafka.

**IMPORTANT**: This name must unique in the whole message hub instance.
- topic> is used for listening on a message hub topic for a trigger
- polling is used to define the interval of polling, default value is 5000
- messagehub/kafkaFeed create the feed, so that lifecycle events can control the trigger creation/deletion
