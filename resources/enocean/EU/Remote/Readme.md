Readme - EnOcean Self-Powered Sensors, Device Type Package Files and BACnet Type Mapping Files for Remote Mode in the European Region.
===
---

# Table of Contents

-   [Overview](#Overview)
-   [EMCSA - EnOcean Magnet Contact Sensor](#EMCSA)
-   [EMDCA - EnOcean Motion Detector With Illumination Sensor](#EMDCA)
-   [EMSIA (STM 550) - EnOcean Multisensor](#EMSIA)
-   [EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors](#EOSxA)
-   [EPACA - EnOcean People Activity Counter](#EPACA)
-   [ETHSA - EnOcean Temperature and Humidity Sensor](#ETHSA)
-   [EWSDA - EnOcean Double Rocker Pad](#EWSDA)
-   [ESRPA - EnOcean Single Rocker Pad](#ESRPA)
-   [CTV3 - Pressac One Channel Current Sensor](#CTV3)
-   [SD-ENO-Co2 - Jumitech Air Quality Sensor](#SDENOC2)

<a name="Overview"></a>
# Overview

These device type package (dtp) files for the SmartServer IoT support many of the EnOcean-branded sensors and switches classified as finished products or Easyfit devices.  In addition, there are a few package files included for 3rd party EnOcean protocol devices.  These files are designed for use with the EnOcean driver operating in remote mode.  There are individual device type package files for each sensor type.  In addition, there are BACnet type mapping (btm) files for each of the sensor types bundled into the package files to support applications where the SmartServer IoT is being used to publish EnOcean sensor data as BACnet IP data using the SmartServer IoT's integral BACnet IP server.  Note that these package files are based on the default EnOcean Equipment Profiles (EEP) used by these sensors.  Some sensors like the STM 550 support different EEPs selectable using NFC.

<a name="EMCSA"></a>
# EMCSA - EnOcean Magnet Contact Sensor

About this device type package file

-   **File Name:** EMCSA-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D5-00-01
-   **Device Model Number:** EMCSA
-   **BACnet Type Mapping File Name:** EMCSA-rem-V2.btm (bundled in the package file)

<a name="EMDCA"></a>
# EMDCA - EnOcean Motion Detector With Illumination Sensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EMDCA-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-03
-   **Device Model Number:** EMDCA-W-EO
-   **BACnet Type Mapping File Name:** EMDCA-rem-V3.btm (bundled in the package file)

<a name="EMSIA"></a>
# EMSIA (STM 550) - EnOcean Multisensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** STM550-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-41 (default)
-   **Device Model Number:** STM550
-   **BACnet Type Mapping File Name:** STM550-rem-V3.btm (bundled in the package file)

<a name="EOSxA"></a>
# EOSxA - EnOcean Ceiling, Wall Mounted, and High Bay Occupancy Sensors

Note that there are three different EnOcean occupancy sensor base models supported by this package file as they share the same EnOcean Equipment Profile (EEP).  This includes the ceiling mounted, wall mounted, and high bay occupancy sensors.  Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** EOSxA-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-07-01
-   **Device Model Number:** EOSCA-W-EO, EOSWA-W-EO, EOSHA
-   **BACnet Type Mapping File Name:** EOSxA-rem-V3.btm (bundled in the package file)

<a name="EPACA"></a>
# EPACA - EnOcean People Activity Counter

About this device type package file

-   **File Name:** EPACA-rem-V2.dtp
-   **EnOcean Equipment Profile (EEP):** D2-15-00
-   **Device Model Number:** EPACA
-   **BACnet Type Mapping File Name:** EPACA-rem-V2.btm (bundled in the package file)

<a name="ETHSA"></a>
# ETHSA - EnOcean Temperature and Humidity Sensor

Based on changes to the OperationalInfo data point names, this package file should be used with SmartServer 4.5x and later.

About this device type package file

-   **File Name:** ETHSA-rem-V3.dtp
-   **EnOcean Equipment Profile (EEP):** A5-04-03
-   **Device Model Number:** ETHSA
-   **BACnet Type Mapping File Name:** ETHSA-rem-V3.btm (bundled in the package file)

<a name="EWSDA"></a>
# EWSDA - EnOcean Double Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).  This supports switches containing the PTM 215.

About this device type package file

-   **File Name:** EWSDA-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** EWSDA
-   **BACnet Type Mapping File Name:** EWSDA-rem-V1.btm (bundled in the package file)

<a name="ESRPA"></a>
# ESRPA - EnOcean Single Rocker Pad

Note that since this package file is based on EEP F6-02-04, users may encounter issues using this package file with older USB 300U radios running an API version prior to 2.6.8.0 (Jan 2017).  This supports switches containing the PTM 215.

About this device type package file

-   **File Name:** ESRPA-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** F6-02-04
-   **Device Model Number:** ESRPA-W-EO
-   **BACnet Type Mapping File Name:** ESRPA-rem-V1.btm (bundled in the package file)

<a name="CTV3"></a>
# CTV3 - Pressac One Channel Current Sensor

About this device type package file

-   **File Name:** CT-Clamp-1CH-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D2-32-00
-   **Device Model Number:** CTV3_868_1CH_xxxA
-   **BACnet Type Mapping File Name:** CT-Clamp-1CH-rem-V1.btm (bundled in the package file)

<a name="SDENOC2"></a>
# SD-ENO-Co2 - Jumitech Air Quality Sensor

About this device type package file

-   **File Name:** Jumitech-CO2-rem-V1.dtp
-   **EnOcean Equipment Profile (EEP):** D2-14-59
-   **Device Model Number:** SD-ENO-Co2-Sensor
-   **BACnet Type Mapping File Name:** Jumitech-CO2-rem-V1.btm (bundled in the package file)
