Openwhisk Message Hub Package
============================
[![Build Status](https://travis-ci.org/saschoff91/wsk-pkg-messagehub.svg?branch=master)](https://travis-ci.org/saschoff91/wsk-pkg-messagehub)

```
wsk-pkg-messagehub/
├── Getting started
│   ├── Create Message Hub Instance
│   └── Deploy Trigger Provider
├── Actions
│   ├── Get Topics
│   ├── Create Topic
│   ├── Delete Topic
│   └── Publish Message
├── Feed
│   └── Create Trigger on Topic
├── Deploy Locally
├── Further Work
├── Contributing
└── License
```

This repository includes actions and feeds for [IBM Bluemix](http://www.ibm.com/cloud-computing/bluemix/) service Message Hub. 

The whole communication is based on the [Kafka REST API](http://docs.confluent.io/2.0.0/kafka-rest/docs/index.html).

![MessageHub overview](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/messagehub%20overview.jpg "MessageHub Package Workflow")

## Getting Started:
Before using this package, following preparations must be done:
  1. Create a Message Hub instance in Bluemix.
  2. Create a node application, which acts as a trigger provider.
  3. Create a cloudant instance, which stores the trigger.
  4. Bind the message hub and cloudant instance to node application, via application dashboard.
  5. Modify /feeds/TriggerProvider/app.js file and fill in your message hub instance name

``` javascript
var messageHub = appEnv.getServiceCreds('Message Hub-instance');
...
var cloudant = appEnv.getServiceCreds('Cloudant-instance');
``` 
  5. Deploy the created node application with file from /feeds/TriggerProvider/ with 
``` 
/<PATH_TO_NODE_FILES>$ cf push
```
  ***Note:*** If you cloned this repository and deploy the application with /feeds/TriggerProvider/, change the application name in manifest.yml before. 

| Entity | Type | Parameters | Description |
| --- | --- | --- | --- |
| `/whisk.system/messagehub` | package | restUrl, restPort, apikey | Message Hub Package |
| `/whisk.system/messagehub/getTopics` | action | see action [details](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/actions/getTopics.js) | return all topics |
| `/whisk.system/messagehub/createTopic` | action | see action [details](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/actions/createTopic.js) | create a new topic |
| `/whisk.system/messagehub/deleteTopic` | action | see action [details](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/actions/deleteTopic.js) | delete a topic  |
| `/whisk.system/messagehub/publish` | action | see action [details](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/actions/publish.js) | create new binary message for a topic |
| `/whisk.system/messagehub/kafkaFeed` | action | see action [details](https://github.com/saschoff91/wsk-pkg-messagehub/blob/master/feeds/kafkaFeed.js) | handle trigger lifecycle |


## Actions:
The parameters for the package /whisk.system/messagehub, like restUrl, restPort and apikey, are required for all following actions and feeds. So they are not listed seperatly. Parameters for each action are listed in the source code of each action file.

To bind all required parameters to the package perform following command.
```bash
wsk package update messagehub -p restUrl '<messageHubRestURL>' -p restPort '<port>' -p apikey '<apikey>' 
```

#### Get Topics
`/whisk.system/messagehub/getTopics` returns all created on a Message Hub instance

To use this action, you need to pass the required parameters (refer to the table above)
```bash
wsk action invoke /whisk.system/messagehub/getTopics
```

Example of success response:
```javascript
{
  "result": {
    "topcis": [
      {
        "markedForDeletion": false,
        "name": "AAAA",
        "partitions": 1,
        "retentionMs": "86400000"
      },
      {
        "markedForDeletion": false,
        "name": "BBBB",
        "partitions": 1,
        "retentionMs": "86400000"
      }
    ]
  },
  "status": "success",
  "success": true
}
```

#### Create Topic
`/whisk.system/messagehub/createTopic` is an action to create a topic on Message Hub.

| **Parameter** | **Type** | **Required** | **Description** | **Default** | **Example** |
| ------------- | ---- | -------- | ------------ | ------- |------- |
| topic | *string* | yes |  Topic Id in Message Hub | - | "XXXXX" |

##### Usage
```bash
wsk action invoke /whisk.system/messagehub/createTopic -p topic 'CCCC' --blocking
```
**orgId**, **apiKey** as well as **apiToken** parameters can be ignored if it is already passed to the package at binding time.

Example of success response:
```javascript
{
    "result": {
        "result": "topic created successfully "
    },
    "status": "success",
    "success": true
}
```

#### Delete Topic
`/whisk.system/messagehub/deleteTopic` is an action to delete an existing topic. The user must take care of the correct id of the topic.


| **Parameter** | **Type** | **Required** | **Description** | **Default** | **Example** |
| ------------- | ---- | -------- | ------------ | ------- |------- |
| topic | *string* | yes |  Topic Id in Message Hub | - | "XXXXX" |


##### Usage
```bash
wsk action invoke /whisk.system/messagehub/deleteTopic -p topic 'CCCC' --blocking
```

Example of success response:
```javascript
{
    "result": {
        "result": "topic deletion successfully "
    },
    "status": "success",
    "success": true
}
```

#### Publish Messages
`/whisk.system/messagehub/publish` is an action to publish a binary message to Message Hub on a specific topic. Json and Avro message formats are not supported, when using the Kafka REST Api on Message Hub.


| **Parameter** | **Type** | **Required** | **Description** | **Default** | **Example** |
| ------------- | ---- | -------- | ------------ | ------- |------- |
| topic | *string* | yes |  Topic Id in Message Hub | - | "XXXXX" |
| message | *string* | yes |  Binary Message content | - | "YYYYY" |

##### Usage 
```bash 
wsk action invoke /whisk.system/messagehub/publish --param topic 'XXXXX' --param message 'YYYYY'  --blocking
```
Example of success response:
```javascript
{
    "result": {
        "key_schema_id": null,
        "offsets": [
            {
                "error": null,
                "error_code": null,
                "offset": 298,
                "partition": 0
            }
        ],
        "value_schema_id": null
    },
    "status": "success",
    "success": true
}
```
## Feed
#### Create trigger on topic
`/whisk.system/messagehub/kafkaFeed` is an action, which handle the trigger lifecycle (create, delete) for Message Hub.

| **Parameter** | **Type** | **Required** | **Description** | **Default** | **Example** |
| ------------- | ---- | -------- | ------------ | ------- |------- |
| topic | *string* | yes |  Topic Id in Message Hub | - | "XXXXX" |
| polling | *integer* | no |  Polling intervall in ms | 5000 | 10000 |
| feed | *string* | yes |  Feed action | - | "messagehub/kafkaFeed" |

##### Usage
```bash
wsk trigger create <triggerName> -p topic 'XXXXX' -p polling 5000 --feed messagehub/kafkaFeed
```

Example of success response:
```javascript
{
    "result": " trigger done creation"
}
```

# Deploying Locally
This package contains an install script that will create a package and add the actions into it :
```shell
git clone https://github.com/saschoff91/wsk-pkg-messagehub
cd wsk-pkg-messagehub
./install.sh <apihost> <authkey> <pathtowskcli>
```

# Further Work
* Replace the use of Kafka REST api with Kafka native client
* A kafka rest consumer gets deleted automaticly after 24 hours, avoid triggers without a specific consumer
* Supported message format is binary, cause of the use of Kafka REST Api
* Package can only deployed locally !!!

# Contributing
Please refer to [CONTRIBUTING.md](CONTRIBUTING.md)

# License
Copyright 2015-2016 IBM Corporation

Licensed under the [Apache License, Version 2.0 (the "License")](http://www.apache.org/licenses/LICENSE-2.0.html).

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
