# Modbus Shadow Lon Device
---
This example uses localDev.exe to create an internal device that is used to shadow Modbus device datapoints as Lon datapoints on an internal device that is managed using IzoT CT.  You need the supporting files in the https://github.com/izot/smartserver-iot/tree/master/apps/localDev to follow these steps as well as files found in this folder.

## Prepare the SmartServer IoT

1. Import the `ApolloDevXML_1_30.zip` resources using the Device Type widget.
2. Import the XIF file `NM_dynamicC.xif` using the Device Type widget.
3. Asssuming you have installed localDev.exe in your `lonWorks/bin` folder, open a Windows command box and run this: `localdev  9000010600828582 dyn-1 192.168.10.201`
4. Assuming you have enabled the IP70 RNI feature and have created an RNI interface in the LonWorks Interfaces 32 control panel applet.  Use this as your network interface when creating a network in IzoT CT.
5. Rename the default channel in IzoT CT to IP70, and set its type to be IP-70.
6. In IzoT CT, create a device based on the `NM_dynamicC.xif` file imported in Step 2.  Name this device `dyn-1`
7. Open the stencil `Modbus Shawdow Dev.vss` and drag the lone mastershape from this stencil on to your drawing.  Select the webServer[0] block.  You could build up from scratch using an empty webServer FB, and dynamic NVs as long as you match the names exactly (`SNVT_count data` types).
   
    ![CT Drawing](./images/Shadow%20Dev%20Example.png)

8.  The file `shawdow4150-con.csv` is connects  the Modbus data points on the device DIO-1 to the Lon points on the webServer block.  What you need to know is the datapoint names on the webServer block have a sufix _nnn where _001 is webServer/0 in the IAP/MQ path.  If you use other webServer FBs to shadow addtional Modbus points, you need to add the connections to the connection file.

If you are using the SmartServer IoT starter kit, the top to switches to the right of the Adam 4150 module are connected to `../DI/0/DI_0` and `../DI/0/DI_1`.  The outputs `../DO/DO_0` and `../DO/DO_1` are hardwired to `1../DI/DO_2` and `../DO/DO_3`.  If the NVs `nviDo0_001` (`nviDo0` in the Datapoint Browser widget) is modified, `../DI/DI_2` will follow.  If `../DI/DI_3` will follow.