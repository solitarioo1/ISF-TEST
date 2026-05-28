#!/bin/sh
set -e

# Reemplaza los placeholders ${VAR} en config.js con los valores reales del entorno
envsubst '${N8N_SUBMIT} ${N8N_REFDATA} ${N8N_GET_MES}' \
  < /usr/share/nginx/html/js/config.js \
  > /tmp/config.js && mv /tmp/config.js /usr/share/nginx/html/js/config.js

exec nginx -g 'daemon off;'
