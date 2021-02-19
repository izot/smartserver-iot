
**SmartServer IoT StarterKit Dashboard (Fixed Datapoints)**
This flow is an example of a SmartServer IoT Starter Kit Dashboard Web page using Node-RED webflows. This flow uses fixed datapoints so you will need to re-assign all the datapoints once you import the flow into the CMS Sequence widget.

The Dashboard is made up of 3 groups which show up as three columns on the Dashboard Web page. The left hand group (group 1) uses a template node with a picture of the Starter kit. Group 2 and 3 use the normal dashboard nodes.  

The Starter Kit background image (group 1) has clickable buttons that control datapoints on the nearby devices, LEDs that represent the current state of some datapoints, and LED display that shows what you would see on the real device.  On the thermostat (lower-right hand corner of the image) you can switch the thermostat to use Celsius or Fahrenheit.  The thermostat Tstat Setpoint slider (lower-right) of group 2 can then be used to change the thermostat value in celsius or fahrenheit.
 
# Adding devices to the SmartServer
Add all the Starter Kit devices to the SmartServer using the CMS Web pages prior to importing this Node-RED flow.


# Installation
1. Import the Starter Kit Dashboard
    - Go to the CMS Sequence Widget and import the StarterKit_NodeRedflow_webflow_xxxx.json file 
2. Change the Dashboard Theme (background colors) 
    - Click the dropdown in the sidebar and select Dashboard
    - Click the "Theme" tab
    - Change Style to "Dark" and color to teal Red:9, Green:116, Blue:121
    - Click the "Deploy" button to save the changes
3. Re-assign all the IAP-Input and IAP-Output nodes (green nodes) for the datapoints on your Starter Kit
    - Double-click each green node and re-assign the datapoint - you must de-select the current datapoint and select the new datapoint
    - Click "Deploy" button to save your work
4.  Click the "Dashbord" button (upper-right hand corner of the Widget) to see all the Dashboards.
    - If more than one Dashboard Web page then use the Dashboard navigation button to go to the StarterKit Dashboard
    - Click the export to new tab button (upper-right hand corner of Widget, rectangle with up arrow) to open Dashboard in a new tab 
