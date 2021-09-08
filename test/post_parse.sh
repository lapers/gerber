#!/bin/sh

if [ ! -f "$1" ]; then echo "Use filename as argument"; exit 1; fi

#DATA=$(cat $1)

curl -X POST -H "Content-Type: multipart/form-data" -F "data=@$1" http://127.0.0.1:8009/parse

echo

exit 0
