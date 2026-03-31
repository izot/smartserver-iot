gc2.js
=======

Overview
--------
`gc2.js` implements a simple Group Controller (GC) service for 16 lighting groups. It integrates with the smartServer/GLP messaging system via MQTT.  It also includes a function block (pwr) that provides direct control of a modbus datapoint with a 60s heartbeat:

- Output control points (oDimVal (SNVT_switch), oDimSw2val (SNVT_switch_2), oLevelCnt (SNVT_count)) for up to 16 groups
- iSchedule input is driven by the SmartServer Scheduler
- A segment power controller that maps HOA (Auto/Hand/Off) to output levels to a modbus device.
- Heartbeat propagation configuration for outputs

This README explains how to run, debug, and operate `gc2.js` on a remote Ubuntu-based SmartServer IoT node.

Prerequisites
-------------
- Node.js (recommended stable LTS, 14+ or compatible version used by your system)
- An MQTT broker reachable by the app (default broker in file when not on Apollo is mqtt://192.168.10.201)
- Appropriate filesystem layout (the script expects to run in the device deployment folder and interact with smartServer services)

Quick start (local/interactive)
-------------------------------
1. This application is installed in /var/apollo/data/apps/gc.
2. The application was tested against globally installed npm packages mqtt@15.13.1, lodash@4.21.21
3. Run the application with Node
   node ./gc2.js [hb override] - [hb override] changes the hb rate used for gc outputs
4. Observe console logs for startup activity. The script prints `Start` and a banner including the version.

Configuration options
---------------------
- `defaultHeartbeat` (300s) can be overridden by passing a single numeric argument to the script: `node gc2.js 60` (sets heartbeat to 60s)
- The script auto-detects if it runs on the SmartServer (process.platform == 'linux' and environment). Adjust `mqttBroker` in the file if you want a different broker.

Running under systemd (example)
-------------------------------
In practice, gc2.js runs as a service under systemd. The setup.sh script will install `/etc/systemd/system/smartserver-gc.service`

Logs: the script logs progress using `console.log`. Watch `journalctl -xfu smartserver-gc` if running under systemd.

The following modification in smartserver-gc.service to change the group controllers to use a 100s heartbeat `/etc/systemd/system/smartserver-gc.service`

`ExecStart=/usr/bin/node --max_old_space_size=250 /var/apollo/data/apps/gc/gc2.js 100`

Integration Notes
-----------------
The function block gc includes an input: iSchedule (SNVT_switch).  This point is managed by the SmartServer Scheduler.  At restart, the group controller will restart the SmartServer Scheduler, to initialize the iSchedule input to the current scheduled value.  This will propagate the value on all 3 gc outputs.  The outputs run with a 300s heartbeat:
 
 - oDimVal (SNVT_switch) direct copy.
 - oDimSw2 (SNVT_switch_2) Mode SW_SET_LEVEL and the value field of iSchedule.
 - oLevelCnt (SNVT_count) The value filed of iSchedule.

Function block pwr
-----------------
This function block manages segment power controlled by a modbus datapoint.  It is schedules apply segment power from Sunset to Sunrise.  It implements the a 60s heartbeat directly to the datapoint without involving the connection manager. 

Common issues and troubleshooting
---------------------------------
- No console output at all: ensure the service is running.  `ssctl status` If Node is exiting early with no logs, inspect the first lines for errors (try running interactively to catch stack traces).
- Missing npm modules: install `mqtt` and `lodash` locally or globally depending on how you run the script.
- Differences between development machine (Windows) and the Apollo appliance (Linux): the script runs OS-specific checks (process.platform and environment), so some code paths only run on the appliance.


Contact / Author
----------------
For maintainers and detailed operational questions, consult the system owner or the EnOcean Edge dev team who maintains this repository.

License
-------
The original file header includes an MIT-like permission block: include it when redistributing.
