Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Local Mode in the European Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EKCSA - EnOcean Key Card Switch](#EKCSA)
-   [EMCSA - EnOcean Magnet Contact Sensor](#EMCSA)
-   [EMDCA - EnOcean Motion Detector With Illumination Sensor](#EMDCA)
-   [EMSIA (STM 550) - EnOcean Multisensor](#EMSIA)
-   [EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxA)
-   [EPACA - EnOcean People Activity Counter](#EPACA)
-   [ETHSA - EnOcean Temperature and Humidity Sensor](#ETHSA)
-   [EWSDA - EnOcean Double Rocker Pad](#EWSDA)
-   [EWSSA - EnOcean Single Rocker Pad](#EWSSA)
-   [EnOcean-EU-lcl-V6.dtp - Consolidated Device Type Package File](#Complete)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  There are individual device type package files for each sensor type, as well as a consolidated dtp file containing all of the device types in a single package file.  In addition, there are BACnet type mapping (btm) files for each of the sensor types bundled into the package files to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EKCSA"></a>
# EKCSA - EnOcean Key Card Switch

About this device type package file

-   **File Name:** EKCSA-lcl-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-04-02
-   **Device Model Number:** EKCSA-W-EO, EKCSA-W-EO
-   **BACnet Type Mapping File Name:** EKCSA-lcl-V2.btm (bundled in the package file)

<a name="EMCSA"></a>
# EMCSA - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSA-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSA
-   **BACnet Type Mapping File Name:** EMCSA-lcl-V4.btm (bundled in the package file)

<a name="EMDCA"></a>
# EMDCA - EnOcean Motion Detector With Illumination Sensor

About this device type package file

-   **File Name:** EMDCA-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCA-W-EO
-   **BACnet Type Mapping File Name:** EMDCA-lcl-V4.btm (bundled in the package file)

<a name="EMSIA"></a>
# EMSIA (STM 550) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550
-   **BACnet Type Mapping File Name:** STM550-lcl-V4.btm (bundled in the package file)

<a name="EOSxA"></a>
# EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxA-lcl-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCA-W-EO, EOSWA-W-EO
-   **BACnet Type Mapping File Name:** EOSxA-lcl-V3.btm (bundled in the package file)

<a name="EPACA"></a>
# EPACA - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACA-lcl-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACA
-   **BACnet Type Mapping File Name:** EPACA-lcl-V3.btm (bundled in the package file)

<a name="ETHSA"></a>
# EnOcean Temperature and Humidity Sensor

About this device type package file

-   **File Name:** ETHSA-lcl-V4.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSA
-   **BACnet Type Mapping File Name:** ETHSA-lcl-V4.btm (bundled in the package file)

<a name="EWSDA"></a>
# EWSDA - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).  This supports switches containing the PTM 215.

About this device type package file

-   **File Name:** EWSDA-lcl-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EWSDA
-   **BACnet Type Mapping File Name:** EWSDA-lcl-V2.btm (bundled in the package file)

<a name="EWSSA"></a>
# EWSSA - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).  This supports switches containing the PTM 215.  The version number of this package file is 16 greater than the version number of the EWSDA package file (upper nibble in the device model in the program ID is set) in order to differentiate it from the EWSDA device and prevent errors when these are bundled together into a consolidated package file.

About this device type package file

-   **File Name:** EWSSA-lcl-V18.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EWSSA
-   **BACnet Type Mapping File Name:** EWSSA-lcl-V18.btm (bundled in the package file)

<a name="Complete"></a>
# EnOcean-EU-lcl-V6.dtp - Consolidated Device Type Package File

The EnOcean-EU-lcl-V6.dtp file is a consolidated device type package file that includes the device type contents for all of the individual EnOcean sensor and switch devices in this collection.  This consolidated package file also includes the btm files for the individual devices as well.

About this device type package file

-   **File Name:** EnOcean-EU-lcl-V6.dtp
