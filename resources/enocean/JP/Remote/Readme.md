Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Remote Mode in the Japanese Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EMCSJ - EnOcean Magnet Contact Sensor](#EMCSJ)
-   [EMDCJ - EnOcean Motion Detector With Illumination Sensor](#EMDCJ)
-   [EMSIJ (STM 550J) - EnOcean Multisensor](#EMSIJ)
-   [EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxJ)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  These files are designed for use with the EnOcean driver operating in remote mode.  There are individual device type package files for each sensor type. In addition, there are BACnet type mapping (btm) files for each of the sensor types bundled into the package files to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EMCSJ"></a>
# EMCSJ - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSJ-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSJ
-   **BACnet Type Mapping File Name:** EMCSJ-rem-V2.btm (bundled in the package file)

<a name="EMDCJ"></a>
# EMDCJ - EnOcean Motion Detector With Illumination Sensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EMDCJ-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCJ-W-EO
-   **BACnet Type Mapping File Name:** EMDCJ-rem-V3.btm (bundled in the package file)

<a name="EMSIJ"></a>
# EMSIJ (STM 550J) - EnOcean Multisensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** STM550J-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550
-   **BACnet Type Mapping File Name:** STM550J-rem-V3.btm (bundled in the package file)

<a name="EOSxJ"></a>
# EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.  Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EOSxJ-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCA-W-EO, EOSWA-W-EO, EOSHA
-   **BACnet Type Mapping File Name:** EOSxJ-rem-V2.btm
