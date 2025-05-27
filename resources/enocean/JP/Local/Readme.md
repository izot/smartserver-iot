Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Japanese Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EKCSJ - EnOcean Key Card Switch](#EKCSJ)
-   [ELLSJ - EnOcean Light Level Sensor](#ELLSJ)
-   [EMCSJ - EnOcean Magnet Contact Sensor](#EMCSJ)
-   [EMDCJ - EnOcean Motion Detector With Illumination Sensor](#EMDCJ)
-   [EMSIJ (STM 550) - EnOcean Multisensor](#EMSIJ)
-   [EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxJ)
-   [EPACJ - EnOcean People Activity Counter](#EPACJ)
-   [ETHSJ - EnOcean Temperature and Humidity Sensor](#ETHSJ)
-   [EDRPJ - EnOcean Double Rocker Pad](#EDRPJ)
-   [ESRPJ - EnOcean Single Rocker Pad](#ESRPJ)
-   [EnOcean-JP-V4.dtp - Consolidated Device Type Package File](#Complete)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  There are individual device type package files for each sensor type, as well as a consolidated dtp file containing all of the device types in a single package file.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EKCSJ"></a>
# EKCSJ - EnOcean Key Card Switch

About this device type package file

-   **File Name:** EKCSJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-04-02
-   **Device Model Number:** EKCSJ-W-EO
-   **BACnet Type Mapping File Name:** EKCSJ-V2.btm

<a name="ELLSJ"></a>
# ELLSJ - EnOcean Light Level Sensor

About this device type package file

-   **File Name:** ELLSJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-06-02
-   **Device Model Number:** ELLSJ-W-EO
-   **BACnet Type Mapping File Name:** ELLSJ-V2.btm

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

-   **File Name:** EMDCJ-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCJ-W-EO
-   **BACnet Type Mapping File Name:** EMDCJ-V3.btm

<a name="EMSIJ"></a>
# EMSIJ (STM 550J) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550J-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550J
-   **BACnet Type Mapping File Name:** STM550J-V3.btm

<a name="EOSxJ"></a>
# EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCJ-W-EO,EOSWJ-W-EO
-   **BACnet Type Mapping File Name:** EOSxJ-V2.btm

<a name="EPACJ"></a>
# EPACJ - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACJ
-   **BACnet Type Mapping File Name:** EPACJ-V2.btm

<a name="ETHSJ"></a>
# EnOcean Temperature and Humidity Sensor

About this device type package file

-   **File Name:** ETHSJ-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSJ
-   **BACnet Type Mapping File Name:** ETHSJ-V3.btm

<a name="EDRPJ"></a>
# EDRPJ - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** EDRPJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EDRPJ-W-EO
-   **BACnet Type Mapping File Name:** EDRPJ-V2.btm

<a name="ESRPJ"></a>
# ESRPU - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** ESRPJ-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** ESRPJ-W-EO
-   **BACnet Type Mapping File Name:** ESRPJ-V2.btm

<a name="#Complete"></a>
# EnOcean-JP-V4.dtp - Consolidated Device Type Package File

The EnOcean-JP-V4.dtp file is a consolidated device type package file that includes the device type contents for all of the individual EnOcean sensor and switch devices in this collection.  Note that this does not include the btm files, which should be imported into the SmartServer IoT separately if desired for a given application.

About this device type package file

-   **File Name:** EnOcean-JP-V4.dtp
