#!/bin/bash
# This script is used to install the cfgReplace service,  Run as root
echo "Install cfgReplace service..."
# 
APP_DIR="/var/apollo/data/apps"
A_SETUP="cfgReplace"
[ ! -d "$APP_DIR" ] && echo "Need to create the /var/apollo/data/apps directory"
[ ! -d "$APP_DIR" ] && mkdir -p "$APP_DIR"
[ ! -d "$APP_DIR/A_SETUP" ] && mkdir -p "$APP_DIR/$A_SETUP"
cp ./cfgReplacePackage.zip "$APP_DIR/$A_SETUP"
cd "$APP_DIR/$A_SETUP"
unzip ./cfgReplacePackage.zip
rm ./cfgReplacePackage.zip
mv -f ./cfgReplace.conf /etc/supervisor/conf.d
chown root:apollo /etc/supervisor/conf.d/cfgReplace.conf
chmod 664 /etc/supervisor/conf.d/cfgReplace.conf
echo "Reboot the SmartServer to start the cfgReplace service."
cd ~