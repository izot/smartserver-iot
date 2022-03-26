#!/bin/bash
# This script is used to install the channel monitor service,  Run as root
echo "Install channelMonitor service..."
# 
PASS=$1
if [ -z $PASS ]
then
   echo "Error: This script requires you to provide the apollo user password: ./setup.sh [pwd]\n"
   exit 1
fi
APP_DIR="$APOLLO_DATA/apps"
A_SETUP="channelMonitor"
LOG_DIR="/media/sdcard/app_logdata"
echo "Creating install directory $APP_DIR"
[ ! -d "$APP_DIR" ] && echo "Creating the /var/apollo/data/apps directory"
[ ! -d "$APP_DIR" ] && mkdir -p "$APP_DIR"
[ ! -d "$APP_DIR/A_SETUP" ] && mkdir -p "$APP_DIR/$A_SETUP"
[ ! -d "$LOG_DIR" ] && mkdir -p "$LOG_DIR"
chown apollo:apollo "$LOG_DIR"
chmod -R 775 "$LOG_DIR"
cp ./channelMonitorPackage.zip "$APP_DIR/$A_SETUP"
cd "$APP_DIR/$A_SETUP"
unzip -o ./channelMonitorPackage.zip
rm ./channelMonitorPackage.zip
mv -f ./channelMon.conf /etc/supervisor/conf.d
chown apollo:apollo *.*
chmod -R 775 $APP_DIR
chmod 666 channelMonitor.js
chown root:apollo /etc/supervisor/conf.d/channelMon.conf
chmod 664 /etc/supervisor/conf.d/channelMon.conf
echo "Moving ApolloDev resources (1.32) to $APOLLO_DATA/dtp-files.d"
mv -f ./ApolloDev_1_32.dtp $APOLLO_DATA/dtp-files.d
echo "Moving device type files to $APOLLO_DATA/dtp-files.d"
mv -f ./channelMon.dtp $APOLLO_DATA/dtp-files.d
chown apollo:apollo $APOLLO_DATA/dtp-files.d/channelMon.dtp
chmod 666 $APOLLO_DATA/dtp-files.d/channelMon.dtp
chown apollo:apollo $APOLLO_DATA/dtp-files.d/ApolloDev_1_32.dtp
chmod 666 $APOLLO_DATA/dtp-files.d/ApolloDev_1_32.dtp
echo "Reseting databases.  This will take 30 minutes to complete..."
echo "Time now: "$(date +%T) 
apollo-reset normal $PASS
sleep 5
echo "Creating IP-70 side of IP-852 router"
mosquitto_pub -t glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/ip852NS_eth0/do -m '{"action": "create", "args": { "type": "9000010500C08520", "unid": "auto", "lon.attach": "local"}}'
sleep 3
echo "Creating Farside of IP-852 router"
mosquitto_pub -t glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/ip852FS_eth0/do -m '{"action": "create", "args": { "provision": true, "type": "9000010500C08520", "unid": "auto","lon.attach": "ip852NS_eth0", "routing": { "media": "IP-852", "interface": "eth0", "ipPort": 1628, "mode": "Repeater"}}}'
echo "Rebooting the SmartServer to start the channel monitor service."
reboot 
cd ~
