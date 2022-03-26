# logops.js
This service logs internal device output datapoint values that schedule operation of equipment in the system using bound network variable connections define using IzoT CT.  By definition, these outputs are low frequency when controlled by the SmartServer scheduler.  Operations log files older that 12 months are deleted.

Best results are achieved by naming the dynamic network to represent a compact equipment tagging convention.  For example `RTU_1o`, `AHU1o`, `AC_01o`. This naming convention differs from the nvo prefix convention common to Lon devices.  The 'o' suffix is key to manage the presentation of variable the datapoint names in IAP/MQ.  Names must be limited to 11 characters to accommodate the name function block `_nnn` suffix to support FB arrays.

Using this service requires a workflow that includes IzoT CT and the `NM_dynamicC.xif` file to define a dynamic interface to suit the project.  Creating the internal device that hosts the `NM_dynamicC.xif` is accomplished using `localDev.exe`: (https://github.com/izot/smartserver-iot/tree/master/apps/localDev) 

Log files are stored in the folder /media/sdcard/logops/.  Files are Named `MM_YYYY logOps.csv`.  A new Log file is created on first day of the month.  Files older that 12 months age out and are deleted.

## Setup
1. Copy the files `logopsPackage.zip` and `setup.sh` to the root of a USB thumb drive.
2. Plug the USB drive into an available port on the SmartServer.
3. Use `putty.exe` to SSH login as user root to the SmartServer.
4. Type: `cd /media/usb0`
5. Type: `./setup.sh`
6. Reboot your SmartServer.

After reboot, you can confirm the installation of the service by looking for the service `logops` in listed when you type: `sudo supervisorctl` in a SSH console.  

## Notes
This application also sets the heartbeat value for all webServer output network variables.  Here is an example command line to set the heartbeats to 140s (first do: `cd /var/apollo/data/apps/logops`): `node logopsjs 140`. 

Heartbeat setting is generally a one and done operation.  You only need to set if a dynamic output network variable is added to a webServer.  This application does not prevent you from setting the heartbeat to an unreasonable value.  Here are the best practice bullets:
- Restrict the heartbeat value to generate less than one update/second
- Use a heartbeat that is less than 1/2 the scheduled device receive timeout.
- Systems not using receive timeouts also need heartbeats.  Consider a 120s heartbeat to support power blips on the edge network.

Here is an example of setting the heartbeat to 140s for a system with edge devices using a 300s receive timeout.  
`node logops.js 140` 

The application supports command line arguments to override default parameters.

`arg[0]` - Heartbeat (default: 0).  A non-zero value causes the application to only set the heartbeat for the webserver outputs.

`arg[1]` - Used to target a different handle for the internal device (default: 'dyn-1')

`arg[2]` - Used to override the IP address of the target smartServer (Default: 127.0.0.1 - loopback address)

The command line parsing uses simple positional parsing.  If you are overriding the handle )`arg[1]`), you must provide an `arg[0]` with `arg[2]`. Consider the case of using a different device handle (`d2`) for the internal device.  You would need to modify the file `/etc/supervisor/conf.d/logops.conf` to add these parameter to line 5: `0 d2`

