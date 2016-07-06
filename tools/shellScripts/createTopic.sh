RESTURL="kafka-rest-prod01.messagehub.services.us-south.bluemix.net"
PORT="443"
APIKEY="qvq0cKESh4dgHLK5mWOf92Z8qiUz43rMnwCPc88pZvFYVBGO"
TOPIC="$1"

if ["$TOPIC" == ""]
then echo "Parameter missing: topic is missing. Usage: ./createTopic.sh <topic>"
else
curl -v -X POST -H "Content-Type: application/json" \
		-H "X-Auth-Token: $APIKEY" \
		--data '{"name": "'$TOPIC'"}' \
        "https://$RESTURL:$PORT/admin/topics"
fi
