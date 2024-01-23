# localDev.exe
---
This application creates one or more internal LON devices on the SmartServer IoT.  Internal LON devices have datapoints that reside on the SmartServer itself.  So, the internal device’s input datapoints are writable from the LonTalk network and the output datapoints produce data on the LonTalk network.  An example use case for this type of device is to use IzoT CT to bind an output datapoint on an edge device to an input datapoint on the SmartServer.  That input datapoint can be used then for monitoring, logging, alarming, etc.  You can also implement custom services to process datapoints on an internal device such as reacting to changes to input values or modifying output values that are bound externally.

To create an internal device, you must first import the corresponding XIF to the SmartServer using the Device Type widget, the CMS REST API or the DTP loader.  Furthermore, when using IzoT Net Server with the SmartServer, the binary version of the resources need to be added to your Lonworks/types folder.  It is also required that the SmartServer be put into IMM mode prior to instantiating internal devices with localDev.exe. It is also required that the MQTT ports (1883 and 8883) be opened via the Features Configuration page. Finally, the SmartServer needs to be a Quad Core (Serial number contains F or higher) and be running 3.64 or later.

localDev.exe is written using node.js, but is packaged as a Windows executable using the nexe NPM package.  The application takes 5 arguments like so:

1. PID of the XIF file.  
2. The IAP device handle.  When creating one device, this is the full handle (e.g., ‘mydev’).  When creating multiple devices, this is the handle prefix which will be appended with “-<instance>”.  So, if you create 3 devices and this handle is ‘mydev’, you will end up with mydev-01, mydev-02 and mydev-03.
3. The IP address of the target SmartServer IoT.
4. The number of devices to create.
5. The name of the device type that was created on the SmartServer IoT.

Note that internal devices are created by specifying “lon.attach:'local'” in the IAP/MQ request to create the device.

The program creates a file called simDevices.csv that can be used to import the created devices into a SmartServer CMS.  It also creates a file called nuDevices.scr that can be used to import the devices into NodeUtil.  

NM_DynamicC Example

Creating a device with the type NM_DynamicC is an example use of localDev.exe.  The interface of NM_DynamicC.xif has 64 empty web server functional blocks that are used to add dynamic network variables that can be used for peer connections.  The file NM_DyanamcC.xif, and the XML resources (ApolloDevXml_1_30.zip) need to be imported before creating this device.

Here is an example invocation: 

localDev 9000010600828582 dyn-1 192.168.10.201 1 NM_DynamicC-1

The result will be the device 'dyn-1' in the CMS device widget of the target SmartServer.  Once this is instantiated, you can create a device in IzoT CT based on the NM_DynamicC.XIF file, and provision it in CT by determining the UID from the Devices widget, or by pressing the service pin of the SmartServer, or by pressing the Service/Connect button in the LON tab of the Configuration pages.  



