NAME="$1"

wsk action update messagehub/kafkaFeed kafkaFeed.js
wsk -v trigger create $NAME -p topic 'event' -p polling 5000 --feed messagehub/kafkaFeed
