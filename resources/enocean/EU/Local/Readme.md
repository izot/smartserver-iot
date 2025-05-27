Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for the European Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EKCSA - EnOcean Key Card Switch](#EKCSA)
-   [ELLSA - EnOcean Light Level Sensor](#ELLSA)
-   [EMCSA - EnOcean Magnet Contact Sensor](#EMCSA)
-   [EMDCA - EnOcean Motion Detector With Illumination Sensor](#EMDCA)
-   [EMSIA (STM 550) - EnOcean Multisensor](#EMSIA)
-   [EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxA)
-   [EPACA - EnOcean People Activity Counter](#EPACA)
-   [ETHSA - EnOcean Temperature and Humidity Sensor](#ETHSA)
-   [EDRPA - EnOcean Double Rocker Pad](#EDRPA)
-   [ESRPA - EnOcean Single Rocker Pad](#ESRPA)
-   [EnOcean-EU-V4.dtp - Consolidated Device Type Package File](#Complete)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  There are individual device type package files for each sensor type, as well as a consolidated dtp file containing all of the device types in a single package file.  In addition, there are individual BACnet type mapping (btm) files for each of the sensor types to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EKCSA"></a>
# EKCSA - EnOcean Key Card Switch

About this device type package file

-   **File Name:** EKCSA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-04-02
-   **Device Model Number:** EKCSA-W-EO, EKCSA-W-EO
-   **BACnet Type Mapping File Name:** EKCSA-V2.btm

<a name="ELLSA"></a>
# ELLSA - EnOcean Light Level Sensor

About this device type package file

-   **File Name:** ELLSA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-06-02
-   **Device Model Number:** ELLSA-W-EO
-   **BACnet Type Mapping File Name:** ELLSA-V2.btm

<a name="EMCSA"></a>
# EMCSU - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSA-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSA
-   **BACnet Type Mapping File Name:** EMCSA-V3.btm

<a name="EMDCA"></a>
# EMDCA - EnOcean Motion Detector With Illumination Sensor

About this device type package file

-   **File Name:** EMDCA-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCA-W-EO
-   **BACnet Type Mapping File Name:** EMDCA-V3.btm

<a name="EMSIA"></a>
# EMSIA (STM 550) - EnOcean Multisensor

About this device type package file

-   **File Name:** STM550-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM500
-   **BACnet Type Mapping File Name:** STM550-V3.btm

<a name="EOSxA"></a>
# EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.

About this device type package file

-   **File Name:** EOSxA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCA-W-EO, EOSWA-W-EO
-   **BACnet Type Mapping File Name:** EOSxA-V2.btm

<a name="EPACA"></a>
# EPACA - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACA
-   **BACnet Type Mapping File Name:** EPACA-V2.btm

<a name="ETHSA"></a>
# EnOcean Temperature and Humidity Sensor

About this device type package file

-   **File Name:** ETHSA-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSA
-   **BACnet Type Mapping File Name:** ETHSA-V3.btm

<a name="EDRPA"></a>
# EDRPA - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** EDRPA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EDRPA-W-EO
-   **BACnet Type Mapping File Name:** EDRPA-V2.btm

<a name="ESRPU"></a>
# ESRPA - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).

About this device type package file

-   **File Name:** ESRPA-V2.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** ESRPA-W-EO
-   **BACnet Type Mapping File Name:** ESRPA-V2.btm

<a name="#Complete"></a>
# EnOcean-EU-V4.dtp - Consolidated Device Type Package File

The EnOcean-EU-V4.dtp file is a consolidated device type package file that includes the device type contents for all of the individual EnOcean sensor and switch devices in this collection.  Note that this does not include the btm files, which should be imported into the SmartServer IoT separately if desired for a given application.

About this device type package file

-   **File Name:** EnOcean-EU-V4.dtp
