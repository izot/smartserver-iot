**push-logsFtp.js** 
This application sets up a directory watcher where the arrival of new files initiates a transfers to a configured FTP server.  The module depends on the npm ftp module.  During develepoment of this application I encountered an issue with the ftp module reporting error: read ECONNRESET with each put operation.  https://github.com/mscdex/node-ftp/issues/126 . This error seems to have no bearing on the success of the transfer so this application intentionally surpresses the error.  The dependent modules are not part of this repository.  You will need to run npm install from a command prompt with the logPush folder as the working directory.

You need to do the following to run this application on the SmartServer (npm intstall required to test application on you PC VS code environment):
1. Create a folder /home/apollo/apps/push-logs as user apollo
2. Copy the files push-logsFtp.js, and package.json ./config/default.json to the folder create in step 1.  Besure the file ./config/default.json is copied to preserver the directory config at the same level as push-logsFtp.js.
3. From ssh console as user apollo type: cd ~/apps/push-logs
4. Type: npm install (Note: your SmartServer must have an Internet connection)
5. If you have installed the pointlogger.js application, you should already have create the directory /media/sdcard/transfer on you SmartServer.  This foller must be owned by user apollo.
6. The file ./config/default.json must be modified to target an FTP server you manage.
7. Unit test the application by running it from the directory you have it installed: node push-logsFtp.js.  Verify that with each copy of a file to the folder /media/sdcard/transfer, the file is transfered to your target FTP server.  If you have multiple files in the folder, they will be transfered at startup, and with each transfer, the file will be deleted for the transfer folder.
8. The file pushlog.conf may be used to run as a service under supervisorctl by copying to the folder /etc/supervisor/conf.d and rebooting your smartServer.
9. You and test this application in VS code if you create a 'transfer' folder are the same level as the application.  Files copied to the folder are sent to the server configured in ./config/default.json.

