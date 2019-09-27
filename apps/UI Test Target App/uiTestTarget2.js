/*
 * SmartServer IoT Example application - First Porgression for DspSPcontroller application
 *
 */ 
'use strict';
const mqtt = require('mqtt');
let traceOutputs = 0;

let myAppIf = {
    myAppPID : '90000106000385A8',    // This must match the PID for the XIF which defines this application
    myFbName : 'uiTestTarget2',
    myDeviceHandle : 'opcDev.1',       // Your choice here, but must not already exist on your target SmartServer 
    deadband : 2,               
    gain: 1,
    initialized : false,
    startup : true,
};

var args = process.argv.slice(2);
// An agurment of 1 will turn ON output variable tracing.
if (args.length === 1)
    traceOutputs = parseInt(args[0]);

// Map object are used for keyed (device handle used for key) access to various aspects related to 
// monitored devices, and this application logic

const myInputs = new Map();
const myOutputs = new Map();

let glpPrefix='glp/0';  // this will include the sid once determined
let subscribtionsActive = false;
let myAppTimer;
let nvoHvacStatus = {
    mode:'HVAC_AUTO',
    heat_output_primary: 0.0,
    heat_output_secondary: 0.0,
    cool_output: 50.0,
    econ_output: 0.0,
    fan_output: 0.0,
    in_alarm: 0
}
let activeMode='HVAC_COOL';

let nvoLampFb = {
    value: 0.0,
    state: 0
}
let nvoLampFb_sw2 = {
    state: 'ST_OFF',
    setting: {
        value: 0.0
    },
    scene_number: 0
}
let nvoAlarm;
let nvoEffectiveSP = 26.7;
let nvoColor_2 = {
    encoding: 'COLOR_RGB',  // COLOR_NUL, COLOR_CIE31_LUMEN, COLOR_CIE31_PERCENT, COLOR_RGB, COLOR_TEMPERATURE
    color_value : {
        RGB: {
            red : 0,
            green: 0,
            blue: 0     // 0-255
        }
    }
}

function initializeInputs (interfaceObj) {
    // This function must not be called before the MQTT connection has be esstablished, and the 
    // Internal device has been created and provision by IAP/MQ
    clearTimeout (myDevCreateTmo); // Cancel the auto internal device create
    // These key values used here must match the definiton of the profile.  The developer
    // must recreate the keys with care for proper connection to update events
    myInputs.set ('nviAlarmSimulate', interfaceObj.nviAlarmSimulate.value);
    myInputs.set ('nviHvacMode', 'HVAC_OFF');
    propagateOuput('nviHvacMode', 'HVAC_OFF');
    myInputs.set ('nviLampSw', interfaceObj.nviLampSw.value);
    myInputs.set ('nviLampSw_2', interfaceObj.nviLampSw_2.value);
    myInputs.set ('nviOccupancy', interfaceObj.nviOccupancy.value);
    myInputs.set ('nviColor_2', interfaceObj.nviColor_2);
    myInputs.set ('nviTempSP', 
        {
            occupied_cool: 24.0,
            standby_cool: 26.0,
            unoccupied_cool: 30.0,
            occupied_heat: 20.0,
            standby_heat: 17.8,
            unoccupied_heat: 15.0
        }
    );
    propagateOuput('nviTempSP', myInputs.get('nviTempSP'));
    myInputs.set ('nviLampSw', interfaceObj.nviLampSw.value);
    myInputs.set ('nviLampSw_2', interfaceObj.nviLampSw_2.value);
    myInputs.set ('cpSceneTable[0]', interfaceObj['cpSceneTable[0]'].value);
    myInputs.set ('cpSceneTable[1]', interfaceObj['cpSceneTable[1]'].value);
    myInputs.set ('cpSceneTable[2]', interfaceObj['cpSceneTable[2]'].value);
    myInputs.set ('cpSceneTable[3]', interfaceObj['cpSceneTable[3]'].value);
    handleHvacMode(myInputs.get('nviHvacMode'));
    propagateOuput('nvoEffectiveSP', nvoEffectiveSP);
    propagateOuput('nvoHvacStatus', nvoHvacStatus);
    propagateOuput('nvoColor_2', nvoColor_2);
    myAppTimer = setInterval(modelResponse, 4000);
}    

// environ returns the value of a named environment variable, if it exists, 
// or returns the default value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ?
        process.env[variable] : defaultValue;
}

const client = mqtt.connect(`mqtt://${environ('DEV_TARGET', '127.0.0.1')}:1883`);
 


// Subscribe to the segment ID topic.
const sidTopic = `${glpPrefix}/././sid`;
client.subscribe(
    sidTopic,
    (error) => {
        if (error) {
            console.log(error);
        }
    }
);

// This function will fire if the internal device for this application does not exist.
// This is the case the very first time this application runs on the target SmartServer.  
// This device will exist on the SmartServer until it is deleted by user action in the CMS
// or the SmartServer Apollo-reset normal... is executed.
const myDevCreateTmo = setTimeout (() => {
    console.log('Creating the internal device for the uiTargTester applicaton');
    let createMyAppMsg = {
        action: 'create',
        args: {
            unid: 'auto',
            type: myAppIf.myAppPID,
            'lon.attach': 'local'
            }
        } // CreateMyAppMsg {}
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/do`,
        JSON.stringify(createMyAppMsg)
    );
    let setCfg = {
        name: `${myAppIf.myDeviceHandle}`,
        desc: 'Intenal Device for Developer testing'
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/cfg`,
        JSON.stringify(setCfg)
    );

    },  // IAP/MQ do {action: 'create'} 
    10000
); //10s timeout to determine if the Internal device exists

function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`${nowTs.toISOString()}- SmartServer SID: ${sidMsg}`);
            // Note how the '+' wild card is used to monitor device status for 
            // any lon device.  Note, once we know the SID, we need to avoid
            // adding multiple listeners.  Subscbribe once and only once              
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/#`);
                // NVs and CP updates appear on this event channel
                client.subscribe (`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.myAppPID}`);
                client.subscribe (`${glpPrefix}/ev/error`);
                client.unsubscribe (sidTopic);
                subscribtionsActive = true;
            } else {
                console.log(`${nowTs.toISOString()} - Redundant SID topic message`);
            }
        } else {
            // We are not provisioned.
                sid = undefined;
                cosole.log(`${nowTs.toISOString()} - [${s}] Problem with SID payload.`);
        }
    } else {
        console.error('The sid topic returned an unexpected payload type.')
    }
}

function handleOccupany (occupancy) {
    let setpoints = myInputs.get('nviTempSP');
    if (nvoHvacStatus.mode == 'HVAC_HEAT') {
        nvoEffectiveSP = occupancy === 'OC_OCCUPIED' ? setpoints.occupied_heat : setpoints.standby_heat;
        nvoHvacStatus.cool_output = 0;
    }
    if (nvoHvacStatus.mode == 'HVAC_COOL' || nvoHvacStatus.mode == 'HVAC_AUTO') {
        nvoEffectiveSP = occupancy === 'OC_OCCUPIED' ? setpoints.occupied_cool : setpoints.standby_cool;
        nvoHvacStatus.heat_output_primary = 0;
    }
    // Assuming the nviLampSw inputs are valid
    nvoLampFb = occupancy === 'OC_OCCUPIED' ? myInputs.get('nviLampSw') : {value: 0.0, state:0};

    if (occupancy === 'OC_UNOCCUPIED')
        nvoLampFb_sw2.setting.value = 0;
    else {
        let sw2now = myInputs.get('nviLampSw_2')
        handleLampSw2(sw2now);
    }    
}
function handleHvacMode (mode) {
    nvoHvacStatus.mode = mode;
    let nviTempSP = myInputs.get('nviTempSP');
    let occupancy = myInputs.get('nviOccupancy');
    let nviHvacMode = myInputs.get('nviHvacMode');
	if (mode === 'HVAC_HEAT') {
		nvoHvacStatus.cool_output = 0.0;
		nvoHvacStatus.heat_output_primary = 50.0;
		nvoEffectiveSP = occupancy === 'OC_OCCUPIED' ? nviTempSP.occupied_heat : nviTempSP.standby_heat; 
		activeMode = 'HVAC_HEAT';
	} 
	if (mode == 'HVAC_COOL' || nviHvacMode == 'HVAC_AUTO') {
		nvoHvacStatus.heat_output_primary = 0.0;
		nvoHvacStatus.cool_output = 50.0;
		nvoEffectiveSP = occupancy === 'OC_OCCUPIED' ? nviTempSP.occupied_cool : nviTempSP.standby_cool; 
		activeMode = 'HVAC_COOL';
	} 
	if (nviHvacMode == 'HVAC_OFF') {
		nvoHvacStatus.cool_output = 0.0;
		nvoHvacStatus.heat_output_primary = 0.0;
		nvoEffectiveSP = activeMode === 'HVAC_HEAT' ? nviTempSP.unoccupied_heat : nviTempSP.unoccupied_cool; 
	} 
}
function handleLampSw2(sw2Val) {
	let i;	
    nvoLampFb_sw2 = {state: sw2Val.state,
        setting : {value : sw2Val.setting.value},
        scene_number: sw2Val.scene_number
    };
	if (sw2Val.state == 'SW_RECALL_SCENE'){
		if (sw2Val.scene_number == 0xFF)
			nvoLampFb_sw2.setting.value = 0;
        else {	
            // Look for a matching scene 
            for (i = 0; i < 3; i++) {
                let sceneDef = myInputs.get(`cpSceneTable[${i}]`)
				if (sceneDef.scene_number == sw2Val.scene_number) {
					nvoLampFb_sw2.setting.value = sceneDef.setting;
					break;
				}
            }
        }
	} // RECALL_SCENE
	if (sw2Val.state == 'SW_SET_OFF') 
		nvoLampFb_sw2.setting.value = 0;
	if (sw2Val.state == 'SW_SET_ON')
		nvoLampFb_sw2.setting.value = 100;
}
function handleColor2 (color) {
    nvoColor_2.encoding = color.encoding;
    if (color.encoding === "COLOR_RGB") {
        nvoColor_2.color_value.RGB = color.color_value.RGB;
        return;
    }
    if (color.encoding === "COLOR_TEMPERATURE") {
        nvoColor_2.color_value.color_temperature = color.color_temperature;
        return;
    }
    if (color.encoding === "COLOR_CIE31_LUMEN") {
        nvoColor_2.color_value.CIE1931_lumen = color.CIE1931_lumen;
        return;
    }
    if (color.encoding === "COLOR_CIE31_PERCENT") {
        nvoColor_2.color_value.CIE1931_percent = color.CIE1931_percent;
        return;
    }
}
function propagateOuput (outputPnt, value) {
    var nowTs = new Date();
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/${outputPnt}/value`,
        JSON.stringify(value),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error (`Failed to update: ${outputPnt} : ${err}`);
        }
    );
    if (traceOutputs) {
        console.log(`${nowTs.toLocaleString()} - ${outputPnt} - Value: ${JSON.stringify(value)}`);
    }
}
function handleMyPointUpdates (updateEvent){
    // The values published in calculateDspSP() will generate updated events
    if (updateEvent.datapoint.search('nvo') !== -1)
        return;
    // Record value in the Interface map
    myInputs.set(updateEvent.datapoint, updateEvent.value);

    if (updateEvent.datapoint === 'nviAlarmSimulate') {
        nvoAlarm = updateEvent.value;
        propagateOuput('nvoAlarm', nvoAlarm);
    }
    if (updateEvent.datapoint === 'nviHvacMode') {
        handleHvacMode(updateEvent.value);
        propagateOuput('nvoHvacStatus', nvoHvacStatus);
        propagateOuput('nvoEffectiveSP', nvoEffectiveSP);
    }
    if (updateEvent.datapoint === 'nviOccupancy') {
        handleOccupany(updateEvent.value);
        propagateOuput ('nvoHvacStatus', nvoHvacStatus);
        propagateOuput ('nvoLampFb', nvoLampFb);
        propagateOuput ('nvoLampFb_sw2', nvoLampFb_sw2);
        propagateOuput ('nvoEffectiveSP', nvoEffectiveSP);
    }
    if (updateEvent.datapoint === 'nviLampSw') {
        nvoLampFb = updateEvent.value;
        propagateOuput ('nvoLampFb', nvoLampFb);
    }
    if (updateEvent.datapoint === 'nviLampSw_2'){
        handleLampSw2(updateEvent.value);
        propagateOuput ('nvoLampFb_sw2', nvoLampFb_sw2);
    }
    if (updateEvent.datapoint === 'nviColor_2'){
        handleColor2(updateEvent.value);
        propagateOuput ('nvoColor_2', nvoColor_2);
    }    

    console.log(`${updateEvent.datapoint}: ${JSON.stringify(updateEvent.value)}`);
            
}
// IAP/MQ. MQTT message handler. 
client.on(
    'message', 
    (topic, message) => {
    try {
        const payload = JSON.parse(message);
        let devHandle;  
        let nowTs = new Date(); // Seconds TS good enough
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  

        // This topic applies to only one device in the system, this internal device
        if (topic.endsWith(`${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0`)) {
            // Note - The payload is null when the device is in the deleted state
            if (payload == null)
                return;
            //     
            if (!myAppIf.initialized) {  
                client.unsubscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/#`); 
                initializeInputs(payload);
                myAppIf.initialized = true;
                console.log(`${myAppIf.myDeviceHandle} internal device interface is ready!`);
            }
        }

        // The IAP channel ../ev/updated will carry updates for NVs/CPs for internal Lon Devices.
        // note that more than one instance could exist.  The Updated event has different
        // structure than a data event.
        if (topic.endsWith (`/ev/updated/dev/lon/type/${myAppIf.myAppPID}`)) {
            if (payload.handle == myAppIf.myDeviceHandle) {
                handleMyPointUpdates(payload);
            }
        }
        if (topic.endsWith('ev/error')) {
            console.log(`${payload.local} - Source: ${payload.source}  - ${payload.message}`);
        }
    } catch(error) {
        console.error('MQTT Message: ' + error);
    }
}   // onMessage handler
);  // onMessage registration

// Adding some dynamics to the simulation by generating a saw tooth of the cool_output
// or the heat_output_primary depending on the control mode.
let rampSlope = 1;
function modelResponse() {
	let step;
	if (nvoHvacStatus.mode === 'HVAC_OFF')
		return;
	if (nvoHvacStatus.mode === 'HVAC_HEAT') {
		step = (Math.random ()  + 1.0) * rampSlope;
		nvoHvacStatus.heat_output_primary += step;
		if (nvoHvacStatus.heat_output_primary > 90)
			rampSlope = -1;
		if (nvoHvacStatus.heat_output_primary < 25)	
			rampSlope = 1;
	} else {
		step = (Math.random ()  + 1.0) * rampSlope;
		nvoHvacStatus.cool_output += step;
			if (nvoHvacStatus.cool_output > 90)
				rampSlope = -1;
			if (nvoHvacStatus.cool_output < 25)	
				rampSlope = 1;			
    }	
    propagateOuput('nvoHvacStatus', nvoHvacStatus);	
}




