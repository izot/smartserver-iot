#bcastSwitch.js 
---
This node.js applicaiton runs on the SmartServer IoT to emulate the boardcast SNVT_switch feature that is part of the SmartServer 2.  On the SmartSever 2, there is a SNVT_switch typed datapoint that when set would issue an explicit message code 59 (dec) with a data payload that matches the SNVT_switch data.  This message is sent using repeated service (4 total updates) with a 192ms spacing.

To support this application, the file bcastSwitch.xif must first be imported to create a device type that is used by this application.

This application accepts 2 arguments.  The firt argument is the handle to used for the interal device.  Use 'bcast-1' to easily recognize.  The second argument is the heartbeat time in seconds.  The application will issue the broadcast message at this rate after the first update.
##Deployment
1. Create a the folder /var/apollo/data/apps/bcastSwitch.
2. Copy the file bcastSwitch.js to the folder created in step 1.
3. The file bcastSwitch.conf should be copied to the folder /etc/supervisor/conf.d.
4. In the CMS deviceType widget, import the xif file bcastSwitch.xif.  
5. Open an SSH session in putty.exe and type: cd /var/apollo/data/apps/bcastSwitch
6. Type: node bcastSwtich.js
7. After 10s, the console output should report the application is creating the internal bcastSwitch application.
8. In the CMS, the bcast-1 device should be added to the Devices widget.
9. In the Devices widget, select the bast-1 device in provision this device. 
10. If you write a value to ../bcast-1/if/swBroadcaster/nviValue, this value will generate a message code 59 with the data values for SNVT_switch you have written.  It will heartbeat a 300s by default.  You can edit the bcastSwitch.conf file to override the value.
11. Reboot the smartserver.

If you write a state value of -1 (invalid).  The broadcast message will stop heartbeating.