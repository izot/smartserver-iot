/*
	simpledriver.js - This is a generic driver for the SmartServer IoT which supports 4 GET tag types.


	# Copyright (C) 2019 Echelon Corporation.  All rights reserved.
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
			// ------------------- user settable variables --------------------
		var g_sWebpageTag = "xyz_generic=1"; // *** Custom Web page #3  *** -- change xyz to your company tagname, and simple to your Web page tag value
		var g_bCalculatePollRate = true; // false = use default or manually set, true= calculate g_timerInternal and g_iMax_Age based on 
										// 	number of datapoints and whether there are non max_age and/or max_age periodic polling datapoints
		var g_timerInterval = 2000;
		var g_iMax_Age = 1; //on-demand max_age time out: -1=no Max age datapoints, 0= use max age for all datapoints, 1=some DPs use max age (auto calculate max_age), >1 same as one but use specified value as timeout	  
		var g_bPeriodicReadOneTimeReads = false; // Not Supported yet. if Web page is expected to be open a long time you may want to periodically read the one times

			// ---------------- Program variables --------------------------------
		var g_sWebpageOneTime = ""; // created at run time";
		var g_sWebpageMaxAge = "";// created at run time";
		var g_sWebpageMaxAgeOneTime = ""; // created at run time";
		var g_arrDpTypeNameList = []; // Used during initialization only: DpTarrays of DP namesarrays  0=normal,1=onetime,2=maxage,3=maxontime
		var g_arrTagList = []; // used by timer if available the order is nomaxage,maxage,maxageonetime,nomaxageonetime
		var g_iTimerTagListCount = 0;  // The count of Get Array items to count  --al it is upto 4 GET tags, onetime tags are decremented after intial processing
		var g_iCurrentTagListPtr = -1;  // Used during Initialization (0-3) g_arrDpTypeNameList and timer (0-1) g_arrTagList
		var g_arrJsFunctionList = []; // use for Functions that use 2 or more datapoints, may not be tied to a specific html element
		var g_arrDpChangeJsFunctionList = []; // indicates which js Functions to process during this GET request -- at least one DP value changed 
		 
		var g_iDpCountNormal = 0;  // g_iMax_Age: -1 or 0, used for all dps; 1 or greater than one used for noMaxAge
		var g_iDpCountOneTime = 0;  // read once DPs
		var g_iDpCountMaxAge = 0;
		var g_iDpCountMaxAgeOneTime = 0;  // read once DPs
		//var g_bInitialGetNormal = false;  // g_iMax_Age: -1 or 0, used for all dps; 1 or greater than one used for noMaxAge
		var g_iInitialGetNormalOneTime = false;  // read once DPs
		var g_bInitialGetMaxAge = false;
		var g_bInitialGetMaxAgeOneTime = false;  // read once DPs
		var g_bMaxAgeOneTime = false; // max age one time requires initial GET request with max_age=0 and then read values once 10 seconds later
		var g_dtMaxAgeOneTimeTimeout; 
		var ivMaxPollingRate = 5; // 5 datapoints polled per second
		var g_bAddTagToDatapoints = true;
		
		var g_bReadInProgress = 0;  // true for Single GET request if no pagination, true for multiple request if pagination used
	    var g_dpList = [];
		var g_dpListIndex = -1;
		var g_writeTimeout = 10000; //time (ms) to wait after a write to DP before updating value with latest read
		var g_cookie = "";
		var g_timerVar;
		var g_iRequestErrCount = 0;
		var g_iRequestMaxErr = 1;
		var g_sUrlTag = ""; //leave blank - used for GET request
		var g_sTagValue = ""; 
		var g_sWriteTagPayload = ""; // leave blank - used to add tag to datapoint
		var g_bRetryInitialGetRequest = false;  //
		var g_arrPaginationResponse = [];  //
		var g_iPaginationPage = 0; // Used for GET pagination
		var g_iPaginationPageSize = 20; // Used for GET pagination
		var g_iPaginationSnapsnotNumber = 0; // Used for GET pagination
		var g_iarrDpTypeNoMaxAgeIndex = 0;
		var g_iarrDpTypeNoMaxAgeOneTimeIndex = 1;
		var g_iarrDpTypeMaxAgeIndex = 2;
		var g_iarrDpTypeMaxAgeOnetimeIndex = 3;
		
		//************************************************************************************************************** */
		//  Initialization Functions
		//************************************************************************************************************** */
		function init() {
			g_arrDpTypeNameList = []; // Used during initialization only: DpTarrays of DP namesarrays  0=normal,1=onetime,2=maxage,3=maxontime
			g_arrTagList = []; // used by timer if available the order is nomaxage,maxage,maxageonetime,nomaxageonetime
			g_iTimerTagListCount = 0;  // The count of Get Array items to count  --al it is upto 4 GET tags, onetime tags are decremented after intial processing
			g_iCurrentTagListPtr = -1;  // Used during Initialization (0-3) g_arrDpTypeNameList and timer (0-1) g_arrTagList
			g_arrJsFunctionList = []; // use for Functions that use 2 or more datapoints, may not be tied to a specific html element
			g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeIndex] = [];
			g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeOneTimeIndex] = [];
			g_arrDpTypeNameList[g_iarrDpTypeMaxAgeIndex] = [];
			g_arrDpTypeNameList[g_iarrDpTypeMaxAgeOnetimeIndex] = [];

			init1();
			
			// create three more Tagnames, needed to support: noMaxAge,noMaxAgeOneTime, MaxAge,MaxAgeOneTime tags for 4 GET requests
			var iPtr = g_sWebpageTag.indexOf("=");
			var tagName = g_sWebpageTag;
			if(iPtr > 0) {
				tagName = g_sWebpageTag.substr(0,iPtr);
				g_sUrlTag = g_sWebpageTag.substr(iPtr + 1);
			}
			
			var sWebpageTagOneTimeExtension = "__onetime";
			var sWebpageTagMaxAgeExtension = "__maxage";
			var sWebpageTagMaxAgeOneTimeExtension = "__maxageonetime";
			
		    // not Web page specific changes
			initAddExtraItemsToDpList();

				// figure out Web page GET Tags - up to 4 --default, onetime, maxage, maxageonetime
				

				

			if(g_iMax_Age == -1) {
				g_iTimerTagListCount ++;
				addGetTagToTagArray("normal", true, "", false, g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeIndex]);
				if(g_iDpCountOneTime > 0) {
					g_iInitialGetNormalOneTime = true;
					addGetTagToTagArray("onetime", true, sWebpageTagOneTimeExtension, false, g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeOneTimeIndex]);
				}
			}
			else if(g_iMax_Age == 0) {
				g_iTimerTagListCount ++;
				addGetTagToTagArray("normal", true, "", true, g_arrDpTypeNameList[g_iarrDpTypeMaxAgeIndex]);
				if(g_iDpCountMaxAgeOneTime > 0) {
					g_bInitialGetMaxAgeOneTime = true;
					addGetTagToTagArray("maxageonetime", true, sWebpageTagMaxAgeOneTimeExtension, true, g_arrDpTypeNameList[g_iarrDpTypeMaxAgeOnetimeIndex]);
				}
			} 
			else {
				if(g_iDpCountNormal > 0) {
					g_iTimerTagListCount ++;
					addGetTagToTagArray("normal", true, "", false, g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeIndex]);
					if( g_iDpCountMaxAge > 0) {
						g_iTimerTagListCount ++;
						addGetTagToTagArray("maxage", true, sWebpageTagMaxAgeExtension, true, g_arrDpTypeNameList[g_iarrDpTypeMaxAgeIndex]);
					}
					
					if( g_iDpCountMaxAgeOneTime > 0) {
						g_bMaxAgeOneTime = true;
						addGetTagToTagArray("maxageonetime", true, sWebpageTagMaxAgeOneTimeExtension, true,g_arrDpTypeNameList[g_iarrDpTypeMaxAgeOnetimeIndex]);
					}
					if( g_iDpCountOneTime > 0)
						addGetTagToTagArray("onetime", true, sWebpageTagOneTimeExtension, false, g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeOneTimeIndex]);
				}
				else {
					if( g_iDpCountMaxAge > 0) {
						g_iTimerTagListCount ++;
						addGetTagToTagArray("normal", true, "", sWebpageTagMaxAgeExtension, true, g_arrDpTypeNameList[g_iarrDpTypeMaxAgeIndex]);
					}
					
					if( g_iDpCountMaxAgeOneTime > 0) {
						g_bMaxAgeOneTime = true;
						addGetTagToTagArray("maxageonetime", true, sWebpageTagMaxAgeOneTimeExtension, true,g_arrDpTypeNameList[g_iarrDpTypeMaxAgeOnetimeIndex]);
					}
					if( g_iDpCountOneTime > 0)
						addGetTagToTagArray("onetime", true, sWebpageTagOneTimeExtension, false, g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeOneTimeIndex]);
				}
			}
			for(i=0; i < g_arrTagList.length; i++)
			{
				if( g_arrTagList[i].name == "maxageonetime")
				{
					g_sWebpageMaxAgeOneTime = g_arrTagList[i].urlTag;
					break;
				}
			}
			
			

			document.getElementById("logout").addEventListener("click",logout); // add onclick for logout a tag link
			var numOfMaxDps = g_dpList.length;
			if(g_bCalculatePollRate ) {
				g_timerInterval = Math.floor((numOfMaxDps / ivMaxPollingRate)) + 1;
				if((g_iMax_Age > -1) && (ivMaxPollingRate > 0)) {
					if(g_iTimerTagListCount > 1) 
						g_iMax_Age = 0; // have both non max age and max age periodic polling so max age DPs are polled every other timer event
					else
						g_iMax_Age = g_timerInterval;
				}
				g_timerInterval = g_timerInterval * 1000;

			}
			if((g_iMax_Age >= 0) && (ivMaxPollingRate > 0)) {
				g_timerInterval = Math.floor((numOfMaxDps / ivMaxPollingRate)) + 1;
				g_iMax_Age = g_timerInterval;
				if(g_iMax_Age > 7)
				g_iMax_Age --;
				g_timerInterval = g_timerInterval * 1000;
			}
			
			g_timerVar = setInterval(timer1, g_timerInterval);
			getInitialAllDpValues();
		}
		function initAddExtraItemsToDpList() {
			// additional items used during runtime
			var i, j, iPtr;
			var name = "";
			var obj = {};
			for(i=0; i < g_dpList.length; i++)
			{
				name = g_dpList[i].dpName;
				if(name != "")
				{
					iPtr = name.indexOf("/");
					if(iPtr > 0)
					{	
						g_dpList[i].dpUrl = name.substr(0,iPtr) + "/if" + name.substr(iPtr);
					}
					g_dpList[i].writeTimestamp = 0;  // after writing value, need to wait before updating Web page, otherwise values flickers 
					g_dpList[i].value = ""; // last saved value
					g_dpList[i].g_bGotValue = false;  // used to check if DP already has Web page tag
					g_dpList[i].state = ""; //"not found" if missing datapoint, or deviceState
					g_dpList[i].dpValueChanged = false; // indicates whether value changed this GET request
					

					var bReadOnlyOnceDp = false;
					var bAtLeastOneNonReadOnlyOnceDp = false;
					 // add onchange event for drop downs that are scalars (not structured fields)
					for(j=0; j < g_dpList[i].displayElements.length; j++)
					{
						try {
							if((g_dpList[i].displayElements[j].field == "") && (g_dpList[i].displayElements[j].type != "r")) {

								if((g_dpList[i].displayElements[j].displayType == "dropdown_text")
									|| (g_dpList[i].displayElements[j].displayType == "dropdown_number")) {
										var displayId = g_dpList[i].displayElements[j].displayId;
										document.getElementById(displayId).addEventListener("change",dropdownWrite);
										
								}
							}
							if((g_dpList[i].displayElements[j].type == "ro") || (g_dpList[i].displayElements[j].type == "row") || (g_dpList[i].displayElements[j].type == "w"))
								bReadOnlyOnceDp = true;  // "w" is needed for read mod writes even though it is not displayed
							else
							bAtLeastOneNonReadOnlyOnceDp = true;
						}
						catch (err) {}
					}
					obj = {};
					// determine if on-demand polling used or not and whether ro or row datapoints
					if(bAtLeastOneNonReadOnlyOnceDp)
						bReadOnlyOnceDp = false;
					if((g_iMax_Age == 0) || (g_iMax_Age > 0) && (g_dpList[i].useMaxAge == true)) {
						if(bReadOnlyOnceDp) {
							
							obj.dpName = g_dpList[i].dpName;
							obj.dpListIndex = i;
							g_arrDpTypeNameList[g_iarrDpTypeMaxAgeOnetimeIndex].push(obj); // add dp name to list
							g_iDpCountMaxAgeOneTime ++;
						}
						else {
							obj.dpName = g_dpList[i].dpName;
							obj.dpListIndex = i;
							g_arrDpTypeNameList[g_iarrDpTypeMaxAgeIndex].push(obj);
							g_iDpCountMaxAge ++;
						}
					}
					else {
						if(bReadOnlyOnceDp) {
							obj.dpName = g_dpList[i].dpName;
							obj.dpListIndex = i;
							g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeOneTimeIndex].push(obj);
							g_iDpCountOneTime ++;
						}
						else {
							obj.dpName = g_dpList[i].dpName;
							obj.dpListIndex = i;
							g_arrDpTypeNameList[g_iarrDpTypeNoMaxAgeIndex].push(obj);
							g_iDpCountNormal ++;
						}
					}
				}
			}
			
			
		} 
		//************************************************************************************************************** */
		//  All other functions
		//************************************************************************************************************** */
		function addDisplayElementToDpObject(dpObject, displayId, fieldName, readWriteType, displayType, extraParameter) {
			var displayElement = {};
			displayElement.displayId = displayId; // eg. "opcDev.1/uiTestTarget2/0/nviLampSw/state";
			displayElement.field = fieldName; // ""=entire value, not equal "" means field value, e.g., "state" = use state field
			displayElement.type = readWriteType; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			displayElement.displayType = displayType; // input, span, dropdown_text, function, jsfunction
			displayElement.function = null;  // used for html elements that need a function to process like image swappers
			displayElement.decimalPlaces = null;
			if(displayType == "function") {
				if(extraParameter != null) {
					if(typeof extraParameter === "function") {
						displayElement.function = extraParameter;
					}
				}
			}
			else if(extraParameter != null) {
				if(typeof extraParameter === "number") {
					displayElement.decimalPlaces = extraParameter;
				}
			}
			dpObject.displayElements.push(displayElement);
			return dpObject;
		}
		function addDisplayElementJsFunctionToDpObject(dpObject, displayId, fieldName, readWriteType, displayType, jsFunctionIndex) {
			// function that uses 1 or more datapoints and may or may not be associated to a specific HTML element
			var displayElement = {};
			displayElement.displayId = displayId; // eg. "opcDev.1/uiTestTarget2/0/nviLampSw/state";
			displayElement.field = fieldName; // ""=entire value, not equal "" means field value, e.g., "state" = use state field
			displayElement.type = readWriteType; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
			displayElement.displayType = displayType; // input, span, dropdown_text
			displayElement.function = jsFunctionIndex;
			dpObject.displayElements.push(displayElement);
			return dpObject;
		}
		function addJavascriptFunctionTojsFunctionObject(jsFunctionParameters,  displayId, datapointList, functionName) {
			var i, j;
			var dpObj;
			var jsDpObj;
			var dplistIndex = -1;
			var jsFunction = {};
			var index = g_arrJsFunctionList.length;
			jsFunction.id = index;
			jsFunction.jsFunctionParameters = jsFunctionParameters;
			jsFunction.displayId = displayId; // eg. "opcDev.1/uiTestTarget2/0/nviLampSw/state";
			jsFunction.function = functionName;
			jsFunction.dpList = [];
			if(datapointList != null) {
				for(i=0; i < datapointList.length; i++)
				{
					dplistIndex = -1;
					for(j=0; j < g_dpList.length; j++)
					{
						if(datapointList[i].dpName == g_dpList[j].dpName)
						{
							dplistIndex = j;
							break;
						}
					}
					if(dplistIndex == -1) {
						// add new dp
						dpObj = new dpObject(datapointList,datapointList[i].useMaxAge);
						g_dpList.push(dpObj);
						dplistIndex = g_dpList.length - 1;
						g_dpList[dplistIndex].writeTimestamp = 0;  // after writing value, need to wait before updating Web page, otherwise values flickers 
						g_dpList[dplistIndex].value = ""; // last saved value
						g_dpList[dplistIndex].g_bGotValue = false;  // used to check if DP already has Web page tag
						g_dpList[dplistIndex].state = ""; //"not found" if missing datapoint, or deviceState
						g_dpList[dplistIndex].dpValueChanged = false; // indicates whether value changed this GET request
						
						
			
					}
					else {
						if(datapointList[i].useMaxAge) {
							g_dpList[dplistIndex].useMaxAge = datapointList[i].useMaxAge;
						}
					}
					if(dplistIndex != -1) {
						var displayElement = {};
						displayElement.displayId = displayId; // eg. "opcDev.1/uiTestTarget2/0/nviLampSw/state";
						displayElement.field = ""; // ""=entire value, not equal "" means field value, e.g., "state" = use state field
						displayElement.type = ""; //rw = read/write, ro=readonce, row=readonce-write, r=readonly, w=write only
						displayElement.displayType = "jsfunction"; // input, span, dropdown_text
						displayElement.function = index; // numeric pointer
						g_dpList[dplistIndex].displayElements.push(displayElement);

						jsDpObj = {};
						jsDpObj.dpName = g_dpList[dplistIndex].dpName;
						jsDpObj.dpListIndex = dplistIndex;
						jsDpObj.value = "";
						jsDpObj.state = "";
						jsDpObj.dpValueChanged = false;
						jsFunction.dpList.push(jsDpObj);
					}
				}
				
				g_arrJsFunctionList.push(jsFunction)
			}
		}
		function addGetTagToTagArray(name, bInitialRequest, tagName, bUseMaxAge, dpList) {
			var newTag = {};
			newTag.name = name;
			newTag.bInitialRequest = bInitialRequest;
			newTag.useMaxAge = bUseMaxAge;
			newTag.dpList = dpList;
			var iPtr = g_sWebpageTag.indexOf("=");
			if((iPtr > 0) && ((iPtr + 1) < g_sWebpageTag.length))
			{
				
				newTag.urlTag = g_sWebpageTag.substr(0,iPtr)+ tagName + "&tag.value==" + g_sWebpageTag.substr(iPtr + 1);
				newTag.writeTagPayload = "\"" + g_sWebpageTag.substr(0,iPtr)+ tagName + "\"=\"" + g_sWebpageTag.substr(iPtr + 1) + "\"";
			}
			else
			{
				newTag.urlTag = g_sWebpageTag + tagName;
				newTag.writeTagPayload = g_sWebpageTag + tagName;
			}
			g_arrTagList.push(newTag);
		}

		
		function checkIfTagAssignedToDp(json) {
		    // Ran after doing first GET reguest using Web page tag
			// checks if datapoint needs a single read or whether it datapoint is missing Web page tag
			
			
			var i,j,k;
			var url = "https://" + location.hostname; //+ ":8443"
			if(!g_bAddTagToDatapoints)
				return;
			if(g_iCurrentTagListPtr == -1)
				return;
			if(g_arrTagList.length == 0)
				return;
			if(g_dpList == null)
				return;
			if(g_dpList.length == 0)
				return;
			if(g_iCurrentTagListPtr >= g_arrTagList.length)
				return;
			
			try
			{
				// Add tags
				var tagInfo = g_arrTagList[g_iCurrentTagListPtr];
				var dpList = tagInfo.dpList;
				
				for(j=0; j < tagInfo.dpList.length ; j++)
				{
						g_dpListIndex  = tagInfo.dpList[j].dpListIndex;
						

						if(g_dpList[g_dpListIndex].g_bGotValue)
						{
							// already has tag do nothing
						}
						else {
							url = "/iap/devs/*+name==" + g_dpList[g_dpListIndex].dpUrl + "/tags";
							requestWritePostData(0, url, g_arrTagList[g_iCurrentTagListPtr].writeTagPayload, setTagResponse, setTagResponse);
							if(tagInfo.name.includes("onetime")) {
								// one time read so need to do at least one read
								url = "https://" + location.hostname; //+ ":8443";
								url += "/iap/devs/*+name==" + g_dpList[g_dpListIndex].dpUrl + "/value";
								if(tagInfo.useMaxAge) {
									if(g_iMax_Age >= 0)
										url += "&max_age=0";
								}
								requestGetData(0, url, getDpValueResponse, getDpValueResponseFailure);
							}
						}
				}
				if(g_iCurrentTagListPtr < g_arrTagList.length)
					g_arrTagList[g_iCurrentTagListPtr].bInitialRequest = false;
				//delete tags
				var dpRemoveList = [];
				var bFound = false;
				var dpPath;
				var dpPathif;
				
				if(json != null)
				{
					try {
						for(i = 0; i < json.length; i++)
						{
							try
							{
								bFound = false;
								dpPath = json[i].deviceName + "/" + json[i].blockName + "/" + json[i].blockIndex + "/" + json[i].datapointName
								dpPathif = json[i].deviceName + "/if/" + json[i].blockName + "/" + json[i].blockIndex + "/" + json[i].datapointName
								for(j=0; j < tagInfo.dpList.length; j++)
								{
									if(tagInfo.dpList[j].dpName == dpPath)
									{ 
										bFound = true;
										break;
									}
								}
								if(!bFound)
									dpRemoveList.push(dpPathif);
							}
							catch(err) {}
						}
						if(dpRemoveList.length > 0){
							var tagname = g_arrTagList[g_iCurrentTagListPtr].urlTag;
							var iPtr = tagname.indexOf("&");
							if(iPtr != -1)
								tagname = tagname.substr(0, iPtr);

							for(i=0; i < dpRemoveList.length;i ++)
							{
								try {
									url = "https://" + location.hostname; // + ":8443";
									url += "/iap/devs/*+name==" + dpRemoveList[i] + "/tags/" + tagname;
										requestDeleteData(0, url, "", null, null);
								}
								catch (e) {}
							}
						}
					}
					catch (e) {}
				}
			}
			catch (err) {}	
			
		}
		function currentDpValue(dpName) {
			var value = null; // means can't find DP, ""=means DP value hasn't been read yet
			var i;
			try {
				for(i=0; i < g_dpList.length; i++)
				{
					if(g_dpList[i] === dpName) {
						value = g_dpList[i];
						break;
					}
				}
			}
			catch(e) {}
			return value;
		}
		function currentDpValueById(displayId) {
			var dpInfo = {};
			dpInfo.value = null; // means can't find DP, ""=means DP value hasn't been read yet
			dpInfo.dpName = "";
			var i, j;
			try {
				for(i=0; i < g_dpList.length; i++)
				{
					if(g_dpList[i].displayElements != null) {
						for(j=0; j < g_dpList[i].displayElements.length; j++)
						{
							if(g_dpList[i].displayElements[j].displayId === displayId) {
								dpInfo.value = g_dpList[i].value;
								dpInfo.dpName = g_dpList[i].dpName;
								dpInfo.index = i;
								i = g_dpList.length + 2;
								break;
							}
						}
					}
				}
			}
			catch(e) {}
			return dpInfo;
		}
		function dpObject(dpName,bUseMaxAge) {
			this.dpName = dpName;  // dpName is same as the element Id (only works if DP is used only once on Web page)
			this.useMaxAge = bUseMaxAge;
			this.displayElements = [];  // list of HTML element using this DP, create one entry per HTML element (e.g., span, input)
			
		}
		

		function dropdownWrite() {
			try {
				var displayId = this.id;
				var displayInfo = findDisplayIndexByDisplayId(displayId);
				
				if(Object.keys(displayInfo).length |= 0) {
					var iIndex = displayInfo.dpListIndex;
					if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].field == "") {
						var value = document.getElementById(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayId).value;
						if(value != "_nochange_") {
							url = "https://" + location.hostname; // + ":8443";
							url += "/iap/devs/*+name==" + g_dpList[iIndex].dpUrl + "/value";
						
							g_dpList[iIndex].value = value; //"{" + value + "}";
							
							if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayType == "dropdown_text")
								payload = "\"" + value + "\""; // add quoates for enums
							else if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayType == "dropdown_number") {
								var value1;
								if(isNaN(sceneNum))
									value1 = "\"" + value + "\"";
								else
									value1 = Number(value);
								payload = value1; 
							}
							else 
								payload = value;
							g_dpList[iIndex].writeTimestamp = Date.now();
							requestWritePutData(0, url, payload, null, null);
						}
						else { 
							var value1 = g_dpList[iIndex].value;
							if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayType == "dropdown_text")
								value1 = value1.replace(/\"/g,"");
							document.getElementById(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayId).value = value1;
						}
					}
				}
			} catch (err) {}
		}
		function getAllDpValues(bMaxAge, bOnetime, urlTag) {
		    var i,k;
			g_iPaginationPage = 1; // Used for GET pagination
			g_arrPaginationResponse = [];
			var url = "https://" + location.hostname; //+ ":8443";
			//url += "/iap/devs/*/if/*/*/*+tag==" + g_sUrlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
			url += "/iap/devs/*/if/*/*/*+tag==" + urlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
			if(bMaxAge) {
				if(bOnetime)
					url += "&max_age=0";
				else if(g_iMax_Age>= 0)
					url += "&max_age=" + g_iMax_Age;
			}
			requestGetData(0, url, getAllDpValuesResponse, getDpValueResponseFailure);
			
		}
		function getAllDpValuesResponse(mode, requestUrlString, json) {
		    getNextPageInfo(mode, requestUrlString, json);
			if((g_iPaginationPage == 0) || (g_iPaginationSnapsnotNumber == 0))
			{
				getDpValueResponse(mode, requestUrlString, g_arrPaginationResponse);
				g_arrPaginationResponse = [];
				
			}
			else 
			{
				var iPtr,k;
				url = requestUrlString;
				iPtr = requestUrlString.indexOf("?pg=");
				if(iPtr > 0)
					url = requestUrlString.substr(0, iPtr);
				url += "?pg=" + g_iPaginationPage + "&sz=" + g_iPaginationPageSize + "&xs=" + g_iPaginationSnapsnotNumber;
				requestGetData(0, url, getAllDpValuesResponse, getDpValueResponseFailure);
			}
			
		}
		function getDpValueResponse(mode, requestUrlString, json) {
			var iIndex = 0;
			var i,j, k, z;
			var bFound = false;
			var jsFunctionIndex = -1;
			g_arrDpChangeJsFunctionList = [];
			if(json != null)
			{
				for(j=0; j < g_dpList.length; j++)
				{
					g_dpList[j].dpValueChanged  = false;
				}
				for(i = 0; i < json.length; i++)
				{
					try
					{
						var dpPath = json[i].deviceName + "/" + json[i].blockName + "/" + json[i].blockIndex + "/" + json[i].datapointName;
						for(j=0; j < g_dpList.length; j++)
						{
							if(g_dpList[j].dpName == dpPath)
							{ 
							  try {
								var value = JSON.stringify(json[i].value);
								//var value1 = JSON.stringify(g_dpList[j].value);
								var jsonValue = json[i].value;
								var value1 = g_dpList[j].value;
								if(!g_dpList[j].g_bGotValue)
									g_dpList[j].g_bGotValue = true;
								if(!(value === value1))
								{
									updateAllDisplayElements(0, g_dpList[j].dpName, j, value);
									
								}
								break;
							 } catch(err) {}
							}
						}
					}
					catch(err)
					{}
				}
				processJsFunctions(); // need all Dp objects updated first, contains a list of jsFunctions that had at least one DP value changed
			}
		}
		function getDpValueResponseFailure(mode, requestUrlString, json) {
		}
		function getNextPageInfo(mode, requestUrlString, json) {
			// 
				// get how many more pages
			var iSnapshot = json['snapshot'];
			var resources = json['resources'];
			if(resources.length == 0)
			{ // no data
				g_bReadInProgress = false;
					g_iPaginationPage = 0;
				return;
			}
			else
				g_arrPaginationResponse = g_arrPaginationResponse.concat(resources); // Get results
			var pagesLeft = json['remainingPages'];
			
			if(g_iPaginationPage > 1)
			{
				if(iSnapshot != g_iPaginationSnapsnotNumber)
				{ // error wrong snapshot so wrong data
					g_bReadInProgress = false;
					g_iPaginationPage = 0;
					return;
				}
			}
			else 
				g_iPaginationSnapsnotNumber = iSnapshot;
			if(pagesLeft == 0)	
			{
				g_bReadInProgress = false;
				g_iPaginationPage = 0;
			}
			else 
				g_iPaginationPage ++;	
		}
		function getInitialAllDpValues() {
			
			var i,k;
			var sUrlTag = "";
			var bMaxAge = false;
			var bOneTime = false;
			g_iCurrentTagListPtr = -1;
			// check if all initial TAG GET requests processed
			for(i=0; i < g_arrTagList.length; i ++) 
			{
				if(g_arrTagList[i].bInitialRequest) {
					g_iCurrentTagListPtr = i;  // used by checkIfTagAssignedToDp()
					sUrlTag = g_arrTagList[i].urlTag;
					bMaxAge = g_arrTagList[i].useMaxAge;
					//g_arrTagList[i].bInitialRequest = false;
					
					if(g_arrTagList[g_iCurrentTagListPtr].name == "maxageonetime") {
						bOneTime = true;
					}
					break;
				}
			}
			if(sUrlTag == "") { // all GET tags processed
				g_iCurrentTagListPtr = -1; // now used by timer
				g_bAddTagToDatapoints = false; // no more GET tags to process
					// start maxage onetime timeout -- needed as requires initial request to send max_age to poll Device and second to read new value
				for(i=0; i < g_arrTagList.length; i ++) 
				{
					if(g_arrTagList[i].name == "maxageonetime") {
						g_dtMaxAgeOneTimeTimeout = new Date(Date.now() + 10000); 
						break;
					}
				}
				return;
			}
			
			g_iPaginationPage = 1; // Used for GET pagination
			g_arrPaginationResponse = [];
			var url = "https://" + location.hostname; // + ":8443";
			//url += "/iap/devs/*/if/*/*/*+tag==" + g_sUrlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
			url += "/iap/devs/*/if/*/*/*+tag==" + sUrlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
			if(bMaxAge) {
				if(g_iMax_Age >= 0) {
					url += "&max_age=";
					if(bOneTime)
						url += "0";
					else
						url += g_iMax_Age;
				}
			}
			requestGetData(0, url, getInitialAllDpValuesResponse, getInitialAllDpValuesResponseFailure);
			
		}
		function getInitialAllDpValuesResponse(mode, requestUrlString, json) {
			getNextPageInfo(mode, requestUrlString, json);
			if((g_iPaginationPage != 0) && (g_iPaginationSnapsnotNumber != 0))
			{
				var iPtr,k;
				url = requestUrlString;
				iPtr = requestUrlString.indexOf("?pg=");
				if(iPtr > 0)
					url = requestUrlString.substr(0, iPtr);
				url += "?pg=" + g_iPaginationPage + "&sz=" + g_iPaginationPageSize + "&xs=" + g_iPaginationSnapsnotNumber;
				requestGetData(0, url, getInitialAllDpValuesResponse, getDpValueResponseFailure);
			}
			else
			{
				//removeUnwantedDps(g_arrPaginationResponse);
				getDpValueResponse(mode, requestUrlString, g_arrPaginationResponse);
				checkIfTagAssignedToDp(g_arrPaginationResponse); // start check
				g_arrPaginationResponse = [];
				getInitialAllDpValues(); // check for next GET tag, upto 4 tags
			}
			
		}
		function getInitialAllDpValuesResponseFailure(mode, requestUrlString, json) {
			g_bRetryInitialGetRequest = true;
		}
		function getInitialSingleDpValueResponse(mode, requestUrlString, json) {
			getDpValueResponse(mode, requestUrlString, json);
			
		}
		function getSingleDpValueResponse(mode, requestUrlString, json) {
			getDpValueResponse(mode, requestUrlString, json);
			
		}
		function getSingleDpValueResponseFailure(mode, requestUrlString, json) {
		}
		function findDpIndex(dpName) {
			var dpIndex = -1; // -1=not found
			var i;
			for(i=0; i < g_dpList.length; i ++)
			{
				if(g_dpList[i].dpName == dpName) {
					dpIndex = i;
					break;
				}
			}
			return dpIndex;
		}
		function findDpIndexByDisplayId(displayId) {
			var dpIndex = -1; // -1=not found
			var i,j;
			for(i=0; i < g_dpList.length; i ++)
			{
				for(j=0; j < g_dpList[i].displayElements.length; j ++)
				{
				
					if(g_dpList[i].displayElements[j].displayId == displayId) {
						dpIndex = i;
						i = g_dpList.length + 5;
						break;
					}
				}
			}
			return dpIndex;
		}
		
		function findDisplayIndexByDisplayId(displayId) {
			var dpIndex = {}; // -1=not found
			var i,j;
			for(i=0; i < g_dpList.length; i ++)
			{
				for(j=0; j < g_dpList[i].displayElements.length; j ++)
				{
				
					if(g_dpList[i].displayElements[j].displayId == displayId) {
						dpIndex.dpListIndex = i;
						dpIndex.displayElementsIndex = j;
						i = g_dpList.length + 5;
						break;
					}
				}
			}
			return dpIndex;
		}
		function login() {
			var loginUrl = "https://" + window.location.hostname + "/user/login.html?next=";
			loginUrl += document.URL; //document.location;
			window.open(loginUrl,'_self',false);
		} 
		function logout() {
			var logoutUrl = "https://" + window.location.hostname + "/iap/auth/logout";
			requestWritePostData(0, logoutUrl, "", null, null);
			login();
		} 
		function processJsFunctions() {
			// process any jsFunction which has at least one Dp value changed
			//  g_arrDpChangeJsFunctionList list all jsFunctions that had at least one DP value changed
			try 
			{
				var i,j,k ;
				var jsFunctionIndex;
				var dpListIndex;
				var dpList;
				if(g_arrDpChangeJsFunctionList == null)
					return;
				if(g_arrDpChangeJsFunctionList.length > 0) {
					
					for(i=0; i < g_arrDpChangeJsFunctionList.length; i++)
					{
						jsFunctionIndex = g_arrDpChangeJsFunctionList[i];
						
						for(j=0; j < g_arrJsFunctionList.length; j++)
						{
							if(jsFunctionIndex == g_arrJsFunctionList[j].id) {
								if(g_arrJsFunctionList[j].dpList != null) {
									// clear change flag -- only indicates that DP value changed, not if field changed
									for(k=0; k < g_arrJsFunctionList[j].dpList.length; k++)
									{ 
										g_arrJsFunctionList[j].dpList[k].dpValueChanged = false;
									}
									for(k=0; k < g_arrJsFunctionList[j].dpList.length; k++)
									{ 
										dpListIndex = g_arrJsFunctionList[j].dpList[k].dpListIndex;
										if(g_arrJsFunctionList[j].dpList[k].dpName == g_dpList[dpListIndex].dpName) {
											g_arrJsFunctionList[j].dpList[k].dpValueChanged = g_dpList[dpListIndex].dpValueChanged;
											g_arrJsFunctionList[j].dpList[k].value = g_dpList[dpListIndex].value;
										}
									}
									try 
									{
										g_arrJsFunctionList[j].function(g_arrJsFunctionList[j].jsFunctionParameters, g_arrJsFunctionList[j].displayId, 
											g_arrJsFunctionList[j].dpList);
									}
									catch(e) 
									{
										var sErr = e;
									}
								}
							}
						}
					}
				}
			}
			catch (e) {}
			g_arrDpChangeJsFunctionList = [];
		}
		function requestGetData(mode, requestUrlString, callback, failCallback) {
		    try
			{
				var i,k;
				var bNoPagination = true;
				g_bReadInProgress = true; // if no pagination, get set to false after response, for pagination cleared after last response
				if(requestUrlString.includes("&sz="))
					bNoPagination = false;
				
  				var xhr = new XMLHttpRequest();
  				xhr.onreadystatechange = function() {
	    			if (xhr.readyState == 4 && xhr.status == 200) {
						// success
						if(bNoPagination)
							g_bReadInProgress = false;
						g_iRequestErrCount = 0;
					  	var json = null;
						if(this.responseText != "")
							json = JSON.parse(this.responseText); 
					    if(callback && typeof(callback) == "function") {
							callback(mode, requestUrlString,  json);
						}
	    			}
					else if(xhr.readyState == 4 && xhr.status == 401)
					{  // not logged in
						g_bReadInProgress = false;
						g_iRequestErrCount ++;
						//alert(xhr.status + ", " + xhr.statusText); 
					 	if(g_iRequestErrCount >= g_iRequestMaxErr)
					 		clearTimeout(g_timerVar);
						login();
					}
					else if(xhr.readyState == 4 && xhr.status == 404)
					{ // not found
						g_bReadInProgress = false;
						g_iRequestErrCount ++;
						//alert(xhr.status + ", " + xhr.statusText); 
						if(g_iRequestErrCount >= g_iRequestMaxErr)
					 		clearTimeout(g_timerVar);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString,  xhr.status);
						}
					}
					else if(xhr.readyState == 4)
					{
						g_bReadInProgress = false;
						g_iRequestErrCount ++;
						if(g_iRequestErrCount >= g_iRequestMaxErr)
						 	clearTimeout(g_timerVar);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}					
 	 			};
  				xhr.open("GET", requestUrlString, true);
				xhr.send();
			}
			catch(err) {}	
		}
		function requestWriteData(dpName, payload) {
			try
			{
				var dpIndex = findDpIndex(dpName)
				var url = "https://" + location.hostname; // + ":8443";
				url += "/iap/devs/*+name==" + g_dpList[dpIndex].dpUrl + "/value";
				g_dpList[dpIndex].value = payload; //"{" + value + "}";
				g_dpList[dpIndex].writeTimestamp = Date.now(); // feedback delay to eliminate flicker
				updateAllDisplayElements(1, dpName, dpIndex, payload); 
				processJsFunctions(); // need all Dp objects updated first, contains a list of jsFunctions that had at least one DP value changed
				requestWritePutData(0, url, payload, null, null);
			}
			catch(e) {}
		}
		function requestWritePutData(mode, requestUrlString, payload, callback, failCallback) {
			// PUT
			try
			{
	  			var xhr = new XMLHttpRequest();
  				xhr.onreadystatechange = function() {
    				if (xhr.readyState == 4 && xhr.status == 204) {
						// Write successful
						if(callback && typeof(callback) == "function") {
							callback(mode, requestUrlString);
						}
    				}
					else if(xhr.readyState == 4 && xhr.status == 401)
					{
						login();
					}
					else if(xhr.readyState == 4)
					{
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}
  				};
  				xhr.open("PUT", requestUrlString, true);
				xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
				xhr.send(payload);
			}
			catch (err) {}
		}
		function requestWritePostData(mode, requestUrlString, payload, callback, failCallback) {
			try
			{
	  			var xhr = new XMLHttpRequest();
  				xhr.onreadystatechange = function() {
    				if (xhr.readyState == 4 && xhr.status == 204) {
						// Write successful
						if(callback && typeof(callback) == "function") {
							callback(mode, requestUrlString);
						}
    				}
					else if(xhr.readyState == 4 && xhr.status == 401)
					{
						login();
					}
					else if(xhr.readyState == 4)
					{
						//alert(xhr.status + ", " + xhr.statusText);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}
  				};
  				xhr.open("POST", requestUrlString, true);
				xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
 				xhr.send(payload);
			}
			catch (err) {}
		}
		function requestDeleteData(mode, requestUrlString, payload, callback, failCallback) {
			try
			{
	  			var xhr = new XMLHttpRequest();
  				xhr.onreadystatechange = function() {
    				if (xhr.readyState == 4 && xhr.status == 204) {
						// Write successful
						if(callback && typeof(callback) == "function") {
							callback(mode, requestUrlString);
						}
    				}
					else if(xhr.readyState == 4 && xhr.status == 401)
					{
						login();
					}
					else if(xhr.readyState == 4)
					{
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}
  				};
  				xhr.open("DELETE", requestUrlString, true);
				xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
  				xhr.send(payload);
			}
			catch (err) {}
		}
		function setTagResponse(mode, url){
			
		}
		function timer1 () {
			if(g_bReadInProgress)
				return;
			
			if(g_bAddTagToDatapoints)
				return;  // 
			//if(g_bRetryInitialGetRequest)
			//{
			//	g_bRetryInitialGetRequest = false;
			//g_bAddTagToDatapoints = true;
			//	getInitialAllDpValues();
			//}
			if(g_bMaxAgeOneTime) {
				var currentTime = new Date();
				if(currentTime > g_dtMaxAgeOneTimeTimeout) {
					g_bMaxAgeOneTime = false;
					getAllDpValues(true, true, g_sWebpageMaxAgeOneTime);
					return;
				}
			} 
			if(g_iTimerTagListCount == 1)
				getAllDpValues(g_arrTagList[0].useMaxAge, false, g_arrTagList[0].urlTag);  // requires Webpage tags be added to datapoint first  
			else if(g_iTimerTagListCount > 1) {
				g_iCurrentTagListPtr ++;
				if(g_iCurrentTagListPtr >= g_iTimerTagListCount)
					g_iCurrentTagListPtr = 0;
				getAllDpValues(g_arrTagList[g_iCurrentTagListPtr].useMaxAge, false, g_arrTagList[g_iCurrentTagListPtr].urlTag); 
			}
		}
		function updateAllDisplayElements(mode, dpName, dpListIndex, value) {
			// mode: 0= check feedback writeTimeptamp, 1=ignore feedback writeTimestamp
			try {
				var k, z, jsFunctionIndex, iIndex;
				var j = dpListIndex;
				var json;
				if(j == null)
					j = findDpIndex(dpName);
				json = JSON.parse(value);
				g_dpList[j].value = value;
				if((mode == 0) && (g_dpList[j].writeTimestamp != 0))
				{ // Used to stop ficker of old and new value, due to writing to a datapoint
					var current = Date.now();
					if((current - (g_dpList[j].writeTimestamp + writeTimeout)) >= 0)
						g_dpList[j].writeTimestamp = 0;
				}
				if((mode ==1) || (g_dpList[j].writeTimestamp == 0) )
				{
					g_dpList[j].dpValueChanged = true;
					if(g_dpList[j].displayElements != null)
					{
						for(k=0; k < g_dpList[j].displayElements.length; k++)
						{
							try
							{
								if(g_dpList[j].displayElements[k].type != "w")
								{
									if(g_dpList[j].displayElements[k].field != "")
									{
										value = JSON.stringify(json[g_dpList[j].displayElements[k].field]);
									}
									if((!g_dpList[j].displayElements[k].type.includes("w"))
										|| (g_dpList[j].displayElements[k].displayType == "dropdown_text"))
									{
										value = value.replace(/\"/g,"");
									}
									value = value.replace(/{|}/g,"");
									if(g_dpList[j].displayElements[k].decimalPlaces != null) {
										if(g_dpList[j].displayElements[k].decimalPlaces != -1)
											var decimalPlaces = g_dpList[j].displayElements[k].decimalPlaces;
											if(typeof value === "number")
												value = value.toFixed(decimalPlaces);
											else if(typeof value === "string") {
												value = Number(value).toFixed(decimalPlaces);
											}
									}
									if(g_dpList[j].displayElements[k].displayType == "function") {
										g_dpList[j].displayElements[k].function(g_dpList[j].displayElements[k].displayId,
											g_dpList[j].dpName,
											g_dpList[j].displayElements[k].field,
											value);
									}
									else if(g_dpList[j].displayElements[k].displayType == "jsfunction") {
										try 
										{
											iIndex = -1;
											if(typeof g_dpList[j].displayElements[k].function === "number") {
												iIndex = g_dpList[j].displayElements[k].function;
												jsFunctionIndex = -1;
												for(z=0; z < g_arrDpChangeJsFunctionList.length; z++)
												{
													if(iIndex === g_arrDpChangeJsFunctionList[z]) {
														jsFunctionIndex = z;
														break;
													}
												}
												if(jsFunctionIndex == -1) {
													g_arrDpChangeJsFunctionList.push(iIndex);
												}
											}
										}
										catch (e) {}
									}
									else if(g_dpList[j].displayElements[k].displayType == "input")
										document.getElementById(g_dpList[j].displayElements[k].displayId).value = value;
									else if (g_dpList[j].displayElements[k].displayType == "dropdown_text") {
											document.getElementById(g_dpList[j].displayElements[k].displayId).value = value; //jsonValue;
									}
									else if(g_dpList[j].displayElements[k].displayType == "dropdown_number") {
										document.getElementById(g_dpList[j].displayElements[k].displayId).value = value;
									}
									else if(g_dpList[j].displayElements[k].displayType == "span")
										document.getElementById(g_dpList[j].displayElements[k].displayId).innerHTML = value;
									
								}
							}
							catch(err)
							{}
						}
					}
				}
			}
			catch(e) {}
		}
