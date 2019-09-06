/*
	Device Browser - This Web page is used to show Device and Device 
	Datapoint (DP) informtion and is one of the major tools to troubleshoot
	IzoT network issue.


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
	    var g_sWebpageTag = "xyz_generic=1"; // *** Custom Web page #3  *** -- change xyz to your company tagname, and simple to your Web page tag value
		var g_bAddTagToDatapoints = true;
		var g_timerInterval = 2000;
		var g_bReadInProgress = 0;  // true for Single GET request if no pagination, true for multiple request if pagination used
	    var g_dpList = [];
		var g_dpListIndex = -1;
		var g_writeTimeout = 10000; //time (ms) to wait after a write to DP before updating value with latest read
		var g_cookie = "";
		var g_timerVar;
		var g_iRequestErrCount = 0;
		var g_iRequestMaxErr = 1;
		var g_sUrlTag = ""; //leave blank - used for GET request
		var g_sWriteTagPayload = ""; // leave blank - used to add tag to datapoint
		var g_bRetryInitialGetRequest = false;  //
		var g_arrPaginationResponse = [];  //
		var g_iPaginationPage = 0; // Used for GET pagination
		var g_iPaginationPageSize = 20; // Used for GET pagination
		var g_iPaginationSnapsnotNumber = 0; // Used for GET pagination
		
		function init1() {
		    // not Web page specific changes
			initAddExtraItemsToDpList();
			
			var iPtr = g_sWebpageTag.indexOf("=");
			if((iPtr > 0) && ((iPtr + 1) < g_sWebpageTag.length))
			{
				g_sUrlTag = g_sWebpageTag.substr(0,iPtr) + "&tag.value==" + g_sWebpageTag.substr(iPtr + 1);
				g_sWriteTagPayload = "\"" + g_sWebpageTag.substr(0,iPtr) + "\"=\"" + g_sWebpageTag.substr(iPtr + 1) + "\"";
			}
			else
			{
				g_sUrlTag = g_sWebpageTag;
				g_sWriteTagPayload = g_sWebpageTag;
			}

			document.getElementById("logout").addEventListener("click",logout); // add onclick for logout a tag link
			
			timerVar = setInterval(timer1, g_timerInterval);
			getInitialAllDpValues();
		}
		function initAddExtraItemsToDpList() {
			// additional items used during runtime
			var i, j, iPtr;
			var name = "";
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
						}
						catch (err) {}
					}
				}
			}
			
		}
		
		function checkIfTagAssignedToDp() {
		    // Ran after doing first GET reguest using Web page tag
			// checks if datapoint needs a single read or whether it datapoint is missing Web page tag
		    var i,k;
			if(!g_bAddTagToDatapoints)
				return;
			try
			{
				g_dpListIndex ++;
				if(g_dpListIndex >= g_dpList.length)
				{
					g_bAddTagToDatapoints = false;
					g_dpListIndex = -2;
					return;
				}
				var type = "";
				for(i=g_dpListIndex; i < g_dpList.length; i++)
				{
					if(g_dpList[i].g_bGotValue)
					{
						// already has tag do nothing
					}
					else if(g_dpList[i].displayElements != null)
					{  // Check if need to add tag or do single read
						for(k=0; k < g_dpList[i].displayElements.length; k++)
						{
							try
							{
								if((g_dpList[i].displayElements[k].type == "r") || (g_dpList[i].displayElements[k].type == "rw"))
								{
									type = "setTag";
									break;
								}
								else if ((g_dpList[i].displayElements[k].type == "ro") || (g_dpList[i].displayElements[k].type == "row") 
									|| (g_dpList[i].displayElements[k].type == "w"))
								{  // for "w" just want to save value, but isn't shown on Web page
									type = "read";	
								}
							}
							catch(err)
							{}
						}
						if(type != "")
						{
							g_dpListIndex = i;
							try
							{
								var url = "https://" + location.hostname; // + ":8443";
								if(type == "read")
								{
									url += "/iap/devs/*+name==" + g_dpList[g_dpListIndex].dpUrl + "/value";
									requestGetData(0, url, getInitialSingleDpValueResponse, getInitialAllDpValuesResponseFailure);
								}
								else if(type == "setTag")
								{
									url += "/iap/devs/*+name==" + g_dpList[g_dpListIndex].dpUrl + "/tags";
									requestWritePostData(0, url, g_sWriteTagPayload, setTagResponse, setTagResponse);
								}
							}
							catch (err) {}
							break;
						}
					}
				}
				if(type == "")
				{
					g_bAddTagToDatapoints = false;
					g_dpListIndex = -2;
				}
				
			}
			catch (err) {}	
			
		}
		function dropdownWrite() {
			try {
				var displayId = this.id;
				var displayInfo = findDisplayIndexByDisplayId(displayId);
				
				if(Object.keys(displayInfo).length |= 0) {
					var iIndex = displayInfo.dpListIndex;
					if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].field == "") {
						url = "https://" + location.hostname; // + ":8443";
						url += "/iap/devs/*+name==" + g_dpList[iIndex].dpUrl + "/value";
						var value = document.getElementById(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayId).value;
						g_dpList[iIndex].value = value; //"{" + value + "}";
						payload = value;
						if(g_dpList[iIndex].displayElements[displayInfo.displayElementsIndex].displayType == "dropdown_text")
							payload = "\"" + value + "\""; // add quoates for enums
						g_dpList[iIndex].writeTimestamp = Date.now();
						requestWriteData(0, url, payload, null, null);
					}
				}
			} catch (err) {}
		}
		function getAllDpValues() {
		    var i,k;
			g_iPaginationPage = 1; // Used for GET pagination
			g_arrPaginationResponse = [];
			var url = "https://" + location.hostname; //+ ":8443";
			url += "/iap/devs/*/if/*/*/*+tag==" + g_sUrlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
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
			var i,j, k;
			if(json != null)
			{
				for(i = 0; i < json.length; i++)
				{
					try
					{
						var dpPath = json[i].deviceName + "/" + json[i].blockName + "/" + json[i].blockIndex + "/" + json[i].datapointName
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
									g_dpList[j].value = value;
									if(g_dpList[j].writeTimestamp != 0)
									{ // Used to stop ficker of old and new value, due to writing to a datapoint
										var current = Date.now();
										if((current - (g_dpList[j].writeTimestamp + writeTimeout)) >= 0)
											g_dpList[j].writeTimestamp = 0;
									}
									if(g_dpList[j].writeTimestamp == 0)
									{
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
															value = JSON.stringify(json[i].value[g_dpList[j].displayElements[k].field]);
														}
														if((!g_dpList[j].displayElements[k].type.includes("w"))
															|| (g_dpList[j].displayElements[k].displayType == "dropdown_text"))
														{
															value = value.replace(/\"/g,"");
														}
														value = value.replace(/{|}/g,"");
														if("decimalPlaces"  in g_dpList[j].displayElements[k]) {
															if(g_dpList[j].displayElements[k].decimalPlaces != -1)
																var decimalPlaces = g_dpList[j].displayElements[k].decimalPlaces;
																if(typeof value === "number")
																	value = value.toFixed(decimalPlaces);
																else if(typeof value === "string") {
																	value = Number(value).toFixed(decimalPlaces);
																}
														}
														if(g_dpList[j].displayElements[k].displayType == "input")
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
								break;
							 } catch(err) {}
							}
						}
					}
					catch(err)
					{}
				}
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
			g_iPaginationPage = 1; // Used for GET pagination
			g_arrPaginationResponse = [];
			var url = "https://" + location.hostname; // + ":8443";
			url += "/iap/devs/*/if/*/*/*+tag==" + g_sUrlTag + "/value?pg=1&sz=" + g_iPaginationPageSize;
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
				getDpValueResponse(mode, requestUrlString, g_arrPaginationResponse);
				g_arrPaginationResponse = [];
				checkIfTagAssignedToDp(); // start check
			}
			
		}
		function getInitialAllDpValuesResponseFailure(mode, requestUrlString, json) {
			g_bRetryInitialGetRequest = true;
		}
		function getInitialSingleDpValueResponse(mode, requestUrlString, json) {
			getDpValueResponse(mode, requestUrlString, json);
			checkIfTagAssignedToDp(); // continue checking
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
					 		clearTimeout(timerVar);
						login();
					}
					else if(xhr.readyState == 4 && xhr.status == 404)
					{ // not found
						g_bReadInProgress = false;
						g_iRequestErrCount ++;
						//alert(xhr.status + ", " + xhr.statusText); 
						if(g_iRequestErrCount >= g_iRequestMaxErr)
					 		clearTimeout(timerVar);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString,  xhr.status);
						}
					}
					else if(xhr.readyState == 4)
					{
						g_bReadInProgress = false;
						g_iRequestErrCount ++;
						//alert(xhr.status + ", " + xhr.statusText); 
						if(g_iRequestErrCount >= g_iRequestMaxErr)
						 	clearTimeout(timerVar);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}					
 	 			};
  				xhr.open("GET", requestUrlString, true);
				//xhr.withCredentials = true;
				//xhr.setRequestHeader('Cookie',cookie)
  				xhr.send();
			}
			catch(err) {}	
		}
		function requestWriteData(mode, requestUrlString, payload, callback, failCallback) {
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
						//alert(xhr.status + ", " + xhr.statusText);
						if(failCallback && typeof(failCallback) == "function") {
							failCallback(mode, requestUrlString, xhr.status);
						}
					}
  				};
  				xhr.open("PUT", requestUrlString, true);
				xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
				//xhr.withCredentials = true;
				//xhr.setRequestHeader('Cookie',cookie)
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
				//xhr.withCredentials = true;
				//xhr.setRequestHeader('Cookie',cookie)
  				xhr.send(payload);
			}
			catch (err) {}
		}
		function setTagResponse(mode, url){
			checkIfTagAssignedToDp();
		}
		function timer1 () {
			if(g_bReadInProgress)
				return;
			if(g_bRetryInitialGetRequest)
			{
				g_bRetryInitialGetRequest = false;
				getInitialAllDpValues();
			}
			if(g_bAddTagToDatapoints)
				return;  // 
			getAllDpValues();  // requires Webpage tags be added to datapoint first  
		}
