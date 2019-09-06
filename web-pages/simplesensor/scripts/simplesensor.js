/*
	Device Browser - This Web page is used to show Device and Device 
	Datapoint (DP) informtion and is one of the major tools to troubleshoot
	IzoT network issue.


	# Copyright (C) 2013 Echelon Corporation.  All rights reserved.
	#
	# Use of this code is subject to your compliance with the terms of the 
	# Echelon IzoT(tm) Software Developer's Kit License Agreement which is 
	# available at www.echelon.com/license/izot_sdk/. 


*/
		/* 
			Web page first issue GET requet with TAG.  Next each datapoint supported in Web page is checked if included in GET response.  If not found then
			the Web page tag (needs to be different for each Web page) is added to all datapoints which are read-only,Read/write.  A GET request (without Tags) is
			issued for any read-once.  After that GET request with the Web page TAG is issued periodically
		*/
		function init() {
			
			g_sWebpageTag = "xyz_simplesensor=1"; /*  **** Custom Web page #3 - must be different for each Web page ****/

			/*  **** Begin -- *** Custom Web page #4  *** -Change code below   *****   */
			var iIndex = -1;
			
			iIndex ++;
			g_dpList[iIndex] = {};  // one HTML element using a single datapoint value
			g_dpList[iIndex].dpName = "Sensor1/Lamp/0/nviValue";  // dpName is same as the element Id (only works if DP is used only once on Web page)
			g_dpList[iIndex].displayElements = [];  // list of HTML element using this DP, create one entry per HTML element (e.g., span, input)
			g_dpList[iIndex].displayElements[0] = {};
			g_dpList[iIndex].displayElements[0].displayId = "Sensor1/Lamp/0/nviValue";
			g_dpList[iIndex].displayElements[0].field = ""; // ""=entire value, not equal "" means field value
			g_dpList[iIndex].displayElements[0].type = "rw"; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			g_dpList[iIndex].displayElements[0].displayType = "input";
			
			iIndex ++;
			g_dpList[iIndex] = {};   // three HTML elements using a single datapoint value
			g_dpList[iIndex].dpName = "Sensor1/Lamp/0/nvoValueFb";
			g_dpList[iIndex].displayElements = [];
			g_dpList[iIndex].displayElements[0] = {};
			g_dpList[iIndex].displayElements[0].displayId = "Sensor1/Lamp/0/nvoValueFb";
			g_dpList[iIndex].displayElements[0].field = ""; 
			g_dpList[iIndex].displayElements[0].type = "r"; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			g_dpList[iIndex].displayElements[0].displayType = "span";
			g_dpList[iIndex].displayElements[1] = {};
			g_dpList[iIndex].displayElements[1].displayId = "Sensor1/Lamp/0/nvoValueFb/state";
			g_dpList[iIndex].displayElements[1].field = "state"; 
			g_dpList[iIndex].displayElements[1].type = "r"; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			g_dpList[iIndex].displayElements[1].displayType = "span";
			g_dpList[iIndex].displayElements[2] = {};
			g_dpList[iIndex].displayElements[2].displayId = "Sensor1/Lamp/0/nvoValueFb/value";
			g_dpList[iIndex].displayElements[2].field = "value"; 
			g_dpList[iIndex].displayElements[2].type = "r"; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			g_dpList[iIndex].displayElements[2].displayType = "span";
			
			iIndex ++;
			g_dpList[iIndex] = {};
			g_dpList[iIndex].dpName = "Sensor1/LightSensor/0/nvoLuxLevel";
			g_dpList[iIndex].displayElements = [];
			g_dpList[iIndex].displayElements[0] = {};
			g_dpList[iIndex].displayElements[0].displayId = "Sensor1/LightSensor/0/nvoLuxLevel";
			g_dpList[iIndex].displayElements[0].field = ""; 
			g_dpList[iIndex].displayElements[0].type = "r"; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			g_dpList[iIndex].displayElements[0].displayType = "span";
			
			/*  **** End -- *** Custom Web page #4  *** - Change code above    *****   */

			init1();
			
		}
		function writeValue(iIndex,displayIndex) {
			/*  **** Begin -- *** Custom Web page #5  *** -Change code below   *****   */
			
			url = "https://" + location.hostname; // + ":8443";
			url += "/iap/devs/*+name==" + g_dpList[iIndex].dpUrl + "/value";
			var value = document.getElementById(g_dpList[iIndex].displayElements[displayIndex].displayId).value;
			value = "{" + value + "}"
			if(validateData(1,"SNVT_switch","",value)) // SmartServer doesn't validate values, so your Web page needs to
			{
				g_dpList[iIndex].value = "{" + value + "}"; //"{" + value + "}";
				payload = value;
				g_dpList[iIndex].writeTimestamp = Date.now();
				requestWriteData(0, url, payload, null, null);
			}
			else {
				var value1 = g_dpList[iIndex].value;
				if(value1.length > 1)
					value1 = value1.substr(1, value1.length - 2);
				document.getElementById(g_dpList[iIndex].displayElements[displayIndex].displayId).value = value1;
			}
			
			/*  **** End -- *** Custom Web page #5  *** - Change code above    *****   */
		}
		function validateData(mode,snvtType, field, valueStr) {
			// check write data as SmartServer doesn't check
			// mode: 0=respond back true=valid, false=invalid, 1=same as 0 plus show alert
			// field: ""=entire DP
			/*  **** Begin -- *** Custom Web page #6  *** -Change code below   *****   */
			var bResult = false;
			var sErrMsg = "";
			var i;
			try
			{
				var json = JSON.parse(valueStr);
				if(snvtType == "SNVT_switch")
				{
				
					for (x in json) 
					{
				
						if(x == "state")
						{
							bResult = true;
							var value = json[x];
							
							if(!((value >= 0) &&  (value <= 1))) {	
								bResult = false;
								break;
							}

						}
						else if(x == "value")
						{
							bResult = true;
							var value = json[x];
							if(!((value >= 0) &&  (value <= 100))) {
								bResult = false;
								break;
							}
						}
						else {
							bResult = false;
							break;
						}
					}
					if(!bResult)
					{
						if(field == "")
							sErrMsg = "state: 0 - 1,  value = 0 - 100"; 
						else if (field == "state")
							sErrMsg = "valid values: 0 or 1"; 
						else if (field == "value")
							sErrMsg = "valid values: 0-100"; 
					}
				}
			}
			catch (err) {}
			if(!bResult && (mode == 1))
			{
				alert("value is incorrect:\n  " + valueStr + "\n\nValid value:\n   " + sErrMsg + "\n\nPlease try again");
			}
			/*  **** End -- *** Custom Web page #6  *** - Change code above    *****   */
			return bResult;
		}
