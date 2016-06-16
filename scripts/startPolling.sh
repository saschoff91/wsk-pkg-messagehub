RESTURL="messagehubapplication.mybluemix.net"
PORT="80"
TRIGGERNAME="$1"
TOPIC="$2"

if ["$TRIGGERNAME" == ""]
then echo "Parameter missing: Triggername for start polling. Usage: ./startPolling.sh <name> <topic>"
else {

if ["$TOPIC" == ""]
then echo "Parameter missing: On what topic should trigger $TRIGGERNAME listen. Usage: ./startPolling.sh <name> <topic>"
else {

curl -v -X POST -H 'Content-Type: application/json' \
        "http://$RESTURL:$PORT/messagehubtriggers/$TRIGGERNAME/startPolling/$TOPIC"
}
fi
}
fi
