# Modbus Shadow Lon Device
---
This example uses `localDev.exe` to create an internal device that is used to shadow Modbus device datapoints as Lon datapoints on an internal device that is managed using IzoT CT.  You need the supporting files in the https://github.com/izot/smartserver-iot/tree/master/apps/localDev to follow these steps as well as files found in this folder.  

Before starting you need to understand a limitation of this solution.  All datapoints in a Modbus or BACnet interface file must be assigned to the `if/device/0` functional block.  The example used in this `Readme.md` document targets the Advantec Adam-4150 Digital Input/ouput device.  The orginal .mod file assigned the Digital Inputs to the `if/DI/0`, and the digital output points to `if/DO/0` which violates the limitaion mentioned here.  You will find a package that is suitable for this solution here: https://github.com/izot/smartserver-iot/blob/master/Starter%20Kit/Modbus%20RTU%20Channel/Adam-4150v20-Flat.dtp  

## Prepare the SmartServer IoT

1. Import the `ApolloDevXML_1_30.zip` resources using the Device Type widget. You need to do this once and the file resources will survive a `System.Reset to Default.Reset Databases` but not a re-image, or `System.Restore Factory Settings`
2. Import the XIF file `NM_dynamicC.xif` using the Device Type widget.
3. Asssuming you have installed `localDev.exe` in your `lonWorks/bin` folder, open a Windows command box and run this: `localdev  9000010600828582 dyn-1 192.168.10.201`.  The frist argument is the PID of the `NM_dynamicC.xif`.  The second argument (`dyn-1`) is the device handle/name that will by used for the internal Lon device.  This device will appear in the Devices widget in the CMS.
4. In the CMS device widget, set your SmartServer to be in IMM mode.
5. Assuming you have enabled the IP70 RNI feature and have created an RNI interface in the LonWorks Interfaces 32 control panel applet.  Use this as your network interface when creating a network in IzoT CT.
6. Rename the default channel in IzoT CT to IP70, and set its type to be IP-70.
7. In IzoT CT, create a subsystem that will hold the shadow interface devices.
8. In IzoT CT, inside the subsystem creaed in step 7, create a device based on the `NM_dynamicC.xif` file imported to the CMS in Step 2.  Name this device `dyn-1`.  The exact match for the localDev device created in step 4 above.
9. Open the stencil `Modbus Shawdow Dev.vss` and drag the lone mastershape from this stencil on to your drawing.  Select the webServer[0] block.  You could build up from scratch using an empty webServer FB, and dynamic NVs as long as you match the names exactly (`SNVT_count data` types). This FB name must be an exact match for the Modbus device that is to be shadowed
   
    ![CT Drawing](./images/Shadow%20Dev%20Example.png)

10. The file `shadowConnect.exe` is utility that automates the generation of a connection file to connect the Modbus points to the shadowed Lon data points.  Copy this file to your `../Lonworks/bin folder`. To work you must.
   - Name the webServer FB to exactly match the name of the Modbus device.
   - The Modbus interface is flat with all points under `../if/device/0`.
   - All Inputs and outputs have names that are limited to 12 characters.
11. While in the subsystem created in step 7 above, right-click on the drawing sheet and launch the `Echelon XML Subsystem Report` plug-in.

![Plug-in Launch](images/Subsytem%20Report.png)

12. Use the settings shown here:

![XML Subsystem Report](images/XML%20Report%20Settings.png)

13. In this step, the connection file will be generated using `shadowConnect.exe`.  Use Windows explorer to navigate to the folder where the export file is saved and type `cmd` in the address bar to open a command box.
14. Type `shadowConnect [XML Export filname] [internal device]`.  Here is an example:
 `shadowConnect Export.xml dyn-1`.  The result will be a file: `shadowConnect.csv`
15. Import this file using the Device Type widget in the CMS.

The steps above create the point-point connections to have a Lon device shadow a Modbus device.  To work correctly, there must be datapoint properties to define polling for all Modbus points being shadowed.       

![Connection File](images/CSV%20Result.png) 


