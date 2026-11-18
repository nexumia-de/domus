#!/bin/sh
# Prepares the data folder and the user, then runs Apache in the foreground.
set -eu
: "${WEBDAV_USER:=mixtura}"
: "${WEBDAV_PASSWORD:?WEBDAV_PASSWORD must be set}"
# Origins that may call the server from a browser page. The default is the
# hosted app and any page on this machine.
[ -n "${ALLOWED_ORIGINS_REGEX:-}" ] || ALLOWED_ORIGINS_REGEX='^(https://mixtura[.]nexumia[.]de|http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?)$'
export ALLOWED_ORIGINS_REGEX
mkdir -p /var/dav/files /var/dav/lock
chown -R daemon:daemon /var/dav
htpasswd -Bbc /var/dav/users.passwd "$WEBDAV_USER" "$WEBDAV_PASSWORD" 2>/dev/null
exec httpd -DFOREGROUND -f /usr/local/apache2/conf/httpd.conf
