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
//  This function sets the initial of global variables and ties HTML elemetns to the g_dpList array
// 
//*****************************************************************************************
function init1() {
	
	/*  **** Begin -- *** Custom Web page #4  *** -Change code below   *****   */
	g_sWebpageTag = "xyz_sensor1";  // needs to be unique for each Web page, up to three additional tags get automatically 
									//created based on this namedepending on datapoint settings
	ivMax_Age = -1; // -1= on-demand polling disabled(Only, MODBUS, BACNET, IOX or Internal Devices)
					//  0=all datapoints use max_age (all devices are external LON devices), 
					//  1=Web page has External LON devices (and needs on on-demand polling) and NON-LON devices

	var dpObj;
	var displayObj;
			
	dpObj = new dpObject("Sensor1/Lamp/0/nviValue",false);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nviValue/state", "state", "rw", "input");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nviValue/value", "value", "rw", "input");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/state_2", "state", "r", "function", lampImageSwapper);
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/Lamp/0/nvoValueFb",true);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/state", "state", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/value", "value", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/0/nvoValueFb/state_2", "state", "r", "function", lampImageSwapper);
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/Lamp/1/nviValue",false);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nviValue/state", "state", "rw", "input");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nviValue/value", "value", "rw", "input");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nvoValueFb/state_2", "state", "r", "function", lampImageSwapper);
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/Lamp/1/nvoValueFb",true);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nvoValueFb/state", "state", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nvoValueFb/value", "value", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/Lamp/1/nvoValueFb/state_2", "state", "r", "function", lampImageSwapper);
	g_dpList.push(dpObj);

	dpObj = new dpObject("Sensor1/LightSensor/0/nvoLuxLevel",true);
	dpObj = addDisplayElementToDpObject(dpObj, "Sensor1/LightSensor/0/nvoLuxLevel", "", "r", "span");
	g_dpList.push(dpObj);

		// JsFunction -- create dp list 
	jsFunctionDpList = [];
	dpObj = new dpObject("Sensor1/Lamp/0/nvoValueFb",true);
	jsFunctionDpList.push(dpObj);
	dpObj = new dpObject("Sensor1/Lamp/1/nvoValueFb",true);
	jsFunctionDpList.push(dpObj);
	addJavascriptFunctionTojsFunctionObject(null, "sum", jsFunctionDpList, sum);

	/*  **** End -- *** Custom Web page #4  *** - Change code above    *****   */
}
// ****************************************************************************************
//	imageStateClicked()
//   
//  This function writes a "state" value to a SNVT_switch datapoint when an image is clicked
//	SNVT_switch value has two fields: state and value; this function only changes state
//	displayObject - this is usually an output Datapoint, though it can be an input Datapoint
//	writeDpName - this is an input Datapoint;
// 
//*****************************************************************************************
function imageStateClicked(displayObject, writeDpName) {
	
	
	var displayId = displayObject.id;
	var iIndex = -1;//DP index in g_dpList
	var value;
	var json;
	try {

		var dpInfo = currentDpValueById(displayId);  // output
		if(dpInfo != null){
			if((dpInfo.dpName != "") && (dpInfo.value != "") && (dpInfo.value != "")) {
				value = dpInfo.value;
				iIndex = dpInfo.index;
				json = JSON.parse(value);
					// toggle state between 0 and 1
				if(document.getElementById(displayId).src.endsWith("images/switchTradGreenOn.gif")) {
					json.state = 0;
					document.getElementById(displayId).src = "images/switchTradOff.gif";
				}
				else {
					json.state = 1;
					document.getElementById(displayId).src = "images/switchTradGreenOn.gif";
				}
				
				value = JSON.stringify(json);
				requestWriteData(writeDpName, value);
			}
		}
	}
	catch(e) {}

}
// ****************************************************************************************
//	lampImageSwapper()
//   
//  This function changes an image when the datapoint value changes.
//	This function supports 2 images but you can create image swapper with more than two images
//	displayId: HTML element Id.
//	dpName: datapoint path name, not used in this example
//  fieldName: specific field, not used in this example
//	value: datapoint or datapoint field value
// 
//*****************************************************************************************
function lampImageSwapper(displayId,dpName,fieldName, value) {
	try 
	{
		
		if((displayId == null) || (dpName == null) || (fieldName == null) ||(value ==null))
			return;
		if((displayId == "") || (dpName == "") ||(value == ""))
			return;
	
		if(typeof value === "string"){
			value = Number(value);
		}
		var src =  "images/switchTradOff.gif";
		if(value === 1)
			src = "images/switchTradGreenOn.gif";
		if(!document.getElementById(displayId).src.endsWith(src))
			document.getElementById(displayId).src = src;

		
	}
	catch(e){}
		}
// ****************************************************************************************
//	sum()
//   
//  This function is used to sum the "value" fields of two SNVT_switch datapoints.
//
//	parameter: user defined paramter list used by your Function - can be a string, number, object or array
// 			 This example doesn't use parameter list
// 	displayId: used to associate a html element (like span) to the jsFunction.
//	dpList: lists datapoint Pathnames
// 
//*****************************************************************************************		
function sum(paramters, displayId, dpList) {
	
	var i;
	var json;
	var bValid = true;
	if(dpList == null)
		return;
	var sum = 0;
	try {	// This example only cares about values
		for(i = 0; i < dpList.length; i ++) 
		{
			try {
				valueStr = dpList[i].value;
				if(valueStr == "") {
					bValid = false;
					break;
				}
				else {
					json = JSON.parse(valueStr);
					value = json.value;
					sum += value;
				}
				
			} catch (err) {}
		}
		if(bValid) {
			document.getElementById(displayId).innerHTML = sum;
		}
	} catch (err) {}
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
//	writeValue()
//   
//	This function verifies that the state and value fields of SNVT_switch datapoint are correct
//	mode: 0=respond back true=valid, false=invalid, 1=same as 0 plus show alert
//	field: ""=entire DP, otherwise specific datapoint field
// 
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
