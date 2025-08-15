Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Local Mode in the Japanese Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EMCSJ - EnOcean Magnet Contact Sensor](#EMCSJ)
-   [EMDCJ - EnOcean Motion Detector With Illumination Sensor](#EMDCJ)
-   [EMSIJ (STM 550J) - EnOcean Multisensor](#EMSIJ)
-   [EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxJ)
-   [EnOcean-JP-lcl-V5.dtp - Consolidated Device Type Package File](#Complete)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  There are individual device type package files for each sensor type, as well as a consolidated dtp file containing all of the device types in a single package file.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EMCSJ"></a>
# EMCSJ - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSJ-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSJ
-   **BACnet Type Mapping File Name:** EMCSJ-V3.btm

<a name="EMDCJ"></a>
# EMDCJ - EnOcean Motion Detector With Illumination Sensor

About this device type package file

-   **File Name:** EMDCJ-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCJ-W-EO
-   **BACnet Type Mapping File Name:** EMDCJ-lcl-V4.btm

<a name="EMSIJ"></a>
# EMSIJ (STM 550J) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550J-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550J
-   **BACnet Type Mapping File Name:** STM550J-lcl-V4.btm

<a name="EOSxJ"></a>
# EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCJ-W-EO,EOSWJ-W-EO
-   **BACnet Type Mapping File Name:** EOSxJ-V2.btm

<a name="Complete"></a>
# EnOcean-JP-lcl-V5.dtp - Consolidated Device Type Package File

The EnOcean-JP-lcl-V5.dtp file is a consolidated device type package file that includes the device type contents for all of the individual EnOcean sensor and switch devices in this collection.  Note that this does not include the btm files, which should be imported into the SmartServer IoT separately if desired for a given application.

About this device type package file

-   **File Name:** EnOcean-JP-lcl-V5.dtp
