
**SmartServer IoT NavTree (1.22)**
The SmartServer NavTree Web page allows you to create a custom Web page for the SmartServer IoT. It provides a navigation tree, and can optionally show schedules and logs per device. You can customize it to provide a floorplan showing datapoints. 

The best way to use NavTree is to determine what datapoints you want to see for each device type. That is, even though a device may have 100+ datapoints for most applications you may only need an end user to see 4 datapoints. So what you want to do for each device type is create a list of datapoints that you want to see, an image and determine how you want to show them. If you want to show all devices that you use this device type the same way then you only need to do this once per device type.  If for the same device type you want to show different datapoints, you can do this by specifying the device name or using a different device type in the CMS device widget and specifying the datapoints and their use.  The datapoint and image information can be specified for specific one or more device names, one or more device types, or one or more program Ids.

NavTree Web page Layout consists of four areas:  
1. The title bar, on top, has a customizable Web page title (click title to go back to the home.html Web page), a refresh button which can be used refresh the Web page data, a help "?" button, plus a log out button. You must use a separate Login Web page to log into the CMS (see login.html).
2. The Navigation pane (navigation tree), on the left, shows contexts (if configured in the CMS Planning Widget), devices and schedules. The Navigation tree is re-sizeable.
3. The Workspace pane, on the right, is where you will do most of your work and it shows detailed information for the item that was clicked in the Navigation pane.
4. The footer, on the bottom, shows a summary of the device count, license state, and a customizable label for company name. 

The NavTree Web page defaults to creating a navigation tree for devices and showing all the visible datapoints for each device. Datapoint Visibility is set in the CMS Datapoint Properties Widget.  

NavTree provides a similar navigation tree as the CMS Planning Widget (you must first set up the Planning Widget). In addition you can customize the NavTree Web page to show datapoints in the floorplan view (context view). You can also limit which datapoints that are shown and how they are shown (span, switch, LED).  If you decide to limit the datapoints for a device type you need to specify all datapoints you want to see.

There are three views that you can see based on which node you click on the navigation tree. 
1. Floorplan view (floorplan with datapoints) - Click all but the device name or schedule. 
    - This will show the same floorplans that you see in the CMS Web page, but can be configured to show datapoint values. 
2. Dashboard View (device plugin or device configuration page) - Click the device name in the navigation tree to see datapoints for that specific device
3. Schedule View - Click the Schedules node to see all available schedules

In the floorplan or dashboard view, the default is to be readonly, click the edit checkbox to enable or disable edit mode. 

You can either customize the NavTree by adding customize tags in the context (Planning Widget), or by modifying the javascript in the user.js file.  Making changes in the user.js file provides the most portable customization. You can then customize a specific SmartServer by adding context tags in the Planning Widget.  The user.js file also allows you to customize NavTree when not using the Planning widget. When no contexts are defined the NavTree navigation tree shows a list of devices and a schedules node.

An example Planning Widget custom tag is shown below ("<tagname>: <tagvalue>"):
    What you enter into CMS Planning Widget
    tagname = devicetype_pulsegen.dp8
    tagvalue = (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;c,units=lux, contexts=floor;room,dashboard=100;310

    Shorthand format for examples in this document.
    devicetype_pulsegen.dp8: (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;c,units=lux, contexts=floor;room,dashboard=100;310

The custom tag above consists of a tag name which must be unique (if not unique then tags with duplicate name will get overwritten). 
1. In the example above "devicetype_pulsgen.dp8" defines a devicetype with devicetype name "pulsegen" and datapoint dp8.  ".dp<Number>" allows you to show datapoints in a specific order so .dp1 will be listed before .dp2 and then .dp3 (from top to bottom). 
2. The first part of the custom tag value is the datapoint path "(900001153C000405)/device/0/nvoLuxLevel".  "()" indicates one or more program IDs or device type names (separated by a ","). You can also just specify the device name (you can specify a list of device names separated by ","). 
3. The remainder of the tagvalue specifies the how the datapoint is used. A single line can specify how the datapoint is used on the floor and/or room context, and the device dashboard view. In addition, you can add a graphic for the device in the dashboard view and specify whether the datapoint shows up in a chart/table and whether it shows up on the graphic. "dashboard=100,310" means add the datapoint on the graphic at location x=100px and y=310px using the displaytype listed for the floor/room.  

You can add custom tags to contexts using the Planning Widget, but you will have to enter in each tag separately. The SmartServer Browser Web page (available on Github) is an example Web page that can be used to quickly add, modify or remove one or more tags at a time. To use the Browser Web page, go the the Planning View, click on a context like campus and then select "Context Details" in the upper-right hand corner of the page.  If you use the same tag name as an existing custom tag then that tag get overwritten with the new tag value.

For each context or for unassigned devices you can select to see a list of devices in the navigation tree. You can also select to show the devices by device type or program ID. The default is to show all devices in alphabetical order. Since you may have more than one device type per program ID the program ID name will be the first device type with program ID. If there is a "-" in the device type name then the program ID will only include the text before the "-".  More than one device type is used for a specific program ID so that you can use different polling, logging, alarm and preset settings for different devices even though they all have the same program ID.

The NavTree Web page can be customized by user login (TBD).

For a given datapoint you will be able to select if the datapoint shows up in a floorplan floor and/or room/area. That is, for a given device you can show two datapoints in the floor context and five in the room/area context. All datapoints you list show up in the dashboard.  You can specify if a datapoint in the floorplan view is a text box, but in the dashboard view shows up as a chart. In addition, you can add an image in the dashboard and have datapoint overlap the image.

Additionally, you can specify datapoint visibility by user type owner, supervisor and user, though only owner is supported in the SmartServer as of 3.3.  You can also setup configuration based on username.  For example, you may want the apollo user have access to everything, but tom can only see a specific context with its datapoint (as read only), and not have access to any other context or any devices. If you are using contexts and you are using the same users on multiple SmartServers it is best to specify user specific settings in the campus tags instead of the user.js file.

An IOX is treated differently then all other devices. If you don't specify any datapoints in a Planning context or in the user.js file for the iox.dio then it will show only the input datapoints that are configured, all the output datapoints and relay. It will also try to show a UI element based on the DI or DO settings (e.g., if level then it will show a slider switch or led).  For the IOX.meter, if a frequency is detected on a phase (L1/L2/L3) then a chart is shown in the dashboard for frequency, voltage and current for any phase that has a frequency other than 0.

If a chart is used in the dashboard view then the default is to show the last hour of data logs (if logging is enabled and data log size is under a certain size) followed by real time data. For example, if the data log in the SmartServer exceeds say 1 GB then the response time of getting the data logs for the dashboard takes too long and makes the dashboard unresponsive, so when the specified limit is exceeded then the dashboard only shows live data and not log data. You can still see the device logs (in this case you will get a pop up saying getting logs can take several mintues)  

Some datapoints are scalars (like a interger or float) and some datapoints are structures (more than one field or parameter defined)
SNVT_swith is a structed datapoint with two fields "state" and "value":  
{"state":0,"value"}

Structured datapoint have one or more fields. Datapoint field support is supported in the floorplan view and dashboard view. This means that you see either the full structured datapoint value, or one or more datapoint field values.  Fields are specified by specifying the "field:<field path>".  

When writing to a structured datapoint, you need to write the entire datapoint (that is, you can't just write to a specific field). When writing to a specific field in a structured datapoint NavTree do a modified write on the last update it got for that datapoint.  That is, it doesn't read the current value and modify only that field. It only modifies the last value it has stored since the last update.  

# Accessing the Web page (change IP address below to your SmartServer IP address)
https://10.0.0.240/user/navtree/navtree.html

# Order of determining which device datapoints are shown
1. CMS Datapoint Properties Widget (DLA) **Visible** flag 
2. Context tags in Room, and Area context
3. Context tags in Campus context - (these campus custom tags are global tags) 
    a. Starting with version 1.01 you can add global tags in either the Campus context custom tags or the user.js file, or both. 
    a. If you add global tags in the user.js file. Only Campus custom tags are used if at least one "devicetype_" is specifed in the Campus custom tags. 
    b. Otherwise all user.js specified global tags are  used plus any non-"devicetype_" tags in the Campus custom tags. This allows you to put a unique image per SmartServer. 
4. user.js file - in general you will only want to customize navtree.html and user.js and leave the rest of the javascript files alone.
5. All device datapoints - if no datapoints are defined in the context tags or user.js then all datapoints are shown except those excluded with the **Visible** flag

Datapoints can show up as different types of html elements on the Web page. You can specify type of html element used on the floorplan view or dashboard view.  For example, you can have a datapoint show up as a span on the floorplan view, and in the dashboard view you can have it show up as a chart and have it show up as a span on top of a device image. When no displayTypes are specified, NavTree will automatically figure out what it should be based on whether the datapoint is readonly, readwrite and whether is a scalar or structure.

The datapoint type SNVT_switch is a special case as it is widely used in the LON device and can be used for BACnet and Modbus BAC or MOD files, but how it is used depends on the application. To support these different application you can specify different display types for SNVT_swith datapoints. SNVT_switch is a structure datapoint {"state":1,"value":50} which is used for switches has some built-in graphics that you can specify. state 1 means on state 0 means off, and value is the dimming level (50 = 50%). Since this datapoint type is very common in the LON device and can be used for BACnet and Modbus BAC or MOD files, but how it is used depends on the application, several additional display types have been added.  Some application use the SNVT_swith but don't have a dimming capability so only {"state":0,"value":0} and {"state":1,"value":100} are used. In this case you can specify the datapoint to be "s4" slider for writing and "l4" led for these datapoints. If you want to control both state and value then you can specify a "s3" slider and value, or "l3" led and value. If you want access this datapoint as a structured datapoint then specify s0 (readonly structured dp) or s1 (writeable structured dp). 

If you specify s2, s3 or s4 then the datapoint is writeable when in edit mode and shows up as l2 (for s2), l3 (for s3) or l4 (for s4) when in read only mode.   

#  displayTypes:
 *      n = Is Input element for inputs and span for outputs, readonly used to control whether input or output 
 *      r = read-only span
 *      d = dropdown - used for enumerated (emums) datapoints, for BACnet that would be multstate variables
 *      pb = push button TBD 
 *      s0 = structured readonly DP span
 *      s1 = structured writeable DP span
 *      s2 = clickable slider swtich for boolean, binary datapoints
 *      l2 = LED for boolean, binary datapoints, large dot no border when on
 *      l2a = LED for boolean, binary datapoints, small dot
 *      l2b = LED for boolean, binary datapoints, large dot with border
 *      s3 = SNVT_switch only datapoints - clickable switch for SNVT_swtich.state, uses input element for SNVT_swtich.value 
 *      l3 = SNVT_switch only datapoints - LED for SNVT_swtich.state, uses span element for SNVT_swtich.value
 *      s4 = SNVT_switch only datapoints - Clickable switch for SNVT_swtich.state. No html element for SNVT_swtich.value. Clicking then sends {"state":0,"value":0} or {"state":1,"value":100}
 *      l4 = SNVT_switch only datapoints - for SNVT_swtich.state. No html element for SNVT_swtich.value. large dot no border when on
 *      l4a = SNVT_switch only datapoints - for SNVT_swtich.state. No html element for SNVT_swtich.value. small dot
 *      l4b = SNVT_switch only datapoints - for SNVT_swtich.state. No html element for SNVT_swtich.value. large dot with border
 *      led1 = round led with custom color ranges used on top of images, default is 8px, use width to specify different size led 
 *          - example: "dashboard=720;55;led1, value=0:green;>0:orange;>=90:lawngreen"
 *          - example: "dashboard=720;55;led1, width=20, value=0:green;>0:orange;>=90:lawngreen"
 *      c = chart element
 *      cr= read only chart element TBD
 *      g = guage (color change)
 *      g1= guage (gradient)
 *      g2= guage  (sharp gradient)
 *      gc = guage (color change) with chart
 *      gc1= guage (gradient) with chart
 *      gc2= guage (sharp gradient) with chart
 *          example: "displaytype=r;gc2, contexts=floor;room,dashboard=230;405,guagemin=0,guagemax=100,guagecolors=green;yellow(40);orange(60);red(80)"
 *      gchart= mean chart is part of gc, gc1 or gc2, these charts are added during the gc processing and after creating the web page the gchart is changed to "c" 
 *      i=image swapper
 *      m = meter: green, orange, red or green/orange/red only supports three colors green, orange and red. 
 *      m1 = red/orange/green
 *      m2 = red/orange/green/orang/red
 *      rbt= radio button supports 0 and 1,  0=deg C and 1=deg F. 
 *      sl= slider
 *      t1 = small color thermometer 
 *          example: "dashboard=830;120;t1, context=Campus/Building, width=25, folder=images/user/tank/tank_, value=>0:blue;>=25:cyan;>=50:green;>=75:orange;>=90:red;"
 *      tc = thermometer and chart - 
 *      lc = Light guage and chart - 
 
 *      p = Meter guage and chart - SVG no longer supported


# Planning Widget Custom Tags are a tag:value pair. 
1. **tags** - All tags need to be unique. If you use the same tag name more than once then one of them will be overriden. 
2. **value** - The tag value is made up of one or more configuration **settings**. Each **setting** may have one or more **parameters** 
    a. **settings** are separated by commans ","
    b. **parameters** are separated by semicolons ";"
    
    c. example values: "contexts=floor;room", "displaytype=r;c" or "dashboard=100;310"
3. format example:   tag={tag name}: value={list of Settings}
    devicetype_pulsegen.dp8: (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;c,units=lux, contexts=floor;room,dashboard=100;310


NavTree allows you to specify some settings based on user-types. This feature may be useful when the SmartServer fully supports user-types. In addition, you 
can use the Campus tags to specify settings based on specific user names.

# User Type Masks - currently SmartServer (as of 3.3) only supports Owner
1. ALL - all user-types are supported
2. NONE - no user-types are supported
3. ADMIN - only apollo user supported
3. OWNER - only admin, and oower user user-type supported
4. SUPER - admin, owner and supervisor user-types supported
5. USER - only applies to user user-type


# Campus tag rules (campus tags are global, custom tags in other context only apply to that context)
1. datapoint and image Information for devicetypes **devicetype_** should use  the following format "devicetype_{devicetype name}.dp{dp number}
    a. Example datapoint tag
        devicetype_pulsegen.dp8: (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;c,units=lux, contexts=floor;room,dashboard=100;310
    b. The dp number in dp{dp number} is used to specify the order that datapoints are shown in the floorplan view for a device type, so dp8 will be above dp9
        devicetype_pulsegen.dp9: (900001153C000405)/device/0/nviPulseType
        devicetype_pulsegen.dp8: (900001153C000405)/device/0/nvoPulseOut
        - if the context shows datapoints from more than one device then the dps are first order by device and then by the dp number
    b. If you specify at least one datapoint for a device, you must specify all datapoints you want to see
    c. All specified datapoints show up in the dashboard view, but you can specify if the datapoint shows up in the floor or room/area
    d. If showing a datapoint fields then you need to add a separate tag for each datapoint field you want to see
    e. Settings:
        1. First setting is always datapoint path 
            {device}/{blockName}/{blockIndex}/{datapoint XIF name}
            a. {device} can be:
                1. deviceName - used to specify a specific device name
                2. [{devicetype List}] - "(Multisensor)/device/0/nviPulseType" or "(Multisensor;Multisensor-1)/device/0/nviPulseType"
                3. [{programId List}] - "(900001153C000405)/device/0/nviPulseType" or "(900001153C000405;900001153C000406)/device/0/nviPulseType"
        2. Label - is used to allow provide more specific information about the datapoint (i.e., label=Fridge Temp)
        3. displaytype:  specifies how the datapoint looks like on the Web page (e.g., input box, LED, switch or chart)
            a. if one parameter ("displaytype=l4") then that type will be used for the contexts and dashboard
            b. if two parameters ("displaytype=r;c") then the left parameter ("r") is used for the contexts and the right ("c") is used for the dashboard
        4. units
        5. contexts - used to specify which contexts the datapoint should show on. The following example says to show the datapoint on both the floor and room floorplan.
				e.g., contexts=contexts=floor;room
        6. dashboard - used to show the datapoints on the image, in addition to showing it in a chart or table 
            a. format: dashboard={x;y;displaytype}
                dashboard=200;280;r
            b. x and y, are always required, are the offsets on the graphics
            c. If 
2. User specific parameters have a tag of {username}.settings (this is not supported at this time)
        tomh.settings: context=*/*/*/Entry,dashboard=false,readonly=true
            - this specifies that user tomh can only see context Entry and its datapoints, all datapoints in Entry are read only
3. **alarms** tag allows you to customize Alarm Settings 
    alarms: showalarms=ALL,clearalarms=ALL,alarmcolors=cyan;yellow;orange;pink
4. Campus image uses the **image** tag
5. **settings** and **settings1** tags allow you to specify a number of NavTree settings. 
    a. If you are always going to use these settings for every SmartServer than you may want to specify these in the user.js file instead.
6. **contextoffsets** are used to specify x and y offsets used for showing datapoints on the floorplan 

# Tag format: To 
As shown in this document
alarms: showalarms=ALL,clearalarms=ALL,alarmcolors=cyan;yellow;orange;pink

What you enter into the CMS Planning Widget
tagname: alarms
tagvalue: showalarms=ALL,clearalarms=ALL,alarmcolors=cyan;yellow;orange;pink

# Example Campus Tags (tag: value)
settings: showdplabel=0
contexttagsonly=false
mikew.settings: context=*/*/*/Entry,dashboard=false,readonly=true
image: image=images/user/campus1map.png, height=600
datalogrange: 60
alarms: showalarms=ALL,clearalarms=ALL,alarmcolors=cyan;yellow;orange;pink
devicetype_pulsegen.dp9: (900001153C000405)/device/0/nviPulseType, label=Pulse Type,
devicetype_pulsegen.dp8: (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;c,units=lux, contexts=floor;room,dashboard=100;310
devicetype_pulsegen.dp7: (900001153C000405)/device/0/nvoHVACTemp, label=Temp 1, units=°C, displaytype=r;c, contexts=floor;room,dashboard=200;310
devicetype_pulsegen.dp6: (900001153C000405)/device/0/nvoSwitch2, label=Switch 1b, displaytype=l4,contexts=room,dashboard=210;405
devicetype_pulsegen.dp5: (900001153C000405)/device/0/nvoSwitch1, label=Switch 1a, displaytype=l4,contexts=room,color=red,dashboard=60;405
devicetype_pulsegen.dp4: (900001153C000405)/device/0/nvoLamp2, label=LampOut 1b, displaytype=l3, contexts=floor;room,color=orange,dashboard=250;405
devicetype_pulsegen.dp3: (900001153C000405)/device/0/nviLamp2, label=LampIn 1b, displaytype=s3, contexts=floor;room,color=orange
devicetype_pulsegen.dp2: (900001153C000405)/device/0/nvoLamp1, label=LampOut 1a, displaytype=l4,dashboard=100;405
devicetype_pulsegen.dp1: (900001153C000405)/device/0/nviLamp1, label=LampIn 1a, displaytype=s4
devicetype_sensor.dp6: (9FFFFF0501840460)/LightSensor/0/nvoLightLevel, label=Light Level 2, units=lux, displaytype=r;c,contexts=floor;room,dashboard=100;310
devicetype_sensor.dp5: (9FFFFF0501840460)/TempSensor/0/nvoTemperature, label=Temp 2, displaytype=r;c, units=°C, contexts=floor;room,dashboard=200;310
devicetype_pulsegenr.dp17: (900001153C000405)/device/0/nvoCount, contexts=floor,dashboard=200;200
devicetype_sensor.dp4: (9FFFFF0501840460;9FFFFF0501840466)/Lamp/1/nvoLampFb, label=LampOut 2b, contexts=floor;room,dashboard=250;405;l4
devicetype_pulsegen.contextoffsets: offsetx=50,offsety=100
devicetype_sensor.dp3: (9FFFFF0501840460)/Lamp/1/nviLamp, label=LampIn 2b, contexts=floor;room
devicetype_sensor.dp2: (9FFFFF0501840460)/Lamp/0/nvoLampFb, label=LampOut 2a, displaytype=l4,dashboard=100;405
devicetype_sensor.dp1: (9FFFFF0501840460)/Lamp/0/nviLamp, label=LampIn 2a, displaytype=s4
devicetype_pulsegen.dp16: (900001153C000405)/device/0/nviCount,,contexts=floor
devicetype_pulsegen.dp15: (900001153C000405)/device/0/nvoSwOut,contexts=room
devicetype_pulsegen.dp14: (900001153C000405)/device/0/nviSwIn,contexts=room
devicetype_pulsegen.dp13: (900001153C000405)/device/0/nvoDevStatus,contexts=room
devicetype_pulsegen.dp12: (900001153C000405)/device/0/nviDevStatus,contexts=room,readonly=false
devicetype_pulsegen.dp11: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut,contexts=floor;room,dashboard=200;280;r
devicetype_pulsegen.dp10: (900001153C000405)/device/0/nviPulseEnable, label=PulseOut Enable
devicetype_sensor.dp7: (9FFFFF0501840460)/Lamp/0/nvoLampFb, field=state,label=LampOut 1b state, displaytype=r, dashboard=210;405
devicetype_sc100.dp8: DIO-01/TempSensor/0/nvoTempSensor, label=Temperture, units=°C, precision=1, displaytype=r;c, contexts=floor;room,dashboard=25;200
devicetype_sc100.dp8: DIO-01/TempSensor/0/nvoTempSensor, label=Temperture, units=°C, precision=1, displaytype=r;t, temp=cf;c, contexts=floor;room,dashboard=25;200

dashboard_image.image: image=images/user/starterkit.png,height=500
dashboard_dashboard1.dp01: PulseGen-1/device/0/nviLamp2, field=value, LampIn 1b value, displaytype=n, readonly=false
dashboard_dashboard1.dp02: PulseGen-1/device/0/nviLamp2, field=state, LampIn 1b state, displaytype=n, room,readonly=false
dashboard_dashboard1.dp03: PulseGen-1/device/0/nvoLamp2, field=value, label=LampOut 1b value, displaytype=r, room,dashboard=250;405;l4a;dodgerblue
dashboard_dashboard1.dp04: PulseGen-1/device/0/nvoLamp2, field=state, label=LampOut 1b state,displaytype=r, dashboard=230;405;l4a
dashboard_dashboard1.dp05: Sensor 1/LightSensor/0/nvoLightLevel, Light Level 2, units=lux, displaytype=c,dashboard=80;250
dashboard_dashboard1.dp05: Sensor 1/LightSensor/0/nvoLightLevel, Light Level 2, units=lux, displaytype=c,dashboard=80;250;r;2;0;
devicetype_pulsegen.dp27: (900001153C000405)/device/0/nvoLuxLevel, label=LuxLevel,displaytype=r;l, meter=0;400;yellow, units=lux
devicetype_pulsegen.dp28: (900001153C000405)/device/0/nvoPulseOut, label=Water PulseOut,displaytype=l, meter=0;100;blue, units=%

devicetype_pulsegen.dp11: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut,displaytype=g,guagemin=0,guagemax=100,guagecolors=green(30);yellow(50);orange(70);red
devicetype_pulsegen.dp11: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut,displaytype=g1,guagemin=0,guagemax=100,guagecolors=green(30);yellow(50);orange(70);red
dashboard_dashboard1.dp19:(900001153C000405)/device/0/nvoPulseOut, label=PulseOut GC,displaytype=g2, guagemin=0,guagemax=100,guagecolors=green;yellow(40);orange(60);red(80)
dashboard_dashboard1.dp06: PulseGen-1/device/0/nvoPulseOut, label=PulseOuty GC,displaytype=r;gc2, contexts=floor;room,dashboard=230;405,guagemin=0,guagemax=100,guagecolors=green;yellow(40);orange(60);red(80)


dashboard_dashboard1.dp11: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut3 M1,displaytype=m1,guagemin=0,guagemax=100,guagecolors=red;orange(40);green(80)
dashboard_dashboard1.dp12: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut3 M2,displaytype=m2,guagemin=0,guagemax=100,guagecolors=red;orange(20);green(40);orange(60);red(80)
dashboard_dashboard1.dp13: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut3 M green,displaytype=m,guagemin=0,guagemax=100,guagecolors=green
dashboard_dashboard1.dp14: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut3 M orange,displaytype=m,guagemin=0,guagemax=100,guagecolors=orange
dashboard_dashboard1.dp15: (900001153C000405)/device/0/nvoPulseOut, label=PulseOut3 M red,displaytype=m,guagemin=0,guagemax=100,guagecolors=red
dashboard_dashboard1.dp16: CPDsim-5/LuminairCntrl/0/nvoLampFb, label=Street light 5, field=setting/value, dashboard=720;55;led1, width=25, value=0:green;>0:orange;>=90:lawngreen
dashboard_dashboard1.dp21: CPDsim-1/LuminairCntrl/0/nviLampValue, label=Lamp In Street light 1, displaytype=s1

context_building.dp02: PulseGen-1/device/0/nvoLamp2, label=LampOut 2, dashboard=910;200;l4, context=Campus/Building
context_building.dp03: PulseGen-1/device/0/nvoPulseOut, label=nvoPulseOut 1, dashboard=900;140;r, context=Campus/Building
context_building.dp04: PulseGen-1/device/0/nvoLuxLevel, label=nvoLuxLevel 1, dashboard=550;100;r, context=Campus/Building, width=3em,height=1.5em,fontsize=1em,color=blue;red,units=lux
context_building.dp05: PulseGen-1/device/0/nvoLamp1, field=state, label=Occupied 1, dashboard=750;60;i, context=Campus/Building, width=25,value=0:images/user/occupiedSmallNo.gif;1:images/user/occupiedSmallYes.gif
context_building.dp06: PulseGen-1/device/0/nvoPulseOut, label=Water Level, dashboard=850;120;i, context=Campus/Building, width=25, value=0:0.gif;>0:10.gif;>=25:25.gif;>=50:50.gif;>=75:75.gif;>=90:90.gif;100:100.gif

context_building.dp07: PulseGen-1/device/0/nvoPulseOut, label= water temp, dashboard=830;120;t1, context=Campus/Building, width=25, folder=images/user/tank/tank_, value=>0:blue;>=25:cyan;>=50:green;>=75:orange;>=90:red;
devicetype_pulsegen.dp08: (900001153C000405)/device/0/nvoHVACTemp, label=Temp 1, displaytype=r;tc,units=°C, contexts=floor;room, temp=cf;c,dashboard=200;310
devicetype_pulsegen.dp17: (900001153C000405)/device/0/nvoPulseOut, Gen Temp PulseOut, displaytype=tc, temp=c+f;c;0;100
devicetype_pulsegen.dp07: (900001153C000405)/device/0/nvoLuxLevel, label=Light Level 1, displaytype=r;lc, units=lux, contexts=floor;room, meter=0;400;yellow, dashboard=100;310

dashboard_dashboard1.dp32: Thermostat-01/BV/51/Temperature Scale,label=Scale [0=°C;1=°F],displaytype=s2,dashboard=180;385;rbt

layout: elementborderstyle=solid, elementborderradius=25px, elementbordercolor=lightgrey

# Tag parameters are separated by "," and settings in a parameter are separated by ";"
For example: "label=Light Level 1, displaytype=r;c, units=lux, contexts=floor;room, dashboard=100;310"
"displaytype=r;c" means in floorplan view datapoint is read only, but in dashboard view the datapoint shows up as a chart

# Tag parameters ("," separates parameters and ";" separates settings in a parameter)
1. Label
2. demo
    a. demo:basic 
        means show only dashboard, no footer status, no tree
3. contexts
4. displaytype -   
    format "displaytype={contextview [optional]};{dashboardview}" or "displaytype={contextview/dashboardview}" 
    For example: "displaytype=r;c" means in floorplan view datapoint is read only, but in dashboard view the datapoint shows up as a chart
5. dashboard (means dashboard grapics) - used to place html elements over device type dashboard graphic (like temperature on a picture) 
    a. format: "dashboard={x};{y};{displaytype [optional]};{color [optional]};{backgroundColor [optional]};{padding count [optional]};{padding character [optional]};{alarm type [optional]}"
     or "dashboard={x};{y}"
     for optional parameters, if not specified then use default
    b. supported type: r,l2,l4,i,t1
    examples:  
    "dashboard=250;405" means put text value over graphic at absolute x=250px, y=405px,
    "dashboard=250;405;l4"  means put over graphic at absolute x=250px, y=405px, and display SNVT_switch as a LED
    "dashboard=250;405;l4;dodgerblue"  means put over graphic at absolute x=250px, y=405px, and display SNVT_switch as a LED with color dodgerblue
    "dashboard=250;405;l4;dodgerblue;grey;black"  means put over graphic at absolute x=250px, y=405px, and display SNVT_switch as a LED with ON color dodgerblue, Off color grey and border black
    "dashboard=250;405;r;white;red"  means put a text span at absolute x=250px, y=405px, with text color white and background color red
    "dashboard=250;405;r;;;4;0"  means put a text span at absolute x=250px, y=405px, with default text color white and default background color, pad 4 character with pad characer "0"
     "dashboard=250;405;r;;;3;1.5;, width=3em, height=1.5em, fontsize=1em" means the same as above but dashboard alarm type set to default and species the text area and fontsize of the graphic text
     "dashboard=860;30;t1, width=25, value=>=0:blue;>=20:cyan;>=40:green;>=70:orange;>=90:red;" means small themometer, width 25px, color based on value


# UI layout - site dashboard, campus, building and device dashboard
1. Default - automatically created and UI objects show up based on Window screen and will move when Window resized.
    a.  Uses tag .<tag#> to indicate the order to show datapoints in a table or on the floor/room/area 
     dashboard_dashboard1.dp11: 
     dashboard_dashboard1.dp12:
    b. UI elements can have an image which defaults to the upper left hand corner.
    c. Other UI elements are listed by UI type (order of precedence - which ones on top): dashboard, light or temperature plus chart, chart followed by DP table
2. Configure layout - layout doesn't change based on window resizing
    a. specify type - once specified all elements use this, except if x,y are specified.
        - cre = column-row-cell, means that UI is column oriented. So first you specify which column "c" (similar to Node-RED group), next which row "r", followed by cell in row "e". 
           - this is useful if you want to align things in a column, but on certain rows within the column to UI objects can fit on some rows.  
        - rc = row-column, means that is table oriented. So which row, followed by column in row.  "r1;c2", "rb,c2" where "rb" is bottom row (last row)
        - cr = column-row, means that specify the column and then which row in the column.
        dashboard_dashboard1.layout: layout=crc, table=c1;rb

        dashboard_dashboard1.dp05: Sensor 1/LightSensor/0/nvoLightLevel, label=Light Level 2, units=lux, displaytype=c,dashboard=80;250,layout=c1;r2;e1
        dashboard_dashboard1.dp06: Sensor 1/LightSensor/0/nvoTemperature, label=Temp 2, units=°C, displaytype=c,dashboard=80;260,layout=c1;r3;e1
        dashboard_dashboard1.dp07: Sensor 1/LightSensor/0/nvoTemperature2, label=Temp 2, units=°C, displaytype=c,dashboard=80;260,layout=c1;r3;e2
    b. Fixed x,y coordinates
        - Each datapoint UI chart or guage element element can be placed at a fixed location (e.g., put a guage on an image) 
        dashboard_dashboard1.dp07: Sensor 1/LightSensor/0/nvoTemperature2, label=Temp 2, units=°C, displaytype=c,dashboard=80;260,layout=c1;r3;e2
    d. Image - only one allowed
        dashboard_dashboard_image.image: image=images/user/starterkit.png,height=500,layout=c2;r1,e1
        dashboard_dashboard_image.image: image=images/user/starterkit.png,height=500,layout=x100;y200
    e. icon - uses a image on top of the dashboard image, can have more than one
        dashboard_image.icon: image=images/user/ft6050_device.jpg,height=50,x=50,y=50,device=PulseGen-01
        dashboard_image.icon: image=images/user/ft6050_device.jpg,height=50,x=150,y=50,device=PulseGen-02    
    f. Table layout
        dashboard_dashboard1.layout: layout=cre, table=none, eWidth=300, eHeight=200
        dashboard_dashboard1.layout: layout=cre, table=c3;r1;e1, eWidth=300, eHeight=200
        dashboard_dashboard1.layout: layout=cre, table=c3;r1;e1;readonly, eWidth=300, eHeight=200
        dashboard_dashboard1.layout: layout=cre, table=c3;r1;e1;showpriorities, eWidth=300, eHeight=200
3. Display Type border style has the following settings you can change

    layout: elementborderstyle=solid, elementborderradius=25px, elementbordercolor=lightgrey

# Adding devices to the SmartServer
Setup your SmartServer with the CMS (adding devices, datapoint properties, schedules, data log, and alarms) and then you can use the NavTree Web page to monitor and control datapoints.

# Issues using Multiple WebSockets Web Pages (two or more CMS or Custom Web pages) at the same time
The Browser Web page uses WebSockets like the CMS Web page for datapoint filtering (CMS Datapoint Browser Widget). When you have two WebSocket Web pages (whether two CMS or one CMS and one Browser Web page) open they will interfere with each other as there is only one WebSocket datapoint subscribe list per user login.  This same issue also occurs when using two CMS Web pages at the same time for a single user login. To get one page to work properly, you need to re-subscribe to the datapoint list (though the other Web pages may then have an issue). To overcome this both the NavTree and CMS periodically send out a new subscribe list, but they will most likely interfare which each other which may result in some or none of the datapoints being updated on each Web page. In the CMS Datapoint Browser Widget, click the datapoint filter apply button to re-subscribe the datapoint list.  *The workaround to this issue is to use a different login for each WebSocket Web page*

Custom Web pages can be developed to not use WebSockets, but WebSockets provide faster response time and so many custom Web pages will use WebSockets.

Web Sockets provide datapoint updates, device status updates and warning messsage. So if you select to not use Web Sockets you will need to click the Refresh button to see Device status updates. 

# How to add custom tags to the context
1. Use the CMS Planning Widget - you can add/delete/modify one tag at a time
    - do not change or delete the context color tag as that is used for by the CMS.
2. SmartServer Browser (1.27+) Web page allows you to append one or more custom tags at a time or delete all the tags, but keep the color tag.
    - It also allows you to export all the existing tags to a file (you can't import this file but you can see all custom tags)
    - The SmartServer Browser Web page is available at github at the same location as the NavTree Web page

# Example
For this example, you have a site with multiple MultiSensor FT 6050 EVBs (provided by Renesas) and you want to limit the number of datapoints being shown. You configure the CMS Planning Widget to show a Region, Campus, a building, a floor (floor1) and three rooms (reception, conference room, offices). Each room has one FT 6050 in it. You want to show show a couple of datapoints in the floor floorplan, and a couple of more in the room floorplan, and in the dashboard view you want to a image with datapoints and a chart for some of the datapoints. Due to the layout of the floor, when you show the floor floorplan the datapoint overlap so you need to move the position of the datapoint in one room (conference room).  You will add custom tags to the CMS Planning widget context to customize your Web site. In addition, even though all three rooms have the same device, in the reception we want to show a different set of datapoints by specifying the datapoints in the reception context

Use the CMS Planning Widget to add the following tags to the specified context
1. Add a Campus image to the Campus context

tagname: image   tagvalue: image=images/user/campus1.png,above=false,location=XYZ Corporation

2. Add the MultiSensor datapoints to the Campus context
tagname: devicetype_image.image    tagvalue: devicetype=(900001153C000405;9FFFFF0501840460),image=images/user/ft6050_device.jpg,width=null,height=nul
tagname: devicetype_sensor.dp1    tagvalue: (9FFFFF0501840460)/TempSensor/0/nvoTemperature, label=Temp 2, displaytype=r;c, units=°C, contexts=floor;room,dashboard=200;310
tagname: devicetype_sensor.dp2    tagvalue: (9FFFFF0501840460)/LightSensor/0/nvoLightLevel, label=Light Level 2, units=lux, displaytype=r;c,contexts=room,dashboard=100;310
tagname: devicetype_sensor.dp3    tagvalue: (9FFFFF0501840460)/Lamp/0/nviLamp, label=LampIn 1b, displaytype=s4 
tagname: devicetype_sensor.dp4    tagvalue: (9FFFFF0501840460)/Lamp/0/nvoLampFb, label=LampOut 1b, displaytype=l4, dashboard=210;405;l4
tagname: devicetype_sensor.dp5    tagvalue: (9FFFFF0501840460)/Lamp/1/nviLamp, label=LampIn 2b, displaytype=s4, contexts=floor;room
tagname: devicetype_sensor.dp6    tagvalue: (9FFFFF0501840460)/Lamp/1/nvoLampFb, label=LampOut 2b, displaytype=l4, contexts=floor;room,dashboard=250;405;l4
    // shows datapoint fields by specifying the "field=" parameter
tagname: devicetype_sensor.dp7    tagvalue: (9FFFFF0501840460)/Lamp/0/nvoLampFb, field=state,label=LampOut 1b state, displaytype=r, dashboard=210;405
tagname: devicetype_sensor.dp8    tagvalue: (9FFFFF0501840460)/Lamp/0/nvoLampFb, field=value,label=LampOut 1b value, displaytype=r, dashboard=240;405

3. Add a Building image to the Building context

tagname: image    tagvalue: image=images/user/building1.png,above=false,location=3600 Peterson Way

4. Change the reception room list of datapoints (compuse/building/floor1/reception room)

tagname: devicetype_sensor.dp3    tagvalue: (9FFFFF0501840460)/Lamp/0/nviLamp, LampIn 1b, displaytype=s4, contexts=room
tagname: devicetype_sensor.dp4    tagvalue: (9FFFFF0501840460)/Lamp/0/nvoLampFb, LampOut 1b, displaytype=l4, contexts=room


5. Change location of where the conference room datapoint are displayed (compuse/building/floor1/confernce room)

tagname: offsetx    tagvalue: 50
tagname: offsety    tagvalue: -150

6. Adding Guages

7. Adding Meter (horizontal)

8. Demo mode
    demo:basic            - this is used to show a striped down version. No tree and clicking datapoint do not take you to devices. Add campus context, and dashboard tags. 

# user.js
The user.js file allows you to customize the NavTree if context are not used or if you want to change default settings.  For example, the default is to show a chart in the dashboard view for  all outputs.  You can go to the user.js file and change the default.  If you want to change any default it is best to use the user.js file and not change the source code anywhere else.

To ignore the user.js replacement settings use the following custom tag in the Campus context custom tags
contexttagsonly=true
More than one site dashboard can be specified. The selection of which site dashboard is used for this specific Smartserver is determined by the dashboard type 

1. dashboardtype is used to specify which dashboard to use. If only one specified then that is always used.
    a. SID, ip address, whether at least one device in the dashboard is available, or by dashboard name
    b.  
2. 

# navtree.html
You will want to customize this for any site you want to use this web page. For example change the company name from XYZ in the title and footer.

# Installation
1. Unzip the NavTree_xxx.zip file 
2. Go into the NavTree folder and copy the NavTree folder to 
/var/apollo/www/user
3. In /var/apollo/www/user rename login1.html to login.html
4.  Optional (but don't use on a production site) change the SmartServer landing Webpage (create a home.html) to add a Browser button to the Smartserver home page (you can use the provided home.html page) located in 
/var/apollo/www/user

# Accessing the Web page (change IP address below to your SmartServer IP address)
https://10.0.0.240/user/navtree/navtree.html

# Polling rate
When polling datapoints, the NavTree polls no faster than 10 datapoints every two seconds (5 EPS).

# Typical Use Cases
1. **See site dashboard** - Create a site dashboard. If contexts not used then setup dashboard datapoints using user.js file
2. **See devices on each floor/room/area** - Use the CMS Planning Widget to set up a navigation tree.
3. **See datapoints in context** - Use CMS Planning tree and setup custom tags in the Campus or other context, or use the user.js file.
4. **Limit what datapoints are shown or specify how datapoints are show (e.g., a chart)** - Use CMS Planning tree and setup custom tags in the Campus or other context, or use the user.js file.
5. **Limit what a user can see** - Partially working, use CMS Planning tree and setup custom tags in the Campus or other context, or use the user.js file.

# Versions
1.22 
    a. Added Map support
       i   Added Dynamicaly Creates site dashboard for known devices
       ii. Alternative is to use Planning Widget Context custom tags or custom javascript in user.js
    b. Added Dynamicaly Creates site dashboard for known devices
       i. Alternative is to use Planning Widget Context custom tags or custom javascript in user.js
    b. Fixed a number of issues
1.18 
    a. Fixed a number of issues
    b. Added LED1, t1 graphics.
1.17
    a. added support for region context
1.16
    a. Supports EnOcean devices
    b. Fixed context issue for pre 4.0 (world context not included)
    c. Fix Deleting schedule event. Previously nothing happened when deleting schedule
1.15
    a. Supports World context
    b. Many enhancements and fixes
    c. Supports demo mode - using context tags only shows dashboard 
1.12
    a. Fixed Data log duration zoom chart
    b. Fixed Data log charts start.
1.09
    a. Data log charts can now flip back and forth to No limit and any option. Prior when changing to 10 minutes all logs before the last 10 minutes was deleted.
    b. Added more custom tags.
1.04
    a. Fixed Schdeule issue showing events that overlap days (eg., start sunrise and end sunset)
    b. Added image swapper support to Dashboard, campus and building contexts
1.03
    a. Added Thermometer, and lightmeter (lightmeter can be used for any vertical meter usage like humidity)
    b. Added image swapper support to Dashboard, campus and building contexts
1.02
    a. Added Guages, Guage with Chart, Meter, and sliders graphics
    b. You can now put datapoints on the Campus and building graphics.
    b. Added a Wait spinner 
1.01
    a. Floorplan - Added field support for structured datapoints
    b. Global Tags - were previously only added by Planning Widget Campus CustomTags, now can be added by user.js file
    c. Added "precision" for for "devicetype_" custom tag/global tags 
    d. Added Site Dashboard. Add custom tags to Campus or global tags. Site dashboard tags start with "dashboard_"
    e. Fixed issue with Custom tags process order (check device names, next device types, followed by program Ids).
    f. Fixed issue with Device Logs Zoom not working
    g. Added roomoffsets to campus custom tags "roomOffsets: xoffset=50,yoffset=-50"
1.00 - Initial Release

# Troubleshooting
1. Datapoints don't show updates - This typically means that another Web page is open for this user login and both Web pages are interferring with each other
    a. If you need two Web pages open, 
        - i. either look at the same list of datapoints but that can be hard to guess
        - ii. Have only one Web page looking at datapoints at a time. Change the Web page that you are not currently using
            a. For NavTree, click on the Schedules node in the Navigation pane.
            b. For CMS Web page, click on a Dashboard that doesn't have a Datapoint Widget.
2. Different username doesn't seem to work. In SmartServer 3.4 only owners see devices. 
3. Datapoint doesn't show up in details pane
    a. Context custom tag datapoint name is incorrect
    b. No matching device
    c. Incorrect custom tag parameters
4. Planning View shows units but not value - datapoint is incorrect (need to use datapoint XIF name)
5. Device Dashboard - datapoint is not showing up, or only units  - datapoint is incorrect (need to use datapoint XIF name)



