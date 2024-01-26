Readme - CCS WattNode MODBUS, Device Type Package File and BACnet Type Mapping File
===
---

# Table of Contents

-   [Overview](#Overview)
-   [WNC-3X-XXX-MB - WattNode MODBUS](#WattNodeMB)

<a name="Overview"></a>
# Overview

This device type package (dtp) file for the SmartServer IoT supports all seven models of the Continental Control Systems LLC WNC (third generation) WattNode MODBUS devices.  These submeters are MODBUS RTU devices available in models that support single-phase, three-phase wye, and three-phase delta configurations in voltages from 120 VAC to 600 VAC at 50 and 60 Hz.  Continental Controls has released a new, fourth generation model (WND), which appears to use a superset of these same MODBUS registers for basic compatibility, however no testing has been done using this package file with the fourth generation WND device.  For details concerning the individual registers provided in this package file, refer to the Installation and Operation Manual available from CCS.  The device type file 'WNC-3X-XXX-MB.mod' contained within the package file also includes a data point definition for the device's 'Model' register with a default Marker Value, which allows the SmartServer to support discovering these devices.  By default, this Marker Value for the Model register is set to '201', allowing it to discover the WNC-3Y-208-MB model.  In order to support discovery for one of the other available models, this Marker Value would need to be modified.  The appropriate Marker Values are listed below in parenthesis with each supported device model number.  In addition, a BACnet type mapping (btm) file is available to support applications where the SmartServer IoT is being used to publish WattNode submeter data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.

<a name="WattNodeMB"></a>
# WNC-3X-XXX-MB - WattNode MODBUS

About this device type package file

-   **File Name:** WNC-3X-XXX-MB.dtp
-   **Manufacturer:** Continental Control Systems LLC
-   **Device Model Numbers:** WNC-3Y-208-MB (201) WNC-3Y-400-MB (202), WNC-3Y-480-MB (203), WNC-3Y-600-MB (204), WNC-3D-240-MB (205), WNC-3D-400-MB (206), WNC-3D-480-MB (207)

-   **BACnet Type Mapping File Name:** WNC-3X-XXX-MB.btm
