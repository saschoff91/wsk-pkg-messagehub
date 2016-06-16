RESTURL="RESTURL"
PORT="443"
APIKEY="APIKEY"
TOPIC="$1"

if ["$TOPIC" == ""]
then echo "Parameter missing: topic is missing. Usage: ./createTopic.sh <topic>"
else
curl -v -X POST -H "Content-Type: application/json" \
		-H "X-Auth-Token: $APIKEY" \
		--data '{"name": "'$TOPIC'"}' \
        "https://$RESTURL:$PORT/admin/topics"
fi
