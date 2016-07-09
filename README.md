# wsk-pkg-messageHub service package
This package include the openwhisk-enablement for message hub instance on [IBM Bluemix](http://www.ibm.com/cloud-computing/bluemix/). The whole communication is based on the [Kafka REST API](http://docs.confluent.io/2.0.0/kafka-rest/docs/index.html).  

![MessageHub overview](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/messagehub%20overview.jpg "MessageHub Package Workflow")

# Prepare environment
First create a message hub instance in Bluemix and bind it to you node application. 
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

# Invoke Actions
When this package is correctly created, you have to create a binding for all required parameters.

```
wsk package update messagehub -p resturl '<messageHubRestURL>' -p restport '443' -p apikey '<apikey>' 
```
To check, if you bind parameters correctly, perfom:
```
wsk package get messagehub parameters
```

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

# Create trigger
You can create one trigger for each topic on message hub. When a new message is arriving on the kafka bus, then the feed source sends a POST request to openwhisk and invoke the trigger. The trigger can combined with a rule, so that different actions can performed to build an awesome scenario.

To create a trigger, use following command:
```
wsk trigger create <triggername> -p topic '<topic>' -p polling <milliseconds> --feed messagehub/kafkaFeed
```
- *triggername* is the unique name of a trigger. This value is also used to create the consumer instance for kafka. This name must unique in the whole message hub instance.
- *topic* is used for listening on a message hub topic for a trigger
- *polling* is used to define the interval of polling, default value is 5000
- messagehub/kafkaFeed create the feed, so that lifecycle events can control the trigger creation/deletion

# Further Work
* Replace the use of kafka REST api with Kafka native client
* A kafka rest consumer gets deleted automaticly after 24 hours, avoid triggers without a specific consumer
* Consumer format must switched to 'json' instead of 'binary'

# Contributing
Please refer to [CONTRIBUTING.md](CONTRIBUTING.md)

# License
Copyright 2015-2016 IBM Corporation

Licensed under the [Apache License, Version 2.0 (the "License")](http://www.apache.org/licenses/LICENSE-2.0.html).

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.

