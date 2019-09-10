**Point-Montitor**
This folder contains 2 Node.js applications.  
1. **pointmonitor.js**  - Is the source for the example in the documentation.
2. **pointlogger.js** - Builds on the pointmointor, but also stages time series data logs in a transfer director for latte transfer by another service.  

The **pointlogger.js** application implements a basic time series logger that captures time stamped data to a ';' separated CSV file. The data events are processed to extract a subset of the values in the SNVT_trans_table in a compact form ready for import to an upstream data visualization system.  Logs are moved to a transfer folder every 300s for process by another service to push or pull the logs to a backend visualization system.  You are encourged to modify to suit your requirements.

**Installation**
To install this applicaiton on the target
1. Copy the files package.json, and pointlogger.js to a folder /home/apollo/apps/point-logger on your SmartServer IoT
2. Connect by SSH and log in as user apollo
3. Make the folder created in step 1 your current working directory: cd /home/apollo/apps/point-logger
4. Install the application by typing: npm install.
5. Create folders on the sdcard to support the logging and staging for trasfer: sudo mkdir /media/sdcard/eloggerdata
sudo mkdir /media/sdcard/transfer
6. Change onwnership of the directories created: sudo chown apollo:apollo /media/sdcard/eloggerdata
sudo chown apollo:apollo /media/sdcard/transfer.
7. The file point-logger.conf should be copied to /etc/suervisor/conf.d.  
8. Modify the pointlogger.js monitorSpecs[] object array to target the datapoints on the devices you care to log data for considering the monitor object settings to be within reason for your system.  It is best practice to limt the polling to 20% of the channel bandwidth.  On FT-10, this would be about 25 polls per sec.  

If you intend to use the CMS to manage datapoint polling, used the .conf file as supplied which uses the -2 lauch command parameter. A second argument can be used for testing if you want to limit the number of records captured and stanged.
