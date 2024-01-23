Readme - Schneider Electric TAC I/A Series MicroNet Controllers Device Type Package Files
===
---

# Table of Contents

-   [Overview](#Overview)
-   [I/A Series MicroNet Fan Coil Version 3](#FanCoil3)
-   [I/A Series MicroNet Heat Pump Version 3](#HeatPump3)
-   [I/A Series MicroNet Roof Top Version 3](#RoofTop3)
-   [I/A Series MicroNet Satellite (Invensys) Version 3](#SatelliteInv3)
-   [I/A Series MicroNet Satellite (TAC) Version 3](#SatelliteTac3)
-   [I/A Series MicroNet Satellite Version 4](#SatelliteTac4)
-   [I/A Series MicroNet VAV Version 3](#VAV3)

<a name="Overview"></a>
# Overview

The Schneider Electric (TAC / Invensys) I/A Series MicroNet controller family features a set of standard LonWorks controllers, including the MNL-50, MNL-100, MNL-110, MNL-130, MNL-150, MNL-200, and VAV series.  Although these controllers differ in the onboard I/O points they provide, they may share the same packaging, such as the MNL-100, MNL-150, & MLN-200 models.  In addition to sharing common packaging, they also use the same device profiles, XIF files, and resource file sets when programmed up using the WorkPlace Tech Tool with a specific device profile and profile version.  For example, the MNL-15RF3 and the MNL-20RF3 model numbers refer to the base MNL-150 and MNL-200 models, but in both cases these two models would be running the same Fan Coil profile 'F' version 3 and use the same program ID.

These device package files for the SmartServer IoT posted to our gihub repository support the standard I/A Series MicroNet controllers for the above-mentioned models based on the device profile and profile version indicated below.  The program ID should be verified in the device to confirm that it matches the profile and profile version associated with a given package file.

<a name="FanCoil3"></a>
# I/A Series MicroNet Fan Coil Version 3

About this device type package file

-   **File Name:** MNLRF3.dtp
-   **Program ID:** 80:00:16:50:14:04:04:03
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRF3

<a name="HeatPump3"></a>
# I/A Series MicroNet Heat Pump Version 3

About this device type package file

-   **File Name:** MNLRH3.dtp
-   **Program ID:** 80:00:16:50:33:04:04:03
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRH3

<a name="RoofTop3"></a>
# I/A Series MicroNet Roof Top Version 3

About this device type package file

-   **File Name:** MNLRR3.dtp
-   **Program ID:** 80:00:16:50:1E:04:04:03
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRR3

<a name="SatelliteInv3"></a>
# I/A Series MicroNet Satellite (Invensys) Version 3

There are two different versions of the I/A Series MicroNet Satellite controller profile that share the same program ID.  Although they share the same program ID, they differ slightly due to differences in the device's self-documentation string, XIF and resource files.  The self-documentation string for the "Invensys" model is "&3.3@8030;Invensys Satellite S3.

About this device type package file

-   **File Name:** MNLRS3i.dtp
-   **Program ID:** 80:00:16:50:1E:04:04:12
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRS3
-   **Self Documentation String:** "&3.3@8030;Invensys Satellite S3

<a name="SatelliteTac3"></a>
# I/A Series MicroNet Satellite (TAC) Version 3

There are two different versions of the I/A Series MicroNet Satellite controller profile that share the same program ID.  Although they share the same program ID, they differ slightly due to differences in the device's self-documentation string, XIF and resource files.  The self-documentation string for the "TAC" model is "&3.4@8030;MicroNet Satellite S3.

About this device type package file

-   **File Name:** MNLRS3t.dtp
-   **Program ID:** 80:00:16:50:1E:04:04:12
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRS3
-   **Self Documentation String:** "&3.4@8030;MicroNet Satellite S3

<a name="SatelliteTac4"></a>
# I/A Series MicroNet Satellite Version 4

About this device type package file

-   **File Name:** MNLRS4.dtp
-   **Program ID:** 80:00:16:50:1E:04:04:13
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-XXRS4

<a name="VAV3"></a>
# I/A Series MicroNet VAV Version 3

About this device type package file

-   **File Name:** MNLRV3.dtp
-   **Program ID:** 80:00:16:50:0A:04:04:0A
-   **Device Manufacturer:** Schneider Electric / TAC
-   **Device Model Number:** MNL-VxRV3
