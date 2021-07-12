
**SmartServer IoT Browser (1.20)**

The Smartserver IoT Browser Web page is a testing tool for the SmartServer IoT (3.1 or later) using the REST API and WebSockets. The Browser Web page uses views (for example, the Datapoint View is similar to the CMS Datapoint Browser), controlled by the sidebar menu buttons, to display common functions like devices and datapoints.  The browser Web page allows you to check SmartServer configuration and to monitor and control devices datapoints.

The Browser Web page provides the SmartServer data in a different format then the CMS, and has features that are not implemented in the CMS (for example, the Data Log view shows datapoint data logs for multiple datapoints and datapoints with fields on a single chart, and the Dashaboard View shows sample dashboard UI for the listed datapoints). Both the Dashboard and Data Log views can show logged data plus live data.

*The Browser Web page shouldn’t be used as your primary tool on a production site as it doesn't go through extensive testing*.  Additionally, this version doesn't use pagination for REST request which may be necessary for large networks. 

When you first go to the Browser Web page it will read all the planning contexts (same as CMS Planning Widget) and all the devices with two REST commands (no pagination). You can navigate between views.  When you leave a view the data and settings are saved  temporarily so when you go back to a previous view you will start off where you left off.  The saved settings are lost do due a Web browser refresh (F5), starting a new browser session or logging into the Web page.

When you first go into the Browser Web page, it will read all the devices and Planning Context data so it can take some time on a SmartServer with a lot of devices and Context. In the bottom left-hand corner the status of all devices are listed.  Use the Planning View *Refresh All* button to reload all the Devices and context data. Use the Planning View to see which contexts have problem devices.

The Browser Web page displays the SmartServer version, Current Events per second (EPS), and SmartServer CPU (requires you to go to CMS Web page first -- only CMS Web page can enable this feature) at the top of the Web page, and the device status and the number of active alarms at the bottom of the Web page.

The Planning and Dashboard Views are more like what an end user UI would look like. The Other Views provide more indepth information and are more useful for troubleshooting.

Use the help "?" button to see ser documentation and version information

# Adding devices to the SmartServer
Setup your SmartServer with the CMS Web page (adding devices, datapoint properties, schedules, data log, and alarms) and then you can use the Browser Web page to monitor and control datapoints.

# Issues using Multiple WebSockets Web Pages (two or more CMS or Custom Web pages) at the same time
The Browser Web page uses WebSockets like the CMS Web page for datapoint filtering (CMS Datapoint Browser Widget). When you have two WebSocket Web pages (whether two CMS or one CMS and one Browser Web page) open, for the same user login, they will interfere with each other as there is only one WebSocket datapoint subscribe per user login.  This same issue also occurs when using two CMS Web pages at the same time for a single user login. To get one page to work properly, you need to re-subscribe to the datapoint list (though the other Web pages may then have an issue). In the CMS Datapoint Browser, click the datapoint filter apply button to re-subscribe the datapoint list. In the Browser Web page, click the re-subscribe button to re-subscribe the datapoint list.  In the CMS, the Datapoint Browser Widget uses WebSockets, and in the Browser Web page the Dashboard, Datapoints and Favorites Views use WebSockets. *The workaround to this issue is to use a different login for each WebSocket Web page*

Custom Web pages can be developed to not use WebSockets, but WebSockets provide faster response time and so many custom Web pages will use WebSockets.

# Installation
1. Unzip the Browser_xxx.zip file 
2. Go into the Browser folder and copy the Browser folder to 
/var/apollo/www/user
3. In /var/apollo/www/user rename login1.html to login.html
4.  Optional (but don't use on a production site) change the SmartServer landing Webpage (create a home.html) to add a Browser button to the Smartserver home page (you can use the provided home.html page) located in 
/var/apollo/www/user

# Accessing the Web page (change IP address below to your SmartServer IP address)
https://10.0.0.240/user/browser/browser.html

# Polling rate
When polling datapoints, the Browser polls no faster than 10 datapoints every two seconds (5 EPS).

# Typical Use Cases
1. **See up and down devices** - Go to Planning View to see navigation tree and which context has problem devices
2. **Look at a device's datapoints** 
  - Go to Planning View, naviagte to device or datapoint and click device or datapoint. Click *Dashboard* button to see a dashboard of datapoints, or select the FAV datapoints and click the *FAV Dashboard* to see a dashboard of FAV datapoints from one or more devices.
  - Go to Devices View, use device list or filter on devices, and then click on Menu "..." button for specific device and select *Show Dashboard* or *Show Datapoints*.
4. **Look at at a subset of datapoints from multiple devices** - go to Datapoints View, and use *Get DPs by Filter* to see list of datapoints, check the FAV checkbox for all datapoints you want to look at. Keep changing filter and checking the Datapoint checkboxes for datapoints you want to look at.  Once done go to Favorite DPs View to see list. You can save the Favorite DPs list to the CMS favorites so that you can access these same datapoints later. 
5. **Look at CMS Favorite Datapoints list** - Go to **Favorite DPs** view and click the *FAVs Menu* to see all Favorites in CMS.
6. **Look at data logs** - Go to the Planning, Devices, Datapoints or Favorite DPs Views click the menu and select *Data Logs* or *Logs* button. This will take you to the Data Log View with the Datapoints textbox filled out. Select the time frame you are interested in and click the "GET" button. You must configure logging in the CMS Datapoint Properties Widget for these datapoints before logs will be available.
7. **Help** - Click the help "?" button for user documention, troubleshooting and version information.

# Summary of Browser Views (Sidebar Buttons)
1.	**Planning** – provides a navigation tree and shows if any problem devices for a specific context
2.	**Dashboard** – shows a sample datapoint dashboard (including charts) for a device or a set of datapoints. 
3.	**Devices** – shows device list based on Device Filter. *Refresh All* gets information for all devices. 
4.	**Datapoints** – similar to CMS Datapoint Browser, check FAV checkbox to select which datapoints show up in Favorite DPs View. 
5.	**Favorite DPs** – Used to show a subset of datapoints. Use Datapoint View or CMS FAVs to select datapoints to view. 
6.	**Show DP Info** – Shows how a datapoint or a devices datapoint is used in the SmartServer.
7.	**Active Alarms** – shows active alarms
8.	**Data Logs** – Chart and table for logged data. Once you get initial data log, you can click the poll checkbox in order to get constant data log updates 
9.	**Schedules** – shows schedule events
10.	**Device Types** – Shows Device’s Device types
11.	**Configured DPs (DLA)** – Shows all Datapoint Properties (DLA settings)
12.	**Node-RED** - Shows what IAP or MQTT Input and Output nodes are used.
13.	**Connections** – Shows connections (CON) file
14.	**Service Pin Messages** – LON Devices only - Shows Service pin messages received by SmartServer while in this view
15.	**API Tester** – Used to test REST API requests (can’t be used to see WebSocket updates). 



