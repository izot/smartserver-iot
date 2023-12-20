# smartserver-iot
Resources and examples for EnOcean's SmartServer IoT Edge Server and SmartServer Software.  Documentation is available at https://edgedocs.enocean.com.

**apps** – SmartServer application and internal devices.
**localDev** is used to create SmartServer internal devices, which can be used to customize the SmartServer, or used to help map LonWorks to BACnet and Modbus datapoints, or vice versa.
To use localDev, you will need an XIF file with the datapoints you want to support. To use dynamic datapoints for IzoT CT, use the included NM_DynamicC.xif file.

**connectors** – node.js examples that show how to connect to a cloud server.
Azure

**drivers** – example custom drivers.
smartserver-driver-template
See Adding Custom Applications for information on how to create custom drivers.

**node-red** – example Node-RED example flows.
web-connector shows how to do datapoint web binding between two or more SmartServers.
dashboards shows example web flows web pages.
See Node-RED Tutorial for information on how to use the SmartServer Node-RED editor built into the CMS Sequencing widget.

**resources** – example resource files (.xif, .bac, .mod, .eno, .lorawan, and .dtp files).

If you using Honeywell Excell 10 devices, then you may need to use the resource files on Github.
Also includes resource files for other third-party devices.

See the Starter Kit examples for more example resource files.

See Collecting or Creating Device Definitions for information on how to create the resource files.

**starter kit** – Starter Kit examples, including resources file examples for BACnet, Modbus, LON, and Node-RED. 
The SmartServer Starter Kit is a demo-board with BACnet, LON, and Modbus devices that are used to demo and test the SmartServer IoT. 
Includes resources file examples for BACnet, Modbus, LON, and Node-RED.
See the SmartServer IoT Starter Kit User's Guide for additional information on how to setup and use the Starter Kit.

**web pages** – example custom web pages that show how to use the SmartServer REST API and the WebSocket APIs.
NavTree – example web page that allows you to monitor and control edge devices.
Browser web page – example web page that is used to troubleshoot device and SmartServer issues.
See the SmartServer IoT Developer's Guide and IoT Access Protocol (IAP) API Reference for information on how to use the SmartServer REST API and WebSocket APIs.
