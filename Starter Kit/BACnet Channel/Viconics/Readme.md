# Viconics 7200 Thermostat
The original example package *Viconics7200.dtp.zip* includes only the Space temperature (AV:7) and the value read from the bottom switch to the left of the thermostat (BI.29).  

## Viconics7200-3.dtp
Starting with release 3.00, use the package *Viconics7200-3.dtp* This package follows the current guidelines for PID definition, and also adds these points:
| Object ID | Write Enable | Description |
| --------- | ------------ | ----------- |
|BV.8       |YES           |Set to allow temperature override |
|AV.39      |YES           |Occupied Heating SP |
|BV.51      |YES           |Scale Temp. (1 for deg F)|
|AV.7       |YES           |Space temp |
|BI.29      |NO            |1 - Unoccupied, 0 - Occupied|

The Package is includes a DLA file for 5s polling of all points

## SmartServer 3.20 Updates
The orignial files are moved to the archive folder.  Use the files at this level for SmartServer release 3.20 and higher.  The new package Viconics7200-V20.dtp will work with the discovry feature to create devices with the demo set of points mentioned in the previous section.  If you chosed to used the discovery feature to derive the entire Viconic 7200 BACnet set of points.  Do not import this package prior to running discovery. 
