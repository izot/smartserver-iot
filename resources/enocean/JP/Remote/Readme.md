Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Remote Mode
===
---

# Table of Contents

-   [Overview](#Overview)
-   [ELLSJ - EnOcean Light Level Sensor](#ELLSJ)
-   [EMCSJ - EnOcean Magnet Contact Sensor](#EMCSJ)
-   [EMDCJ - EnOcean Motion Detector With Illumination Sensor](#EMDCJ)
-   [EMSIJ (STM 550) - EnOcean Multisensor](#EMSIJ)
-   [EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxJ)
-   [EPACJ - EnOcean People Activity Counter](#EPACJ)
-   [ETHSJ - EnOcean Temperature and Humidity Sensor](#ETHSJ)
-   [EDRPJ - EnOcean Double Rocker Pad](#EDRPJ)
-   [ESRPJ - EnOcean Single Rocker Pad](#ESRPJ)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  These files are designed for use with the EnOcean driver operating in remote mode.  There are individual device type package files for each sensor type.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="ELLSJ"></a>
# ELLSJ - EnOcean Light Level Sensor

About this device type package file

-   **File Name:** ELLSJ-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-06-02
-   **Device Model Number:** ELLSJ-W-EO
-   **BACnet Type Mapping File Name:** ELLSJ-rem-V1.btm

<a name="EMCSJ"></a>
# EMCSJ - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSJ-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSJ
-   **BACnet Type Mapping File Name:** EMCSJ-rem-V1.btm

<a name="EMDCJ"></a>
# EMDCJ - EnOcean Motion Detector With Illumination Sensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EMDCJ-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCJ-W-EO
-   **BACnet Type Mapping File Name:** EMDCJ-rem-V2.btm

<a name="EMSIJ"></a>
# EMSIJ (STM 550) - EnOcean Multisensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** STM550-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550
-   **BACnet Type Mapping File Name:** STM550-rem-V2.btm

<a name="EOSxJ"></a>
# EOSxJ - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.  Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EOSxJ-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCA-W-EO, EOSWA-W-EO, EOSHA
-   **BACnet Type Mapping File Name:** EOSxJ-rem-V2.btm

<a name="EPACJ"></a>
# EPACJ - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACJ-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACJ
-   **BACnet Type Mapping File Name:** EPACJ-rem-V1.btm

<a name="ETHSJ"></a>
# ETHSJ - EnOcean Temperature and Humidity Sensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** ETHSJ-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSJ
-   **BACnet Type Mapping File Name:** ETHSJ-rem-V2.btm

<a name="EDRPJ"></a>
# EDRPJ - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** EDRPJ-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EDRPJ-W-EO
-   **BACnet Type Mapping File Name:** EDRPJ-rem-V1.btm

<a name="ESRPJ"></a>
# ESRPJ - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** ESRPJ-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** ESRPJ-W-EO
-   **BACnet Type Mapping File Name:** ESRPJ-rem-V1.btm
