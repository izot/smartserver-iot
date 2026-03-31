Group Controller service (smartserver-gc.service)
======
This application provides group control for outdoor lighting systems.  It runs as an internal application to handle Modbus controlled segment power, and broadcast update to OLC devices using either SNVT_switch, SNVT_switch_2, or SNVT_count using an input point (iSchedule (SNVT_switch)) that is controlled using the SmartServer Scheduler. The segment power control has a HAND/OFF/AUTO control, and it will heartbeat a modbus datapoint at a 60s interval.  When the segment power transitions from ON to OFF, it sets the system mode to Offnet.  Best practice is to schedule the segment power 1 minute after the Dusk/Dawn group control commands to OLCs.

Setup
------
You will need an SSH console connection and SCP client to move files to the SmartServer IoT.

1. Use SSH for a console connection an user apollo.
2. Type: `sudo mkdir -p /media/sdcard/apps/gc`
3. Type: `sudo chown -R apollo:apollo /media/sdcard/apps`
4. Move the file `GC2_deploy_1_02_06.zip` to the folder created in step 2.
5. Type: `cd /media/apps/gc`
6. Type: `unzip -o GC2_deploy_1_02_06.zip`
7. Type: `sudo chmod +x setup.sh`
8. Type: `sudo ./setup.sh`

A critical integration step is the setup of GC-1/if/pwr/0.  It is assumed that a modbus device controls power to the OLC circuit. Before integration work begins, the control of the modbus point through this block must be established.  There are issues with the certain versions of the datapoint browser in the CMS the prevent setting cpPoinPath and cpHOA.  Two scripts are installed in /home/apollo to support setup.

`pwrInit.sh` - Requires (3) command line parameters: pointPath: [channel]/if/[BLOCK]/[index]/[DP], ON_level, OFF_level.  These parameter will set `cpPointPath`, `cpOnLevel`, `cpOffLevel`, and will force cpHOA to HAND.

`pwrMode.sh` - Requires 1 command line parameter: AUTO|HAND|OFF (case sensitive) Once you have complete management and configuration of the SmartServer and OLC.  Run this command from ./pwrMode.sh AUTO.  The modbus point targeted by `cpPointPath` will follow the schedule you define for the point `pwr/if/0/iSchedule` (SNVT_count)

Notes
----
1. The setup script needs to be run after re-image and FW updates.
2. Sometimes, you need to reboot the SmartServer to have the GC-1 device self create/provision.  
3. There is a 20s delay baked into the smartserver-gc service. If you manually re-start the service using `ssctl restart gc` you will not return to a shell prompt for just over 20s.
