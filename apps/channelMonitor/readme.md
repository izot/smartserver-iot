# ChannelMonitor.js - channelMon service
This application monitors the U60/U70 USB interface activity to detect a condition the creates unsustainable traffic on the FT-10 side of the router. This causes monitoring from the IP852 side to fail.  It also tracks the attachment state of the U60/U70 adapter and will force a reboot should it be dropped unexpectedly.  If the lon[n] adaptor is not detected a startup, a reboot will fire as well.  

Release 1.00.012 of adds support to schedule a reboot, or Lon Stack restart at a configured daily interval in the range of 60 - 1439 minutes after midnight.  Restarts in from 00:00-01:00 are excluded to permit time for log maintenance.

This FT channel flooding condition was originally discovered on a large site where the SmartServer was configured to use simple un-managed repeating router configuration.  This condition is fully described here: https://cs.diasemi.com/browse/AP-8499.  

The initial deployment uses a xif file (`channelMon.xif`) that enables monitoring a single U60 interface (`lon0`) at 5s intervals.  If excessive packet drops occur in 4 consecutive samples (20s), the Lontalk stack will be shutdown, and restart 150s later.  It is believed that when the failure occurs (5-8 day intervals), that all of the SmartServers in the IP-852 channel are likely to see it and application recovery sequence will insure all SmartServers are silent for a sufficient duration for the looping to cease.  Up to 4 interfaces can be monitored but this requires configuration from the CMS.

The application runs as a service under `supervisorctl` as the service `channelMon`.  The stdout of the `channelMon` service will report the stack restart events (`/var/log/supervisor/channelMon.log`).  More details are also recorded in daily log files stored in the directory: `/media/sdcard/app_logdata`
## Installation

1. Extract all the file `channelMontitor-1_14_Deploy.zip` to a folder on your PC.
2. In the CMS, Import the file `ApolloDevXMP_1_38.zip` using the device Widget.
2. In the CMS, Import the file `channelMon.zip` into the device Widget.  Verify the device type `channelMonitor` is shown in the device widget.
3. Use `winscp.exe` or similar scp client to copy the file files: `cmSetup.sh`, and  `channelMonitorPagage.zip` to the folder `/media/sdcard/updates` on your SmartServer.  **Do this operation as user root.**
4. Using an SSH client application such as `putty.exe` Login as user root.  The password for root should match the apollo user password.
5. Type: `cd /media/sdcard/updates `
6. Type: `chmod 755 cmSetup.sh`
8. Type: `./cmSetup.sh [B|R|C] [0-1439] [0|1]` The first parameter defines the mode for IP852 routing. B for bride, R for repeater, C for configured (IMM managed) the last two parameters are optional for setting a scheduled restart time 0 disables, 60-1439 minutes after midnight valid.  The last parameter: 0 - means full reboot, and 1 causes a Lon stack restart.
**If you chose the Bridge parameter, you must configure ALL SmartServers on the IP-852 channel to use the same 1-byte domain.** 
 
## Common cmSetup Parameter Examples 
`./cmSetup.sh` - With no parameters, this will simply monitor the interface works for DMM and IMM systems.
`./cmSetup.sh R 120 0`  This will is used for DMM mananged systems and at 2:00AM will restart the SmartServer.
`./cmSetup.sh R 120 1`  This will work as the previous example, but only restart the Lon Stack.  Less intrucive than a reboot. 

## Installation Verification
After cmSetup.sh completes.  Type: `tail -f /var/log/supervisor/channelMon.log`

After roughly 4 minutes you can connect by SSH and type: `cat /var/log/supervisor/channelMon.log` and you should see output similar to this:
```
[5/23/2022, 3:09:27 PM] - channelMonitor.js - version: 1.00.014
Process platform: linux
Delay Start: true, 240
Router Mode: 1
Reboot/restart: 90
Allowing SIOT processes to initialize.  Sleep for: 240s
Setting timeout of restart in: 36992 seconds
Using reboot mode
[5/23/2022, 3:13:28 PM] - SmartServer SID: 17qei61
chMon-1 - State: provisioned - Health: normal
Forcing Bridge configuration
Switching to IMM configuration
Trying to verify IP852 setup...
cpEnable: 1 on block: 0
[5/23/2022, 3:13:28 PM] - Logged: 1 records
Monitoring: lon0 at: 5 seconds.
cpEnable: 0 on block: 1
cpEnable: 0 on block: 2
cpEnable: 0 on block: 3
[5/23/2022, 3:13:28 PM] NearSide IP852 Domain: 11 - routerMode: Repeater
[5/23/2022, 3:13:31 PM] NearSide IP852 Domain: 11 - routerMode: Bridge
[5/23/2022, 3:13:33 PM] - Logged: 5 records
[5/23/2022, 3:13:38 PM] - Logged: 1 records
[5/23/2022, 3:13:48 PM] - Logged: 1 records
```
*You will need to use the IP-852 Configuration server to update or replace each SmartServer that has had channelMon.js installed.*  

## Steps in the CMS
The channelMon service auto creates the internal device chMon-1.  This device as four function blocks to monitor up to four attached adapters.  You need to confirm the `lon[n]` applied to the adapter in your SmartServer using the ifconfig from the SSH prompt, or reviewing the Configuration UI LON tab to see the interface enumerations in the RNI Configuration table.  Once knon, use the CMS datapoint browser to set the `cpInterface` name to exactly match (use lower case).  Once you are sure is is correct, set the `cpEnable` to 1.  If you get it wrong, the smartServer will reboot. If you made a mistake, your SmartServer will reboot on a 4 minute cycle.  You can break the cycle by connecting by SSH, and typing: `sudo supervisorctl stop channelMon`  Once you can access the CMS, you can fix the name and restart the service with this command: `sudo supervisorctl restart channelMon`  When the `cpEnable` is set to 0, USB supervision will cease.

## Crash Data to Capture
If the site locks up, the files: `/var/log/supervisor/channelMon.log` and the to newest file in `/media/sdcard/app_logdata`. You may need to stop the service to move these files off the SmartServer: 

`sudo supervisorctl stop channelMon`

After transferring the files using scp use this command:

`sudo supervisorctl start channelMon`

You can use the files in `/media/sdcard/app_logdata` to track the frequency of stack restart recovery events.

## ChannelMonitor System Management
The channelMonitor application supports self managed Bridge routing.  To persist this routing mode, the channelMon service will set the routing mode and force the system to operate in IMM mode.  This can create some difficulty if you intend to move the SmartServer to a different self-managed repeater system that may be configured on a different domain. Remember that to operate the SmartServer as a bridge, you must first configure all SmartServers participating in the IP-852 channel to be on the same 1-byte domain.  To manage the reconfiguration of the domain again, you need to follow this sequence:

1. In an SSH session as user root type: `channelMon-ctl disable`
2. In the CMS, select the segment controller, and set to DMM mode.
3. In the CMS device widget, remove the `cmMon-1` device.
4. Use the SmartServer configuration UI Lon tab to set the 1-byte domain.
5. In an SSH session as user root type: `channelMon-ctl enable [r|b|c] [0-1439] [0|1]` 
   A few notes: option `r` will operate as a standard un-managed repeater. Option `b` will set the routing to Bridge mode, and then set the SmartServer to IMM mode.  Option `c` is used if you plan to use the SmartServer in a IzoT CT managed network where the you are responsible for managing the transition to IMM mode using the CMS.
6. Also note that by setting the third parameter in the channelMon-ctl to be 0, the channelMon service will not schedule a daily reboot.  It may initiate reboots or Lon stack restarts when certain failure conditions are detected.     

Take note that the channelMon service will take 4 minutes before it actively monitors the operation of the USB interface.  The delay occurs at system startup, or whenever the service is restarted using `supervisorctl` or `channelMon-ctl`. 
