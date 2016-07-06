RESTURL="messagehubapplication.mybluemix.net"
PORT="80"
TRIGGERNAME="$1"

if ["$TRIGGERNAME" == ""]
then echo "Parameter missing: Triggername for stop polling on topic. Usage: ./stopPolling.sh <name>"
else curl -v -X GET "http://$RESTURL:$PORT/messagehubtriggers/$TRIGGERNAME/stopPolling"
fi
