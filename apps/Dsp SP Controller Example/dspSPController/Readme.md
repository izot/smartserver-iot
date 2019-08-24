#Setup Instructions
1.  The file **DspSPControllExample.dtp** should be imported in the CMS Device Types widget.
2.  In the Device Type widget, Select Import device type, and import the file  DspSP Control Example DRF Inc.dtp
3.  Allow time to bake (2-3 minutes).  3 device types will be created.
4.  Use the files in the folder **Internal App EVB Files** to set up a set of target EVB 6050/5000 devices.  You should load one EVB 6050 with the file DAC6000.ndl. and one or more target running the file with VAVsim6000.ndl.  
5.  Edit the file VAV Sim External Device.csv **SmartServer Support** folder to match your device set.  You are editing the Unique/NIDs for the devices.
6.  Use the Device widget to import the devices in the file edited in step 5.
7.  Provision your Evb targets in the CMS.
