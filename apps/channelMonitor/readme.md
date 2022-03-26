# ChannelMon.js
This application monitors the USB interface activity to detect a condition the creates unsustainable traffic on the FT-10 side of the router that causes monitoring from the IP852 side to fail.  This condition has occurred in large sites where the SmartServer is configured to use simple repeating router configuration without explicit network management by an tool such as IzoT CT.  This condition is fully described here: https://cs.diasemi.com/browse/AP-8499.  The first release is 1.00.005. 

The initial deployment uses a xif file (`channelMon.xif`) that enables monitoring a single U60 interface (`lon0`) at 5s intervals.  If excessive packet drops occur in 6 consecutive samples (30s), the Lontalk stack will be shutdown, and restart 150s later.  It is believed that when the failure occurs (5-8 day intervals), that all of the SmartServers in the IP-852 channel are likely to see it and application recovery sequence will insure all of the SmartServers are silent for a sufficient duration for the looping to cease.  Up to 4 interfaces can be monitored but this requires configuration from the CMS.

The application runs as a service under supervisorctl as the service `channelMon`.  The stdout of the channelMon will report the stack restart events (`/var/log/supervisor/channelMon.log`).  More details are also record in daily log files stored in the directory: `/media/sdcard/app_logdata`
## Installation
1. Copy the files `channelMonitorDelopy.zip` to the folder `/media/sdcard/updates`.  You will need to login as user root with an scp client.
2. Using an SSH client application such as `putty.exe` Login as user root.  The password for root should match the apollo user password.
3. Type: `cd /media/sdcard/updates `
4. Type: `unzip channelMonitorDeploy.zip`
5. Type: `chmod 755 setup.sh` so linux treats this file as executable.
6. Type: `nohup ./setup.sh [pwd] &>/dev/null &`

The command in step 6 allows you to end the SSH terminal session while the channelMonitorPackage installs.  You can repeat the steps 1-6 on other SmartServers in your system and return 10 minutes later to confirm the service has been installed.  **If your running firmware version 3.30 or higher, you will need to allow 30 minutes.**
## Installation Verification

**You should allow more than 10 minutes for the setup.sh to complete the work**.  After 10 minutes you can connect by SSH and type: `cat /var/log/supervisor/channelMon.log` and you should see output similar to this:
```
[3/26/2022, 9:08:52 AM] - channelMonitor.js - version: 1.00.005
Allowing SIOT processes to initialize.  Sleep for: 240s
[3/26/2022, 9:12:54 AM] - SmartServer SID: 17qevsa
Creating the internal device: chMon-1 based on PID: 9000010600058518
chMon-1 - State: unprovisioned - Health: suspect
chMon-1 - State: unprovisioned - Health: normal
The device chMon-1 has been created and provisioned.
chMon-1 - State: provisioned - Health: normal
cpEnable: 1 on block: 0
[3/26/2022, 9:13:15 AM] - Logged: 1 records
Monitoring: lon0 at: 5 seconds.
cpEnable: 0 on block: 1
cpEnable: 0 on block: 2
cpEnable: 0 on block: 3
chMon-1 - State: provisioned - Health: normal
[3/26/2022, 9:13:20 AM] - Logged: 5 records
[3/26/2022, 9:13:25 AM] - Logged: 1 records
```
*You will need to use the IP-852 to update or replace each SmartServer that has had channelMon.js installed.*  
## Crash Data to Capture
If the site locks up, the files: `/var/log/supervisor/channelMon.log` and the to newest file in `/media/sdcard/app_logdata`. You may need to stop the service to move these files off the SmartServer: 

`sudo supervisorctl stop channelMon`

After transferring the files using scp use this command:

`sudo supervisorctl start channelMon`

You can used the files in `/media/sdcard/app_logdata` to track the frequency of stack restart recovery events.