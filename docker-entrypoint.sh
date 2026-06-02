#!/bin/sh
set -e

# Reemplaza los placeholders ${VAR} en config.js con los valores reales del entorno
envsubst '${N8N_SUBMIT} ${N8N_REFDATA} ${N8N_GET_MES} ${N8N_BACKUP} ${N8N_CHECK} ${N8N_DASHBOARD} ${N8N_BACKUP_ALL}' \
  < /usr/share/nginx/html/js/config.template.js \
  > /usr/share/nginx/html/js/config.js

exec nginx -g 'daemon off;'
