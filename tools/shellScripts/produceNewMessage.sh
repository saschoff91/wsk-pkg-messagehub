# produce test message to topic (TOPIC is given parameter from cli)
RESTURL="kafka-rest-prod01.messagehub.services.us-south.bluemix.net"
PORT="443" 
APIKEY="qvq0cKESh4dgHLK5mWOf92Z8qiUz43rMnwCPc88pZvFYVBGO"
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
