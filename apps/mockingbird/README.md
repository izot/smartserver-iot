# Mockingbird - LON traffic generator

Mockingbird is a Python script that leverages IAP/MQ protocol to create and control Internal LON devices (ILDs). The script can be utilized for quality assurance purposes of the SmartServer system. In further text, the internal LON devices are called **MBirds** in order to reduce the possibility of confusion with other similar abbreviations.

MBirds have datapoints that reside on the SmartServer itself; in this case, we call this system Mockingbird Host (**MBH**). The MBirds' input datapoints are writable from the LonTalk network, and modifying the output datapoints produces data on the LonTalk network. MBirds can be created and provisioned, and their datapoints can be controlled as if they are actual physical devices. An example use case for this type of mechanism is to create MBirds, provision them on the unit under test (**UUT**), and generate load by modifying the MBirds' datapoints to observe and monitor the behavior under load of the unit under test.

![](./docs/images/mockingbird_diagram.png)



#### Prerequisites

In order for the script to achieve external communication with the SmartServer, <u>MQTT ports (1883 and 8883) must be opened.</u> This can be done using the Features Configuration page on the SmartServer web interface. The <u>SmartServer needs to be a Quad Core</u> (Serial number contains F or higher) <u>and be running 3.64 or later</u>.

To create an internal device, you must first <u>import the corresponding XIF to the SmartServer using the Device Type widget, the CMS REST API, or the DTP loader</u>.  Furthermore, when using IzoT Net Server, the binary version of the resources needs to be added to the Lonworks/types folder.  It is also required that the SmartServer be put into IMM (Independent Management Mode) prior to instantiating internal devices. <u>You can put the SmartServer in the IMM by using the `--imm` flag when running the script for the first time</u>. 

#### Usage

MBird.py script can be used to create MBirds on the Mockingbird host. You can use it to instantiate a number of devices of a specific type and with proprietary handle names. The script can be run locally on the MBH or externally on a PC with access to the MBH network. 

After successful MBird creation, the script will generate .csv and .scr files that can be used for provisioning the devices through the CMS or in the NodeUtil tool. Note that the script will create .csv and .scr files if they don't exist and append the lines to the existing files. To provision newly created MBirds on the UUT, just import the .csv in the CMS, select the devices that appear after importing, and click 'Provision Selected' in the Devices widget. 

The script's help guide can be accessed by running the  `python mbird.py -h` or `python mbird.py --help`

To create MBirds of a specific type and handle use the following command:  

```shell
python mbird.py -t <Target SmartServer IP> --hdl <Devices handle> -n <Number of devices> -x <Device type XIF id> -d <Device type> -i <LON interface> --imm
```

<u>Creational arguments</u> describe how the MBirds will be created.

- `-t` : Target SmartServer IP of the Mockingbird host.  If not supplied, the default is `localhost`.
-  `--hdl` : Base name of the MBirds to be created. Every unique MBird will have the base name and the device number in its name. The format is "name-nr". If the provided device handle is separated with the "-" followed by a number (e.g. , `m-tier2-50`), the MBird creation will start from the provided number and increment `n` times, where `n` is provided in the next argument. If there is more than one dash in the string, then the incrementing occurs after the last dash. For the example with `-n 10` the device handles would be: `m-tier2-50`, `m-tier2-51`, ..., `m-tier2-59`. 
- `-n` : Number of MBirds to be created.  If not supplied, the default is 1.
- `-x` : Device type XIF identifier. If not provided, the script will use the device type specified using `-d` flag. Before that, it will remove any "-x" suffix in the device type string.
- `-d` : Device type name used in the CMS. If not specified, the script will use the provided Device type XIF id in the format "XIF-1". 

<u>Behavioral arguments</u> describe how the MBirds will behave.

- `-i` :  Name of the LON interface on the MBH to use for a subset of MBirds containing the name provided with `--hdl`. Example `lon0`, `lon1`... The default is the internal IP70 interface. Instantiating devices with specified interface and then plugging in the U60 interface probably wont work because the provided interface needs to exist in the first place.
- `-s` : Creates a service pin event until the MBird is provisioned or it times out. The event is triggered for a subset of MBirds.
- `-c` : Enables/disables the subset of MBirds containing the provided base name. Disabling MBirds is effectively the same as turning them physically off from the UUT side. To enable a device, use `-c true`. For disabling use `-c false`,  and for changing their state based on the previous, use `-c toggle`.  
- `--load` : Starts incrementing the `datapoints` specified in the user configuration part of the script. Only the devices containing the base name are affected.   
- `--imm` : Sends a request for switching to Independent Management Mode to target SmartServer. This only needs to be done once; that is when the SmartServer is not in the IMM mode. 



<u>Example:</u>

```shell
python .\mbird.py -t 10.100.40.215 --hdl STest-10 -n 5 -x 9FFFFF0501840460 -d 6kEvbMultiSensor -i lon0 --imm 
```

The example command will request the SmartServer to switch to IMM, then create five devices (`STest-10`, `STest-11`, ..., and `STest-14`) of the EVB type and generate .csv and .scr files. Right after the creation of a single MBird, the script will try to change the MBird's channel from default `/~/-3` to whichever channel the LON interface is connected to. This enables the LON traffic of newly created MBirds to go through user-specified LON interfaces. 

Besides just the creation of MBirds, it's also possible to control them by creating service pin events or enabling/disabling them, which emulates physically turning them on or off. The updating of MBird datapoints is done in a round-robin fashion for every datapoint of every device. The datapoints are incremented until the value of 100, when they are reset to 0. This updating is enabled using the `--load` flag. 

<u>An example</u> of those features is demonstrated with the following command:

```shell
python mbird.py -t <Target SmartServer IP> --hdl EVB -n <Number of devices> -x <Device type XIF id> -d <Device type> -c toggle -s --load
```

This example will first create the devices with the given handle if they don't exist. Based on the specified handle, it will select all of the devices that match the base name (all `EVB-x` devices) and toggle their operational status (`-c toggle`) (available options: `true`, `false` and `toggle`). So, if the MBirds were disabled, they would be enabled, and vice versa. When disabled, from the MBH side, it will seem like the devices are in the unprovisioned state, but from the UUT side, it will seem that the devices are powered off with a health status "down". Control of the device health from within the code is also possible by creating the `dev_state_list` list of tuples within the script containing the exact device handle and the desired device state. Example:  `dev_state_list = [("TI-01", "false"), ("TI-02", "true"), ("TI-03", "toggle")]`.

After changing the operational state of selected MBirds, the script will initiate the service pin event (`-s`) for all of the devices containing the base name. The service pin events will be sent for every MBird until it is provisioned or the process times out. Finally, the script will proceed to update the specified datapoints of an MBird subset in an incrementing fashion (`--load`).

Disabling devices or updating the channel of a subset of existing devices is also possible. By using the `EVB-x` handle, it is possible to specify the start of the subset range, where `x` is the number of the first device. The script detects all of the MBirds with handle `EVB-x` where `x` < `n`,  creates them if they don't exist, or updates them based on new arguments accordingly.   
