RESTURL="RESTURL"
PORT="443"
APIKEY="APIKEY"

curl -v -X GET -H "Content-Type: application/json" \
		-H "X-Auth-Token: $APIKEY" \
        "https://$RESTURL:$PORT/admin/topics"
