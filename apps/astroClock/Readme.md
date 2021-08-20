# astroClock.js
This application provides time, sunrise, sunset, dusk, and dawn times to share with edge devices for use in outdoor lighting systems.  It applies to a class of devices that require knowledge of local time, and the local dusk and dawn times to schedule load control.  
## UFPTastroClock
This UFPT provides data points intended to align with Lon devices that understand SNVT_time_stamp, and SNVT_switch for direct control.  This functional block provides the functionality of the UCPTrealtimeClock found in SmartServer 2. The resources defining this interface are part of ApolloDev.typ 1.31 or higher.
![UFPTastroClock](images/AstroClock%20UFPT.png)
| Network Variable | Type | Notes |
|--- | --- | ---|
|nvoAfterDark|SNVT_switch|Set to {value:100,State:0} between civil dusk and civil dawn|
|nvoLocalDawn|SNVT_time_stamp|Time for today's civil dawn|
|nvoLocalDusk|SNVT_time_stamp|Time for today's civil dusk|
|nvoLocalSunrise|SNVT_time_stamp|Time for today's sunrise|
nvoLocalSunset|SNVT_time_stamp|Time for today's sunset|

This application uses the lat/lon coordinates of the segment controller.  You can determine the configure GPS location using the Device widget in the CMS, and reposition as necessary. 

These configuration properties are used to manage operation of this functional profile.
| CP | Type | Notes |
| --- | --- | ---|
|cpPowerLine|UCPTpowerLine|Default: 1, means the controller will throttle nvo traffic for Powerline.|
|cpDawnAdjust|UCPToffsetSunrise|Default:0, +-30m adjustment to daylight times to adjust for local conditions.|
|cpDuskAdjust|UCPToffsetSunset|Default:0, +-30m adjustment to daylight times to adjust for local conditions.|
|cpTimeHeartbeat|SCPTmaxSendTime|Default: 300s, Time between updates to nvoLocalTime|
|cpDuskDawnHeatbeat|UCPTmaxSendTime|Default: 300s, Time between updates to daytime switching times.|

Powerline requires special consideration to contol updates to the channel.  In systems requiring more than 3 hops, it is best practice to limit updates to every 300s.  This application will prevent offering channel updates for a configured throttle time when cpPowerLine is set to 1.

## Deployment Instructions
