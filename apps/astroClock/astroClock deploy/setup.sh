#!/bin/bash
# Adds the Astto clock internal device to the SmartServer. Run as root
echo "AstroClock device installer 1.07"
APP_DIR="$APOLLO_DATA/apps"
A_SETUP="astroClock"
PWD=$1
echo "Using apollo password: $PWD"
echo "Creating install directory $APOLLO_DATA/astroClock"
[ ! -d "$APP_DIR" ] && echo "Creating /var/apollo/data/apps directory"
[ ! -d "$APP_DIR" ] && mkdir -p "$APP_DIR"
[ ! -d "$APP_DIR/A_SETUP" ] && mkdir -p "$APP_DIR/$A_SETUP"
echo "Extracting files from archive"
cp ./astroClockPackage.zip "$APP_DIR/$A_SETUP"
cd "$APP_DIR/$A_SETUP"
unzip -o ./astroClockPackage.zip
rm ./astroClockPackage.zip
echo "Resetting file ownership to apollo"
chown -R apollo:apollo $APP_DIR
mv $APP_DIR/$A_SETUP/astroClock.conf /etc/supervisor/conf.d
echo "Moving astroClock package to $APOLLO_DATA/dtp-files.d"
mv ./astroClock.dtp $APOLLO_DATA/dtp-files.d
echo "Moving ApolloDev resources (1.31) to $APOLLO_DATA/dtp-files.d"
mv ./ApolloDev_1_31.dtp $APOLLO_DATA/dtp-files.d
chown apollo:apollo $APOLLO_DATA/dtp-files.d/astroClock.dtp
chmod 666 $APOLLO_DATA/dtp-files.d/astroClock.dtp
chown apollo:apollo $APOLLO_DATA/dtp-files.d/ApolloDev_1_31.dtp
chmod 666 $APOLLO_DATA/dtp-files.d/ApolloDev_1_31.dtp
echo "Loading ApolloDev Resources version 1.31"
dtp-loader http://localhost:8181 apollo $1 $APOLLO_DATA/dtp-files.d/ApolloDev_1_31.dtp
echo "Loading astroClock package to the CMS as user/pwd apollo/$1. This will take 30-45s"
dtp-loader http://localhost:8181 apollo $1 $APOLLO_DATA/dtp-files.d/astroClock.dtp
echo "Creating astro-1 lon.attach:local device"
mosquitto_pub -t glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/astro-1/do -m '{"action":"create","args":{"uid":"auto","type":"90000106000A8511","lon.attach":"local","provision":true}}'
sleep 20s
supervisorctl reload
cd .
