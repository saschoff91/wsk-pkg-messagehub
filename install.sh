#!/bin/bash

#/
# Copyright 2015-2016 IBM Corporation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#/

# To run this command
# WHISKPROPS_FILE="$OPENWHISK_HOME/whisk.properties"
# WSK_CLI=$OPENWHISK_HOME/bin/wsk
# AUTH_KEY=$(cat $OPENWHISK_HOME/config/keys/auth.whisk.system)
# EDGE_HOST=$(grep '^edge.host=' $WHISKPROPS_FILE | cut -d'=' -f2)

set -e
set -x

if [ $# -eq 0 ]
then
    echo "Usage: ./install.sh $APIHOST $AUTH $WSK_CLI"
fi

APIHOST="$1"
AUTH="$2"
WSK_CLI="$3"

PACKAGE_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo Installing an Openwhisk Package Message Hub \

$WSK_CLI --apihost $APIHOST package update --auth $AUTH --shared yes  messagehub \
    -a description "Openwhisk Package Message Hub" \
    -a parameters '[{"name":"restUrl","required":true,"bindTime":true,"description":"Message Hub Kafka rest url"},{"name":"restPort","required":true,"bindTime":true,"description":"Message Hub Kafka rest port, e.g 443"},{"name":"apikey","required":true,"bindTime":true,"type":"password","description":"Message Hub api key"},{"name":"endpoint","required":true,"bindTime":true,"type":"password","description":"Url of trigger provider application"}]'

$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes messagehub/getTopics $PACKAGE_HOME/actions/getTopics.js \
-a description 'Return all created topics in bluemix message hub instance' \
    -a parameters '[{"name":"restUrl","required":true,"bindTime":true,"description":"Message Hub Kafka rest url"},{"name":"restPort","required":true,"bindTime":true,"description":"Message Hub Kafka rest port, e.g 443"},{"name":"apikey","required":true,"bindTime":true,"type":"password","description":"Message Hub api key"},{"name":"endpoint","required":true,"bindTime":true,"type":"password","description":"Url of trigger provider application"}]' \
    -a sampleInput '{"restUrl":"XXXXXX","restPort":"YYYYYY","apikey":"WWWWWW","serviceEndpoint":"UUUUUU"}' \
-a sampleOutput '{"result":{"topcis":[{"markedForDeletion":false,"name":"AAAA","partitions":1,"retentionMs":"86400000"},{"markedForDeletion":false,"name":"BBBBB","partitions":1,"retentionMs":"86400000"},{"markedForDeletion":false,"name":"CCCC","partitions":1,"retentionMs":"86400000"}]},"status":"success","success":true}' 

$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes messagehub/createTopic $PACKAGE_HOME/actions/createTopic.js \
-a description 'Create a new topic in bluemix message hub' \
    -a parameters '[{"name":"restUrl","required":true,"bindTime":true,"description":"Message Hub Kafka rest url"},{"name":"restPort","required":true,"bindTime":true,"description":"Message Hub Kafka rest port, e.g 443"},{"name":"apikey","required":true,"bindTime":true,"type":"password","description":"Message Hub api key"},{"name":"topic","required":true,"bindTime":false,"type":"password","description":"Topic id for creation"}]' \
    -a sampleInput '{"restUrl":"XXXXXX","restPort":"YYYYYY","apikey":"WWWWWW","topic":"ZZZZZ"}' \
-a sampleOutput '{ "result": "topic created successfully " }'

$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes messagehub/deleteTopic $PACKAGE_HOME/actions/deleteTopic.js \
-a description 'Delete a topic in bluemix message hub' \
    -a parameters '[{"name":"restUrl","required":true,"bindTime":true,"description":"Message Hub Kafka rest url"},{"name":"restPort","required":true,"bindTime":true,"description":"Message Hub Kafka rest port, e.g 443"},{"name":"apikey","required":true,"bindTime":true,"type":"password","description":"Message Hub api key"},{"name":"topic","required":true,"bindTime":false,"type":"password","description":"Topic id for creation"}]' \
    -a sampleInput '{"restUrl":"XXXXXX","restPort":"YYYYYY","apikey":"WWWWWW","topic":"ZZZZZ"}' \
-a sampleOutput '{ "result": "topic deleted successfully " }'

$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes messagehub/publish $PACKAGE_HOME/actions/publish.js \
-a description 'Create a new binary message on a specific topic' \
    -a parameters '[{"name":"restUrl","required":true,"bindTime":true,"description":"Message Hub Kafka rest url"},{"name":"restPort","required":true,"bindTime":true,"description":"Message Hub Kafka rest port, e.g 443"},{"name":"apikey","required":true,"bindTime":true,"type":"password","description":"Message Hub api key"},{"name":"topic","required":true,"bindTime":false,"description":"Topic id for creation"},{"name":"message","required":true,"bindTime":false,"description":"Binary message to publish on topic"}]' \
    -a sampleInput '{"restUrl":"XXXXXX","restPort":"YYYYYY","apikey":"WWWWWW","topic":"ZZZZZ", "message": "AAAAAAA"}' \
-a sampleOutput '{"result":{"key_schema_id":null,"offsets":[{"error":null,"error_code":null,"offset":1,"partition":0}],"value_schema_id":null},"status":"success","success":true}'

$WSK_CLI --apihost $APIHOST action update --auth $AUTH --shared yes messagehub/kafkaFeed $PACKAGE_HOME/feeds/kafkaFeed.js \
-a description 'Create feed action for trigger lifecycle events'
