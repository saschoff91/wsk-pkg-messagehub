RESTURL="kafka-rest-prod01.messagehub.services.us-south.bluemix.net"
PORT="443"
APIKEY="qvq0cKESh4dgHLK5mWOf92Z8qiUz43rMnwCPc88pZvFYVBGO"

curl -v -X GET -H "Content-Type: application/json" \
		-H "X-Auth-Token: $APIKEY" \
        "https://$RESTURL:$PORT/admin/topics"
