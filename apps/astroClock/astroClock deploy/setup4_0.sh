#!/bin/bash
# Adds the Astto clock internal device to the SmartServer. Run as root
echo "AstroClock device installer 2.00"
APP_DIR="$APOLLO_DATA/apps"
A_SETUP="astroClock"
V4_FILE_MARKER="/usr/bin/smartserverctl"
if [ "$EUID" -ne 0 ];then
    echo "Please run this script as root.  (sudo ./setup.sh)"
    exit 1
fi
read -p "Please provide the apollo user password: " PSW

if [ -z "$PSW" ]; then
    read -p "Please enter the apollo user password: " PSW 
    if [ -z "$PSW" ];then
        echo "Script will not run without the apollo user password."
        exit 1
    fi 
fi
     
echo "Using apollo password: $PSW"
if [ ! -d "$APP_DIR" ] || [ ! -d $APP_DIR/$A_SETUP ];
then
   echo "Creating install directory $APP_DIR"
   mkdir -p "$APP_DIR/$A_SETUP"
   chown -R apollo:apollo "$APP_DIR"
   UPDATE=0
fi 
echo "Extracting files from archive"
cp ./astroClockPackage.zip "$APP_DIR/$A_SETUP"
cd "$APP_DIR/$A_SETUP"
unzip -o ./astroClockPackage.zip
rm ./astroClockPackage.zip
echo "Resetting file ownership to apollo"
chown -R apollo:apollo $APP_DIR
echo "Moving astroClock package to $APOLLO_DATA/dtp-files.d"
mv ./astroClock.dtp $APOLLO_DATA/dtp-files.d
echo "Moving ApolloDev resources (1.31) to $APOLLO_DATA/dtp-files.d"
mv ./ApolloDev_1_43.zip $APOLLO_DATA/dtp-files.d
chown apollo:apollo $APOLLO_DATA/dtp-files.d/astroClock.dtp
chmod 666 $APOLLO_DATA/dtp-files.d/astroClock.dtp
chown apollo:apollo $APOLLO_DATA/dtp-files.d/ApolloDev_1_43.zip
chmod 666 $APOLLO_DATA/dtp-files.d/ApolloDev_1_43.zip
echo "Loading ApolloDev Resources version 1.43"
dtp-loader https://$HOSTNAME apollo $PSW $APOLLO_DATA/dtp-files.d/ApolloDev_1_43.zip
echo "Loading astroClock package to the CMS as user/pwd apollo/$PSW. This will take 30-45s"
dtp-loader https://$HOSTNAME apollo $PSW $APOLLO_DATA/dtp-files.d/astroClock.dtp
chmod 666 astroClock.js
chmod 666 astroEvent.js
if [ ! -f "$V4_FILE_MARKER" ]; then
   echo "Using pre-4.0 service architecture"
   echo "Stopping the astroClock service.  You can ignore errors that may be reported by supervisorctl."
   supervisorctl stop astroClock
   mv $APP_DIR/$A_SETUP/astroClock.conf /etc/supervisor/conf.d
   chmod 664 /etc/supervisor/conf.d/astroClock.conf
   echo "Creating astro-1 lon.attach:local device"
   mosquitto_pub -t glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/astro-1/do -m '{"action":"create","args":{"uid":"auto","type":"90000106000A8511","lon.attach":"local","provision":true}}'
   sleep 20s
   supervisorctl reload
   rm *.service
else
    echo "Using 4.X services architecture."
    echo "Stopping the gc services.  You can ignore errors that may be reported by systemctl."
    systemctl stop astroClock
    echo "Setting up service unit files"
    chmod 664 ./smartserver-astroClock.service
    chown root:root ./smartserver-astroClock.service
    mv -f $APP_DIR/$A_SETUP/smartserver-astroClock.service /etc/systemd/system
    sleep 2
    echo "Creating astro-1 lon.attach:local device"
    mosquitto_pub -t glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/astro-1/do -m '{"action":"create","args":{"uid":"auto","type":"90000106000A8511","lon.attach":"local","provision":true}}'
    sleep 20s
    supervisorctl restart lte
    smartserverctl enable smartserver-astroClock.service
    smartserverctl start astroClock
    rm *.conf
fi
echo "Please reboot your smartsterver now to complete the service installation."
cd .
