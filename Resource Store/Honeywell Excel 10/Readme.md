Readme - Honeywell Excel 10 Device Type Package Files
===
---

# Table of Contents

-   [Overview](#Overview)
-   [Excel 10 Variable Air Volume II Controller](#VAVController)
-   [Excel 10 Chilled Ceiling Controller](#ChilledCeilingController)
-   [Excel 10 Fan Coil Unit Controller](#FanCoilController)
-   [Excel 10 Hydronic Controller](#HydronicController)

<a name="Overview"></a>
# Overview

Honeywell has a series of LonWorks controllers in the Excel 10 family that have various inconsistencies in their XIF and resource files.  These irregularities lead to both missing and incorrect type information for many of the data points available on these devices, in particular when these devices are used with the SmartServer IoT.  Some naming conflicts in the associated resource files also create database issues when importing these native files into a SmartServer IoT.  These device type package files posted to our github repository include corrected XIF and corrected (XML) resource files for these devices, which allow them to be used properly with the SmartServer IoT.

<a name="VAVController"></a>
# Excel 10 Variable Air Volume II Controller

The Excel 10 series of LonWorks Variable Air Volume II Controllers are based on a scope 6 resource file set installed with Honeywell's VAV2 LNS plugin.  The XIF file installed with Honeywell's VAV2 LNS plugin has some errors regarding member number type references to manufacturer added network variable types.

This complete device type package file includes a corrected XIF file as well as the required XML resource files which resolves these issues.

About this device type package file

-   **File Name:** Vav2-101801.dtp
-   **Program ID:** 80:00:0C:50:0A:03:04:03
-   **Device Manufacturer:** Honeywell
-   **Device Model Number:** W7751B, D, F

<a name="ChilledCeilingController"></a>
# Excel 10 Chilled Ceiling Controller

The Excel 10 series of LonWorks Chilled Ceiling Controllers are based on a scope 6 resource file set installed with Honeywell's CHC LNS plugin.  This native resource file set has some naming conflicts with user network variable types (UNVTs) and referenced enumerated types.  It's also missing the inherited functional profile templates (FPTs) based on the standard node object and fan coil unit controller objects.  In addition, the XIF file installed with Honeywell's CHC LNS plugin has some errors regarding member number type references to manufacturer added network variable types.

This complete device type package file includes a corrected XIF as well as corrected XML resource files based on an updated resource file set which resolves these issues.  Since the resource file set itself was also updated, an independent zip file containing the modified resource files has also been posted for reference.  While these files aren't required for integration with the SmartServer IoT, they can be used with IzoT CT / IzoT Net Server if desired.

About this device type package file

-   **File Name:** Xl10chc1.dtp
-   **Program ID:** 80:00:0C:50:14:03:04:16
-   **Device Manufacturer:** Honeywell
-   **Device Model Number:** W7763C, D, E
-   **Modified Resource Files:** CHC Resource Files (modified).zip

<a name="FanCoilController"></a>
# Excel 10 Fan Coil Unit Controller

The Excel 10 series of LonWorks Fan Coil Unit Controllers are based on a scope 6 resource file set installed with Honeywell's FCU2 LNS plugin.  This native resource file set has some naming conflicts with user network variable types (UNVTs) and referenced enumerated types.  It's also missing the inherited functional profile templates (FPTs) based on the standard node object and fan coil unit controller objects.  In addition, the XIF file installed with Honeywell's FCU2 LNS plugin has some errors regarding member number type references to manufacturer added network variable types.

This complete device type package file includes a corrected XIF as well as corrected XML resource files based on an updated resource file set which resolves these issues.  Since the resource file set itself was also updated, an independent zip file containing the modified resource files has also been posted for reference.  While these files aren't required for integration with the SmartServer IoT, they can be used with IzoT CT / IzoT Net Server if desired.

About this device type package file

-   **File Name:** XL10fcu2.dtp
-   **Program ID:** 80:00:0C:50:14:03:04:0A
-   **Device Manufacturer:** Honeywell
-   **Device Model Number:** W7752D, E, F, G, J
-   **Modified Resource Files:** FCU2 Resource Files (modified).zip

<a name="HydronicController"></a>
# Excel 10 Hydronic Controller

The Excel 10 series of LonWorks Hydronic Controllers are based on a scope 6 resource file set installed with Honeywell's HYD2 LNS plugin.  This native resource file set has some naming conflicts with user network variable types (UNVTs) and referenced enumerated types.  It's also missing the inherited functional profile templates (FPTs) based on the standard node object and fan coil unit controller objects.  In addition, the XIF file installed with Honeywell's HYD2 LNS plugin has some errors regarding member number type references to manufacturer added network variable types.

This complete device type package file includes a corrected XIF as well as corrected XML resource files based on an updated resource file set which resolves these issues.  Since the resource file set itself was also updated, an independent zip file containing the modified resource files has also been posted for reference.  While these files aren't required for integration with the SmartServer IoT, they can be used with IzoT CT / IzoT Net Server if desired.

About this device type package file

-   **File Name:** Xl10hyd2.dtp
-   **Program ID:** 80:00:0C:50:14:03:04:0B
-   **Device Manufacturer:** Honeywell
-   **Device Model Number:** W7762A, B
-   **Modified Resource Files:** HYD2 Resource Files (modified).zip
