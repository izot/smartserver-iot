# Viconics 7200 Thermostat
The original example package *Viconics7200.dtp.zip* includes only the Space temperature (AV:7) and the value read from the bottom switch to the left of the thermostat (BI.29).  

##Viconics7200-3.dtp
Starting with release 3.00, use the package *Viconics7200-3.dtp* This package follows the current guidelines for PID definition, and also adds these points:
| Object ID | Write Enable | Description |
| --------- | ------------ | ----------- |
|BV.8       |YES           |Set to allow temperature override |
|AV.39      |YES           |Occupied Heating SP |
|BV.51      |YES           |Scale Temp. (1 for deg F)|

The Package is includes a DLA file for 5s polling of all points
