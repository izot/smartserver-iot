# cfgReplace
---
This service monitors the status of rq/dev/lon/# to detect do {"action":"replace"} and {"action":"provision"} messages and after the sts reflects the action has completed with the reflection of the replacemnent UID, the service will write any property values as reported in the iap ../fb channel.  This better models the behavior that exists for devices managed using IzoT CT.

## Setup
1. Copy the files `cfgReplacePackage.zip` and `setup.sh` to the root of a USB thumb drive.
2. Plug the USB drive into an available port on the SmartServer.
3. SSH Login a user root to the SmartServer.
4. Type: `cd /media/usb0`
5. Type: `./setup.sh`
6. Reboot your SmartServer.

After reboot, you can confirm the installation of the service by looking for the service cfgReplace in listed when you type: `sudo supervisorctl` in a SSH console.  

You can monitor the the operation of this service using this console command: `tail -f /var/log/supervisor/cfgReplace.log`  Here is an example of the log file entries:
```
[11/9/2021, 5:32:27 PM] - cfgReplace.js - version: 1.00.001
[11/9/2021, 5:32:32 PM] - SmartServer SID: 17qei61
[11/9/2021, 5:51:32 PM] - Replace Request: glp/0/17qei61/rq/dev/lon/1/do : {"action":"replace","args":{"unid":"00D071150982"}}
[11/9/2021, 5:51:33 PM] - Replace or provision complete, push CP values
[11/9/2021, 5:51:35 PM] - 10 properties from 9 function blocks sent to device: glp/0/17qei61/fb/dev/lon/1
```
