#!/bin/bash
# Copyright © 2022 EnOcean Edge Inc
# This script is used to install the channel monitor service,  Run as root
. /usr/bin/apollo/apollo-utils.fcn
echo "Installing Group Controller2 service (gc)"
echo "Scipt Version: 1.06"
echo "---------------------------------"
# 
if [ "$EUID" -ne 0 ];then
    echo "Please run this script as root."
    exit 1
fi
read -p "Please provide the apollo user password: " PSW
read -p "FT target [n]: " ISFT
APP_DIR="$APOLLO_DATA/apps"
A_SETUP="gc"
V4_FILE_MARKER="/usr/bin/smartserverctl"

if [ ! -d "$APP_DIR" ] || [ ! -d $APP_DIR/$A_SETUP ];
then
   echo "Creating install directory $APP_DIR"
   mkdir -p "$APP_DIR/$A_SETUP"
   chown -R apollo:apollo "$APP_DIR"
   UPDATE=0
fi   
cp -f ./GCpackage.zip "$APP_DIR/$A_SETUP"
cd "$APP_DIR/$A_SETUP"
unzip -o ./GCpackage.zip
rm ./GCpackage.zip
chown apollo:apollo *.*
echo "Moving resources to $APOLLO_DATA/dtp-files.d"
mv -f ./Gc2Resources.dtp $APOLLO_DATA/dtp-files.d
chown apollo:apollo $APOLLO_DATA/dtp-files.d/Gc2Resources.dtp 
chmod 666 $APOLLO_DATA/dtp-files.d/Gc2Resources.dtp 
chmod -R 775 $APP_DIR
echo "Installing power controller scripts in /home/apollo"
mv -f pwrInit.sh /home/apollo
mv -f pwrMode.sh /home/apollo
chown apollo:apollo /home/apollo/pwrInit.sh
chown apollo:apollo /home/apollo/pwrMode.sh
chmod +x /home/apollo/pwrInit.sh
chmod +x /home/apollo/pwrMode.sh

if [[ "$ISFT" == [Yy] ]]; then
    echo "   Setup gc for FT-10 target"
    sed -i '/const REPEATING = 1;/c\const REPEATING = 0;' gc2.js 
fi
if [ ! -f "$V4_FILE_MARKER" ]; then
    echo "Using pre-4.0 service architecture"
    echo "Stopping the gc service.  You can ignore errors that may be reported by supervisorctl."
    supervisorctl stop gc
    mv -f ./gc.conf /etc/supervisor/conf.d
    chmod 666 gc.js
    # chown root:apollo /etc/supervisor/conf.d/dcx.conf
    # chown root:apollo /etc/supervisor/conf.d/dcx.conf
    chmod 664 /etc/supervisor/conf.d/gc.conf

    echo "Installing custom resources using apollo password: [$PSW]"
    # load_dtp_files $PSW
    dtp-loader https://$HOSTNAME apollo $PSW /var/apollo/data/dtp-files.d/GcResources.dtp 
    sleep 30
    echo "Starting services."
    #sleep 30s
    supervisorctl update gc
    supervisorctl restart gc
    rm *.service
else
    # Need to run services under systemctl 644 permissions on unit files.
    echo "Using 4.X services architecture."
    echo "Stopping the gc services.  You can ignore errors that may be reported by systemctl."
    smartserverctl stop gc
    # 4.0 no longer uses http on port 8181
    dtp-loader https://$HOSTNAME apollo $PSW /var/apollo/data/dtp-files.d/Gc2Resources.dtp
    echo "Setting up service unit files"
    chmod 644 ./smartserver-gc.service
    chown root:root ./smartserver-gc.service
    mv -f ./smartserver-gc.service /etc/systemd/system/
    sleep 2
    echo "Starting gc service in back ground.  This will take about a minute to finish"
    smartserverctl reload
    smartserverctl enable smartserver-gc.service
    smartserverctl start gc &
fi    
echo "The (gc) service are installed."  
echo "TODO: use pwrInit.sh to configure segment power control"
# echo "Enable mqtt port: 1883 on eth1"
# ufw allow in on eth1 to any port 1883 proto tcp
cd ~
