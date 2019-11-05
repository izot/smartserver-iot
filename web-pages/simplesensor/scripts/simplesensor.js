/*
	Simple Sensor - This Web page is used to show the NcMultiSensor Datapoints (DPs).


	# Copyright (C) 2019 Echelon Corporation.  All rights reserved.
	#
	# Use of this code is subject to your compliance with the terms of the 
	# Echelon IzoT(tm) Software Developer's Kit License Agreement which is 
	# available at www.echelon.com/license/izot_sdk/. 


*/
// ****************************************************************************************
//	init1()
//   
//  This function sets the initial of global variables and ties HTML elements to the g_dpList array
// 
//*****************************************************************************************
function init1() {
	
	/*  **** Begin -- *** Custom Web page #4  *** -Change code below   *****   */
	g_sWebpageTag = "xyz_simplesensor";  // needs to be unique for each Web page, up to three additional tags get automatically 
									//created based on this namedepending on datapoint settings
	ivMax_Age = -1; // -1= on-demand polling disabled(Only, MODBUS, BACNET, IOX or Internal Devices)
					//  0=all datapoints use max_age (all devices are external LON devices), 
					//  1=Web page has External LON devices (and needs on on-demand polling) and NON-LON devices

	var dpObj;
	var displayObj;
			
	dpObj = new dpObject("Sensor1/Lamp/0/nviValue",false);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nviValue/state", "state", "rw", "input");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nviValue/value", "value", "rw", "input");
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/Lamp/0/nvoValueFb",true);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/state", "state", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/value", "value", "r", "span");
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/LightSensor/0/nvoLuxLevel",true);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/LightSensor/0/nvoLuxLevel", "", "r", "span");
	g_dpList.push(dpObj);

	/*  **** End -- *** Custom Web page #4  *** - Change code above    *****   */
}

// ****************************************************************************************
//	writeValue()
//   
//  This function takes the two field values for a datapoint and writes the full datapoint value to the SmartServer
// 
//*****************************************************************************************		
function writeValue(dpName) {
			/*  **** Begin -- *** Custom Web page #5  *** -Change code below   *****   */			
	var valueField;
	var stateField;
	var value;

	valueField = document.getElementById(dpName + "/value").value;  // ONLY works if dpname/fieldname value are used as element id
	stateField = document.getElementById(dpName + "/state").value; // ONLY works if dpname/fieldname value are used as element id
	value = "{\"state\":" + stateField + ",\"value\":" + valueField + "}"
	if(validateData(1,"SNVT_switch","",value)) // SmartServer doesn't validate values, so your Web page needs to
	{
		requestWriteData(dpName,value);
	}
	else 
	{ // bad value so change back to old value
		
	}
	/*  **** End -- *** Custom Web page #5  *** - Change code above    *****   */
}
		
// ****************************************************************************************
//	validateData()
//   
//  This function verifies that the state and value fields of SNVT_switch datapoint are correct
//	mode: 0=respond back true=valid, false=invalid, 1=same as 0 plus show alert
//	field: ""=entire DP, otherwise specific datapoint field
// 
//*****************************************************************************************	
function validateData(mode,snvtType, field, valueStr) {

	/*  **** Begin -- *** Custom Web page #6  *** -Change code below   *****   */
	var bResult = false;
	var sErrMsg = "";
	var json;
	var value;
	var x;
	try
	{
		json = JSON.parse(valueStr);
		if(snvtType == "SNVT_switch")
		{
			
			for (x in json) 
			{
				
				if(x == "state")
				{
					bResult = true;
					value = json[x];
					
					if(!((value >= 0) &&  (value <= 1))) {	
						bResult = false;
						break;
					}
				}
				else if(x == "value")
				{
					bResult = true;
					value = json[x];
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
