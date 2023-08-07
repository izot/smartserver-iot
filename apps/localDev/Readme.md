# localDev.exe
---
This application creates a lon.attach:'local' internal device on the SmartServer IoT.  This application anchors the workflow where you use IzoT CT to implement internal an device for bound connections to the SmartServer IoT.  The file NM_DyanamcC.xif, and the XML reoources (ApolloDevXml_1_30.zip) need to import using the CMS Device Type Widget.  

The binary version of the resources need to be added to you Lonworks/types folder so Net Server has acess to the types.  

The application is written using node.js, but is packaged as as windows executable using the nexe NPM package.  The applicion requires 3 arguments:

1. PID of the XIF file.  For NM_Dynamic.xif, the PID is 9000010600828582.
2. The IAP device handle.  Use an alpha prefix.   'dyn-1' is an example.
3. The IP address of the target SmartServer IoT.

Here is an example: ``` localdev  9000010600828582 dyn-1 192.168.10.201```

The result will show the device 'dyn-1' in the CMS device widget.  With the SmartServer set to IMM mode, you can create a device in IzoT CT based on the NM_DynamicC.XIF file, and provision in CT by determininining the UID from the Device Widget, or by pressig the physical service pin of the SmartServer, or pressing the Service/Connect button from the Lon tab of the Configuration Web UI.  

The interface of NM_DynamicC.xif has 64 empty web server functional blocks that are used to add dynamic network variables the can be used for peer connections.

## Multiple Device Create
Release 1.00.003 added support to create multiple internal devices.  Now you have two additional command line parameters.  $4 is the number of devices to create, $5 is the device template to apply to the CMS compatible device import file.  Here is an example:

```localdev 800001230E041005 LC 192.168.10.201 50 CPD_Sim```

The command parameters above will create 50 local devices based on the XIF with PID `800001230E041005` and they will be assigned handles LC-01 to LC-50.  A CSV device import file will be created (`simDevices.csv`).  Priro to 3.60, you need to modify the `ownerMAC` field of each device to match the target SmartServer that you plan to import the file to.  

A nodeutil script file (`nuDevices.scr`) is also created by `localDev.exe` when you are doing a multiple device create.

Release 1.00.004: Fixed issue with the header of the devices file

Release 1.00.005: Blocks of devices are created but not provisioned.  Creates better support for Lon device simulations.