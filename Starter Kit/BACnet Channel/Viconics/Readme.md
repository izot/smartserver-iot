# Viconics 7200 Thermostat
The following device type packages (DTPs) are available for the Viconics 7200 Thermostat.  

## Viconics7200-V20.dtp
This package is compatible with SmartServer 3.2 and newer.  This package works with the SmartServer discovery feature to create devices with the starter kit datapoints.  To use SmartServer discovery to define the Viconic 7200 BACnet datapoints, complete discovery prior to importing this package.

## Viconics7200-3.dtp
This package is compatible with SmartServer 3.0 and 3.1.  It is available in the archives folder.  It adds the following points to the Viconics7200.dtp package:

| Object ID | Write Enable | Description |
| --------- | ------------ | ----------- |
|BV.8       |YES           |Set to allow temperature override |
|AV.39      |YES           |Occupied Heating SP |
|BV.51      |YES           |Scale Temp. (1 for deg F)|
|AV.7       |YES           |Space temp |
|BI.29      |NO            |1 - Unoccupied, 0 - Occupied|

The package includes a DLA file that specifies 5s polling of all points.

## Viconics7200.dtp
This package is compatible with SmartServer 2.6 through 2.9.  It is available in the archives folder.  This package defined a BACnet interface with a space temperature (AV:7) and the value read from the bottom switch to the left of the thermostat (BI.29).
