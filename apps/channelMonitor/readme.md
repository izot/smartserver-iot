<<<<<<< HEAD
# ChannelMonitor.js - channelMon service
This application monitors the U60 USB interface activity to detect a condition the creates unsustainable traffic on the FT-10 side of the router. This causes monitoring from the IP852 side to fail.  It also tracks the attachment state of the U60 adapter and will force a reboot should it be dropped unexpectedly.  If the lon[n] adaptor is not detected a startup, a reboot will fire as well.   

This FT channel flooding condition was originally discovered on a large site where the SmartServer was configured to use simple un-managed repeating router configuration.  This condition is fully described here: https://cs.diasemi.com/browse/AP-8499.  

The initial deployment uses a xif file (`channelMon.xif`) that enables monitoring a single U60 interface (`lon0`) at 5s intervals.  If excessive packet drops occur in 4 consecutive samples (20s), the Lontalk stack will be shutdown, and restart 150s later.  It is believed that when the failure occurs (5-8 day intervals), that all of the SmartServers in the IP-852 channel are likely to see it and application recovery sequence will insure all SmartServers are silent for a sufficient duration for the looping to cease.  Up to 4 interfaces can be monitored but this requires configuration from the CMS.

The application runs as a service under `supervisorctl` as the service `channelMon`.  The stdout of the `channelMon` service will report the stack restart events (`/var/log/supervisor/channelMon.log`).  More details are also recorded in daily log files stored in the directory: `/media/sdcard/app_logdata`
## Installation
**Take note that in step 5 below you must replace [pwd] to match your SmartServer password.  Otherwise, the install script will fail.** 
1. Use `winscp.exe` or similar scp client to copy the file `channelMonitor-1_9_Delopy.zip` to the folder `/media/sdcard/updates` on your SmartServer.  Do this operation as user root.
2. Using an SSH client application such as `putty.exe` Login as user root.  The password for root should match the apollo user password.
3. Type: `cd /media/sdcard/updates `
4. Type: `unzip -o channelMonitor-1_9_Deploy.zip`
5. Type: `./cmSetup.sh [pwd] [Bridge|Repeater] [update]`

The last paramater of the command in step 5, [update] be included only on SmartServers already running the `channelMon` service. **If you chose the Bridge parameter, you must configure ALL SmartServers on the IP-852 channel to use the same 1-byte domain.**

## Installation Verification
After cmSetup.sh completes allow 5 minute for `channelMon` service startup. `Type: tail -f /var/log/supervisor/channelMon.log`

**You should allow more than 10 minutes for the setup.sh to complete the work**.  After 10 minutes you can connect by SSH and type: `cat /var/log/supervisor/channelMon.log` and you should see output similar to this:
```
root@smartserver-17qam11:/media/sdcard/updates# tail -f  /var/log/supervisor/channelMon.log

[5/1/2022, 9:41:31 AM] - channelMonitor.js - version: 1.00.009
Allowing SIOT processes to initialize.  Sleep for: 240s
[5/1/2022, 9:45:32 AM] - SmartServer SID: 17qam11
chMon-1 - State: deleted - Health: unknown
Creating the internal device: chMon-1 based on PID: 9000010600058518
chMon-1 - State: unprovisioned - Health: suspect
chMon-1 - State: unprovisioned - Health: normal
The device chMon-1 has been created and provisioned.
chMon-1 - State: provisioned - Health: normal
Forcing Bridge configuration
Switching to IMM configuration

cpEnable: 1 on block: 0
[5/1/2022, 9:45:54 AM] - Logged: 1 records
Monitoring: lon0 at: 5 seconds.
cpEnable: 0 on block: 1
cpEnable: 0 on block: 2
cpEnable: 0 on block: 3
chMon-1 - State: provisioned - Health: normal
Forcing Bridge configuration
chMon-1 - State: provisioned - Health: normal
Forcing Bridge configuration
[5/1/2022, 9:45:59 AM] - Logged: 5 records
[5/1/2022, 9:46:04 AM] - Logged: 1 records

```
*You will need to use the IP-852 to update or replace each SmartServer that has had channelMon.js installed.*  
## Crash Data to Capture
If the site locks up, the files: `/var/log/supervisor/channelMon.log` and the to newest file in `/media/sdcard/app_logdata`. You may need to stop the service to move these files off the SmartServer: 

`sudo supervisorctl stop channelMon`

After transferring the files using scp use this command:

`sudo supervisorctl start channelMon`

You can used the files in `/media/sdcard/app_logdata` to track the frequency of stack restart recovery events.
