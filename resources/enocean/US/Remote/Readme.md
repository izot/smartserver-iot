Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Remote Mode
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EMDCU - EnOcean Motion Detector With Illumination Sensor](#EMDCU)
-   [EMSIU (STM 550) - EnOcean Multisensor](#EMSIU)
-   [EOSxU - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxU)
-   [ETHSU - EnOcean Temperature and Humidity Sensor](#ETHSU)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  These files are designed for use with the EnOcean driver operating in remote mode.  There are individual device type package files for each sensor type.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EMDCU"></a>
# EMDCU - EnOcean Motion Detector With Illumination Sensor

About this device type package file

-   **File Name:** EMDCU-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCU-W-EO
-   **BACnet Type Mapping File Name:** EMDCU-rem-V1.btm

<a name="EMSIU"></a>
# EMSIU (STM 550) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550U
-   **BACnet Type Mapping File Name:** STM550-rem-V1.btm

<a name="EOSxU"></a>
# EOSxU - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxU-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCU-W-EO, EOSWU-W-EO, EOSHU
-   **BACnet Type Mapping File Name:** EOSxU-rem-V1.btm

<a name="ETHSU"></a>
# EnOcean Temperature and Humidity Sensor

About this device type package file

-   **File Name:** ETHSU-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSU
-   **BACnet Type Mapping File Name:** ETHSU-rem-V1.btm
