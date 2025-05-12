Device Type Package Files and BACnet Type Mapping Files for EnOcean Self-Powered Sensors.  There are directories for each supported region.

NOTE: These .dtp and dla files will not work with IoTC or SmartStudio remote connections, the associated .dtd file(s) will need to be modified to use "iotc" and 
not "enocean" in the "Protocol" field.  

In addition, the .eno files will need an additional line after "#manufacturer, EnOcean" that specifies the device eep (in addition to the eep being part of the program ID) such as:

#manufacturer,EnOcean
#eep	a5-04-03

