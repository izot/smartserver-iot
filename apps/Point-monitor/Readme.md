**Point-Montitor**
This folder contains 2 Node.js applications.  
1. **pointmonitor.js**  - Is the source for the example in the documentation.
2. **pointlogger.js** - Builds on the pointmointor, but also stages time series data logs in a transfer director for latte transfer by another service.  

The **pointlogger.js** application implements a basic time series logger that captures time stamped data to a comma separated CSV file. The data events are processed to extract a subset of the values in the SNVT_trans_table in a compact form ready for import to an upstream data visualization system.  Logs are moved to a transfer folder every 300s for processing by another service to push or pull the logs to a backend visualization system.  You are encourged to modify to suit your requirements.  The object array monitorSpecs must be configured to target your devices by program ID.

**Installation**
To install this applicaiton on the target
1. Copy the files package.json, and pointlogger.js to a folder /var/apollo/data/apps/point-logger on your SmartServer IoT
2. Connect by SSH and log in as user apollo
3. Make the folder created in step 1 your current working directory: 'cd /var/apollo/data/apps/point-logger'
4. Install the application by typing: npm install.
5. Create folders on the sdcard to support the logging and staging for trasfer: 'sudo mkdir /media/sdcard/eloggerdata'
'sudo mkdir /media/sdcard/transfer'
6. Change onwnership of the directories created: sudo chown apollo:apollo /media/sdcard/eloggerdata
'sudo chown apollo:apollo /media/sdcard/transfer.'
7. Modify the pointlogger.js monitorTarget[] object to have the PID of the deivces you want to target.  You must have a DLA file in play that setup up point monitoring for the targeted devices. Normally, these data points are not set for logging by the CMS. You must chose an appropriate polling interval that will not staturate the channel.  If peer-to-peer data sharing is a large part of your system, you should strive to limit the offed traffic created by polling to under 20% of channel bandwidth.  On an FT-10 channel, this would be about 25 polls per sec.  
8. At this point, with /var/apollo/data/apps/point-logger as you current working directory, verify the application operation by typing: 'node pointlogger.js false'.  You can stop the application with <cntl>+c
9. The file point-logger.conf should be copied to /etc/suervisor/conf.d.  
10. When you reboot, you will start this applicatoin as a service.  You can monitor the console using: tail -f /var/log/supervisor/stdout-pointlogger.log.  Verify the service started correctly by typing sudo supervisorctl status. 

Release 1.30.002 of pointlogger.js has several important design changes to limit resource impact in the SmartServer.
1. Monitor objects are modified in a single IAP/MQ message on the rq channel for each device.
2. The updates to monitor objects are paced at 2s.  Previously, there was no pacing to this action which at startup would flood the message bus.
3. The detection of device deletion is tied to the [../cfg] topic for which deletion is assocaited the arrival of an empty message.  This may need to change with future releases because one expects to see messages with the state:"delete" on the [../sts] topic.  

Release 1.30.003 of pointlogger.js includes an option in line 15 that when set to true, will source the timestamp in an import ready raw millisecs from the Jan 1, 1970 datum in GMT.

Release 1.30.004
1. Changed the format of the log file name: [sid]