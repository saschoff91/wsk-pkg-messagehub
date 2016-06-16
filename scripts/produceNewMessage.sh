# produce test message to topic (TOPIC is given parameter from cli)
RESTURL="RESTURL"
PORT="443" 
APIKEY="APIKEY"
TOPIC="$1"
MESSAGE="$2"

if ["$TOPIC" == "" ]
then echo "Parameter missing: Topic for message produce. Usage: ./produceMessage.sh <topic> <message>"
else {
	if ["$MESSAGE" == "" ]
	then echo "Parameter mising: Message content. Usage: ./produceMessage.sh <topic> <message>"
	else
	curl -v -X POST -H "Content-Type: application/json" \
             -H "X-Auth-Token: $APIKEY" \
             --data '{"records":[{"value":"'$MESSAGE'"}]}' \
             "https://$RESTURL:$PORT/topics/$TOPIC"
	fi
}
fi
