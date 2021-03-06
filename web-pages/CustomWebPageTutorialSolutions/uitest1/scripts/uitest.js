/*
	uitest1 - This Web page shows the UI Test Target Internal Device SNVT_SWitch datapoints 
	Datapoint (DP) informtion and is one of the major tools to troubleshoot
	IzoT network issue.


	# Copyright (C) 2019 Echelon Corporation.  All rights reserved.
	#
	# Use of this code is subject to your compliance with the terms of the 
	# Echelon IzoT(tm) Software Developer's Kit License Agreement which is 
	# available at www.echelon.com/license/izot_sdk/. 


	This file contains all the custom javascript for the custome Web page for the UI Test Target Internal Device.  
 
	Web page first issue GET requet with TAG.  Next each datapoint supported in Web page is checked if included in GET response.  If not found then
	the Web page tag (needs to be different for each Web page) is added to all datapoints which are read-only,Read/write.  A GET request (without Tags) is
	issued for any read-once.  After that GET request with the Web page TAG is issued periodically

*/
/************************************************************************************************************ */
//	Init1()
//
//	dpObject(dpName,bUseMaxAge)
//			dpName: datapoint Pathname
//			bUseMaxAge: only used when ivMax_Age=1
//						Use false for all non-external LonWorks devices (MODBUS,BACNET,Internal Devices), Use true for external LON Devices in which you want on-demand polling
//				for example: dpObj = new dpObject("opcDev.1/uiTestTarget2/0/nviLampSw",false);
//	 	displayElement(displayId, fieldName, readWriteType, displayType, extraParameter)
//			displayId: this is the html element id, e.g., <span id="state1"></span>
//			fieldName: "" = full datapoint value, otherwise specifies field name, 
//						e.g., SNVT_switch has two fields state and value, to show the state field specify "state" for fieldName
//			readWriteType: "rw" = read/write, "ro"=readonce, "row"=readonce-write, "r"=readonly, "w"=write only
//			displayType: span, input, dropdown, Function
//			extraParameter: depends on displayType
//						null = notuse
//						integer = decimal places
//						displayType = "function" then extraParameter function name
//				for example1:	<span id="state1"></span>
//								displayObj = new displayElement("state1", "state", "r", "span",null);
//				for example2:	<span id="state1"></span>
//								displayObj = new displayElement("state1", "state", "r", "span",0);
//				for example3:	<span id="state1"></span> <script> function writedata() {}</script>
//								displayObj = new displayElement("state1", "state", "r", "span",writedata);
/************************************************************************************************************ */
function init1() {
	/*  **** Begin -- *** Custom Web page #4  *** -Change code below   *****   */
	g_sWebpageTag = "xyz_uitest1";  // needs to be unique for each Web page, up to three additional tags get automatically 
									//created based on this namedepending on datapoint settings
	ivMax_Age = 1; // -1= on-demand polling disabled(Only, MODBUS, BACNET, IOX or Internal Devices)
					//  0=all datapoints use max_age (all devices are external LON devices), 
					//  1=Web page has External LON devices (and needs on on-demand polling) and NON-LON devices

	var iIndex = -1;
	var dpObj;
	var displayObj;
	var jsFunctionDpList;
	
	
	dpObj = new dpObject("opcDev.1/uiTestTarget2/0/nviLampSw",false);
	dpObj = addDisplayElementToDpObject(dpObj, "opcDev.1/uiTestTarget2/0/nviLampSw/state", "state", "rw", "input"); 
	dpObj = addDisplayElementToDpObject(dpObj, "opcDev.1/uiTestTarget2/0/nviLampSw/value", "value", "rw", "input");
	g_dpList.push(dpObj);

	
	dpObj = new dpObject("opcDev.1/uiTestTarget2/0/nvoLampFb",false);
	dpObj = addDisplayElementToDpObject(dpObj, "opcDev.1/uiTestTarget2/0/nvoLampFb/state", "state", "r", "span"); 
	dpObj = addDisplayElementToDpObject(dpObj, "opcDev.1/uiTestTarget2/0/nvoLampFb/value", "value", "r", "span");
	dpObj = addDisplayElementToDpObject(dpObj, "opcDev.1/uiTestTarget2/0/nvoLampFb/state_2", "state", "r", "function",lampImageSwapper);
	g_dpList.push(dpObj);

		// JsFunction -- create dp list 
	jsFunctionDpList = [];
	dpObj = new dpObject("opcDev.1/uiTestTarget2/0/nviLampSw",false);
	jsFunctionDpList.push(dpObj);
	dpObj = new dpObject("opcDev.1/uiTestTarget2/0/nvoLampFb",false);
	jsFunctionDpList.push(dpObj);
	addJavascriptFunctionTojsFunctionObject(null, "sum", jsFunctionDpList, sum);

	

	/*  **** End -- *** Custom Web page #4  *** - Change code above    *****   */
}
function imageStateClicked(displayObject, writeDpName) {
	// SNVT_switch value has two fields: state and value; this function only changes state
	// displayObject - this is usually an output Datapoint, though it can be an input Datapoint
	// writeDpName - this is an input Datapoint;
	
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
function sum(paramters, displayId, dpList) {
	// This jsfunction is called whenever one of the datapoints values change. 
	// 
	// parameter: user defined paramter list used by your Function - can be a string, number, object or array
	// displayId: used to associate a html element (like span) to the jsFunction.
	// dpList: lists datapoint Pathnames
	
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
function writeLampSwIn(dpName) {
	/*  **** Begin -- *** Custom Web page #5  *** -Change code below   *****   */
	
	var valueField = document.getElementById(dpName + "/value").value;  // ONLY works if dpname/fieldname value are used as element id
	var stateField = document.getElementById(dpName + "/state").value; // ONLY works if dpname/fieldname value are used as element id
	var value = "{\"state\":" + stateField + ",\"value\":" + valueField + "}"
	if(validateData(1,"SNVT_switch","",value)) // SmartServer doesn't validate values, so your Web page needs to
	{
		requestWriteData(dpName,value);
	}
	else
		document.getElementById(g_dpList[iIndex].displayElements[displayIndex].displayId).value = g_dpList[iIndex].value;
	
	/*  **** End -- *** Custom Web page #5  *** - Change code above    *****   */
}
