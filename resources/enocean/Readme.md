Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EKCSU - EnOcean Key Card Switch](#EKCSU)
-   [ELLSU - EnOcean Light Level Sensor](#ELLSU)
-   [EMCSU - EnOcean Magnet Contact Sensor](#EMCSU)
-   [EMDCU - EnOcean Motion Detector With Illumination Sensor](#EMDCU)
-   [EMSIU (STM 550) - EnOcean Multisensor](#EMSIU)
-   [EOSxU - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxU)
-   [EPACU - EnOcean People Activity Counter](#EPACU)
-   [ETHSU - EnOcean Temperature and Humidity Sensor](#ETHSU)
-   [EDRPU - EnOcean Double Rocker Pad](#EDRPU)
-   [ESRPU - EnOcean Single Rocker Pad](#ESRPU)
-   [EnOcean-US-V3.dtp - Consolidated Device Type Package File](#Complete)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  There are individual device type package files for each sensor type, as well as a consolidated dtp file containing all of the device types in a single package file.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EKCSU"></a>
# EKCSU - EnOcean Key Card Switch

About this device type package file

-   **File Name:** EKCSU-V1.dtp
-   **EnOcean Equipment Profile (EEP):** F6-04-01
-   **Device Model Number:** EKCSU-W-EO, EKCSA-W-EO
-   **BACnet Type Mapping File Name:** EKCSU-V1.btm

<a name="ELLSU"></a>
# ELLSU - EnOcean Light Level Sensor

About this device type package file

-   **File Name:** ELLSU-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-06-02
-   **Device Model Number:** ELLSU-W-EO
-   **BACnet Type Mapping File Name:** ELLSU-V1.btm

<a name="EMCSU"></a>
# EMCSU - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSU-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSU, EMCSA, EMCSJ
-   **BACnet Type Mapping File Name:** EMCSU-V2.btm

<a name="EMDCU"></a>
# EMDCU - EnOcean Motion Detector With Illumination Sensor

About this device type package file

-   **File Name:** EMDCU-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCU-W-EO, EMDCA-W-EO, EMDCJ-W-EO
-   **BACnet Type Mapping File Name:** EMDCU-V2.btm

<a name="EMSIU"></a>
# EMSIU (STM 550) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550U, STM500, STM550J
-   **BACnet Type Mapping File Name:** STM550-V2.btm

<a name="EOSxU"></a>
# EOSxU - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxU-V1.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCU-W-EO, EOSCA-W-EO, EOSCJ-W-EO, EOSWU-W-EO, EOSWA-W-EO, EOSWJ-W-EO, EOSHU
-   **BACnet Type Mapping File Name:** EOSxU-V1.btm

<a name="EPACU"></a>
# EPACU - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACU-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACU, EPACA
-   **BACnet Type Mapping File Name:** EPACU-V1.btm

<a name="ETHSU"></a>
# EnOcean Temperature and Humidity Sensor

About this device type package file

-   **File Name:** ETHSU-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSU ETHSA
-   **BACnet Type Mapping File Name:** ETHSU-V2.btm

<a name="EDRPU"></a>
# EDRPU - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** EDRPU-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EDRPU-W-EO
-   **BACnet Type Mapping File Name:** EDRPU-V2.btm

<a name="ESRPU"></a>
# ESRPU - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** ESRPU-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** ESRPU-W-EO
-   **BACnet Type Mapping File Name:** ESRPU-V2.btm

<a name="#Complete"></a>
# EnOcean-US-V3.dtp - Consolidated Device Type Package File

The EnOcean-US-V3.dtp file is a consolidated device type package file that includes the device type contents for all of the individual EnOcean sensor and switch devices in this collection.  Note that this does not include the btm files, which should be imported into the SmartServer IoT separately if desired for a given application.

About this device type package file

-   **File Name:** EnOcean-US-V3.dtp
