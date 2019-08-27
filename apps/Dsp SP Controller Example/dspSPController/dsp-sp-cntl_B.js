/*
 * SmartServer IoT Example application Full example
 *
 */ 
"use strict";
const mqtt = require("mqtt");

/* UFPTDspSPcontroller interface (external name SpController) defined in apolloDev.typ 1.06 or higher:
    Inputs and CPs
    "SpContoller/0/nviAddRouge"     SNVT_str_asc
    "SpContoller/0/nviRemoveRouge"  SNVT_str_asc
    "SpContoller/0/nviShowRouge"    SNVT_count
    "SpContoller/0/nviEnable"       SNVT_switch
    "SpContoller/0/cpDefaultDspSP"  SCPTductStaticPressureSetpoint
    "SpContoller/0/cpDelay"         SCPTdelayTime  
    "SpContoller/0/cpLoopInterval"  SCPTmeasurementInterval 
    "SpContoller/0/cpMaxDspSP"      SCPTmaxDuctStaticPressureSetpoint
    "SpContoller/0/cpMinDspSP"      SCPTminDuctStaticPressureSetpoint
    
    Outputs
    "SpContoller/0/nvoRougeReport"  UNVTdevHanle (index), Device handle (string)
    "SpContoller/0/nvoAvgDemand"    SNVT_lev_percent
    "SpContoller/0/nvoMinDemand"    SNVT_lev_percent
    "SpContoller/0/nvoMaxDemand"    SNTT_lev_percent
    "SpContoller/0/nvoDspSP"      SNVT_press_p output must heartbeat and is intended as an input to the AHU controller
];
*/
let myAppIf = {
    myAppPID : "9000010600038500",    // This must match the PID for the XIF which defines this application
    myFbName : "SpController",
    myDeviceHandle : "myDev.1",       // Your choice here, but must not already exist on your target SmartServer 
    deadband : 2,               
    gain: 1,
    nvoAvgDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoMinDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoMaxDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoDspSP : 0,           // SNVT_press_p pascals
    initialized : false,
    startup : true
};

// This application works with VAV controller SNVT_hvac_status values to drive the control sequence
// This object defines the targeted device type based on the PID.  In this example, the PID is for the
// VAVsim6000 application that should be running on one or more FT 6050 EVBs or FT 5000 EVBs 
// attached to your SmartServer.  Note that event:true, and rate:0 apply in the DMM managed system.
// Use rate: 60, event false in IMM defices
let monitorSpecs = [
    {
        pid: "9000015600040461",    // EVB 6050 target: VAVsim6000
        nvList: [
            // TODO: Chose only one of the following.  Event false and non-zero polling for IMM mode.  
            // event:true is used in DMM systems
            {ptPath: "device/0/nvoVAVstatus", ms:{rate: 0, report: "any", threshold:0, event:true, inFeedback:false}}, 
        ]
    },
    {
        pid: "9000015600040451",    // EVB 5000 target: VAV5000
        nvList: [
            // TODO: Chose only one of the following.  Event false and non-zero polling for IMM mode.  
            // event:true is used in DMM systems
            {ptPath: "device/0/nvoVAVstatus", ms:{rate: 10, report: "any", threshold:0, event:false, inFeedback:false}}, 
        ]
    }
];
// Map objects are used for keyed (device handle used for key) access to various aspects related to 
// monitored devices, and this application logic

const myInputs = new Map();
const devStates = new Map();
const zoneDemand = new Map();
const rougeZones = new Map();

let glpPrefix="glp/0";  // this will include the sid once determined
let subscribtionsActive = false;
let myAppTimer;

function initializeInputs (interfaceObj) {
    // This function must not be called before the MQTT connection has be esstablished, and the 
    // Internal device has been created and provision by IAP/MQ
    clearTimeout (myDevCreateTmo); // Cancel the auto internal device create
    // These key values used here must match the definiton of the profile.  The developer
    // must recreate the keys with care for proper connection to update events
    myInputs.set ("nviAddRouge", interfaceObj.nviAddRouge.value);
    myInputs.set ("nviRemoveRouge", interfaceObj.nviRemoveRouge.value);
    myInputs.set ("nviShowRouge", interfaceObj.nviShowRouge.value);
    // The contoller is enabled by default.
    myInputs.set ("nviEnable", {state:1, value:100});
    myInputs.set ("cpDefaultDspSP", interfaceObj.cpDefaultDspSP.value);
    myInputs.set ("cpDelay", interfaceObj.cpDelay.value);
    myInputs.set ("cpLoopInterval", interfaceObj.cpLoopInterval.value);
    myInputs.set ("cpMaxDspSP", interfaceObj.cpMaxDspSP.value);
    myInputs.set ("cpMinDspSP", interfaceObj.cpMinDspSP.value);
    // This application has one output to feed the Duct Static Pressure Setpoint of an AHU Controller
    // A 3 minute hearbeat and 5 pascal (.020 inches H20) propagation thresold will be applied
    // These parameters would normally be deviced a configuraton points for the FB.
    const pointDriverProps = {
        rate: 0,
        "lon.cfg" : {
            propagationHeartbeat: 180,
            propagationThrottle: 0,
            maxRcvTime: 0,
            propagationThreshold: 5
        }
    };
    // The following Interval timer is where the business logic for the internal application is
    // exectured.  
    myAppTimer = setInterval(calculateDspSP, myInputs.get("cpDelay") * 1000);
    myAppIf.nvoDspSP = myInputs.get("cpDefaultDspSP");

    // This IAP/MQ topic sets up the attributes for handling the primary output of this controller
    // The lon driver specific properties are set here for the point nvoDspSP
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoDspSP/monitor`,
        JSON.stringify(pointDriverProps),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoDspSP");
        }
    );
    // Initial output variable is being set
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoDspSP/value`,
        JSON.stringify(myAppIf.nvoDspSP)
    )
}    

// environ returns the value of a named environment variable, if it exists, 
// or returns the default value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ?
        process.env[variable] : defaultValue;
}

const client = mqtt.connect(`mqtt://${environ("DEV_TARGET", "127.0.0.1")}:1883`);

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
    console.log("Creating the internal device for this applicaton");
    let creatMyAppMsg = {
        action: "create",
        args: {
            unid: "auto",
            type: myAppIf.myAppPID,
            "lon.attach": "local"
        }
    } // CreateMyAppMsg {}
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/do`,
        JSON.stringify(creatMyAppMsg)
        )
    },  // IAP/MQ do {action: "create"} 
    10000
); //10s timeout to determine if the Internal device exists

function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof("xyz")) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`${nowTs.toISOString()}- SmartServer SID: ${sidMsg}`);
            // Note how the "+" wild card is used to monitor device status for 
            // any lon device.  Note, once we know the SID, we need to avoid
            // adding multiple listeners.  Subscbribe once and only once              
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/#`);
                // NVs and CP updates appear on this event channel
                client.subscribe (`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.myAppPID}`);
                // This IAP/MQ topic reports the status of all devices on the lon channel                      
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
                // Subscribe to ALL data events
                client.subscribe (`${glpPrefix}/ev/data`,{qos : 0})               
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
function handleMyPointUpdates (updateEvent){
    // The values published in calculateDspSP() will generate updated events
    if (updateEvent.datapoint.search("nvo") !== -1)
        return;
    // Record value in the Interface map
    myInputs.set(updateEvent.datapoint, updateEvent.value);
    // If required, at check for nvi and CPs values that require generate a event driven response
    if (updateEvent.datapoint === "nviEnable")
        myAppIf.nvoDspSP = updateEvent.value.state == 1 ? myInputs.get("cpDefaultDspSP") : myInputs.get("cpMinDspSP");
    if (updateEvent.datapoint === "cpLoopInterval") {
        clearInterval(myAppTimer);
        myAppTimer = setInterval(calculateDspSP, updateEvent.value * 1000);
    }
    console.log(`${updateEvent.datapoint}: ${JSON.stringify(updateEvent.value)}`);
            
}
function qualifiedDevice (stsMsg) {
    // qualify the device as a targeted for monitoring by returning the monitorSpecs Index            
    let i;
    for (i = 0; i < monitorSpecs.length; i++)
        if (stsMsg.type === monitorSpecs[i].pid)
            return i;
    if (i === monitorSpecs.length)
        return -1;  
}
// Function enables point monitoring for provisioned targeet devices that are healthy
// returning true if monitoring is setup
function handleDeviceSts (devHandle, stsMsg, monSpecIndex) {
    let dpTopic;
    let nowTs = new Date(); // Seconds TS good enough

    if (stsMsg.state === "provisioned") {
        // define the monitorObj assuming provisioned and healthy devices
        let monitorObj = {}; 
   
        // To track the health of monitored devices the devState map is used to determine if the monitoring has be set
        let setMonitorParams = false;
        if (stsMsg.health === "normal") {
            if (!devStates.has(devHandle)) { // First time through, set up monitoring
                devStates.set(devHandle,"normal");
                setMonitorParams = true;
            } else { // Transistion from down or unknown to normal, set monitoring
                if(devStates.get(devHandle) !== "normal") {
                    devStates.set(devHandle, "normal");
                    setMonitorParams = true;                            
                }
            } 
            console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is Up.`);
        } else { 
            devStates.set(devHandle, stsMsg.health);
            console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is ${stsMsg.health}.`);
            return;
        }
        // Setup monitoring of the nvoVAVstatus variable
        monitorSpecs[monSpecIndex].nvList.forEach(function(dp) {
            // setMonitorRate is true at the health transitions and at startup.  
            if (setMonitorParams) {             
                monitorObj = dp.ms;
                dpTopic = `${glpPrefix}/rq/dev/lon/${devHandle}/if/${dp.ptPath}/monitor`;
                console.log (`${nowTs.toISOString()} - Set Monitor: ${dpTopic}, Interval: ${monitorObj.rate} Event: ${monitorObj.event}`);
                client.publish (
                    dpTopic, 
                    JSON.stringify(monitorObj), 
                    {qos:2,retain: false}, 
                    (err) => {
                        if (err != null)
                            console.error(`${nowTs.toISOString()} - Failed to update Nv`);
                    }     
                );
            }                   
        });
        return;
    } else {
        devStates.delete(devHandle);  // If not provisioned, drop all consideration
        zoneDemand.delete(devHandle);
        console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${payload.addr.domain[0].subnet}/${payload.addr.domain[0].node}) is ${d1.state}`);
    }   
    return;
}
// IAP/MQ. MQTT message handler. 
client.on(
    "message", 
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
                console.log("myDev.1 internal device interface is ready!");
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
        // Process glp/0/{sid}/fb/dev/lon/+/sts messages.  Device state and health are used to determine if the 
        // data events are to be considered valid
        if (topic.endsWith ("/sts")) {  
            let monSpecIndex;
            monSpecIndex = qualifiedDevice(payload);
            if (monSpecIndex == -1)
                return;
            devHandle = topic.split("/")[6];
            handleDeviceSts (devHandle, payload, monSpecIndex);    
        }
        // Data events will arrive on this topic.  In this example, the monitoring for the VAV 
        // SNVT_hvac_status is set to events:true (DMM mode).  The LTE engine will create a bound connection
        // to the network variable.
        if (topic.endsWith ("/ev/data")) {
            // Payload is a DP update, but the /ev/data topic could include many other data
            // events that are used by this application.
            let logRecord;
            let dpState;
            let pointPath;

            // <TS>,"<PointPath>","","","PointState,"","<value>"
            // Build up the to the <value>.  Making a log record that matches
            // SmartServer 2 log format
            devHandle =  payload.topic.split("/")[6];
            // Only looking for data events from targed devices
            if (devStates.has(devHandle)) {
                if (devStates.get(devHandle) == "normal") {
                    zoneDemand.set(devHandle, payload.data.cool_output);
                } else // Prevent stale data from being used in the control
                    zoneDemand.delete (devHandle);  
                dpState = devStates.get(devHandle) == "normal" ? "ONLINE" : "OFFLINE";
                pointPath = `${payload.message.split("/")[0]}.cool_output:`;
                logRecord = `${devHandle}/../${pointPath} ${payload.data.cool_output} ${dpState}`; 
                console.log(logRecord);     
            }
        }
        // The IAP channel ../ev/updated will carry updates for NVs/CPs for internal Lon Devices.
        // Note that more than one instance could exist.  The Updated event has different
        // structure than a data event.
        if (topic.endsWith (`/ev/updated/dev/lon/type/${myAppIf.myAppPID}`)) {
            if (payload.handle == myAppIf.myDeviceHandle) {
                // The values published in calculateDspSP() will generate updated events
                if (payload.datapoint.search("nvo"))
                    return;
                // If required, checks for nvi values that must generate a event driven response
                if (payload.datapoint === "nviEnable") {
                    myAppIf.nvoDspSP = payload.datapoint.value.state == 1 ? myInputs.get("cpDefaultDspSP") : myInputs.get("cpMinDspSP");    
                    client.publish(
                        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoDspSP/value`,
                        JSON.stringify(myAppIf.nvoDspSP)
                    )   
                }
                console.log(`${payload.datapoint}: ${JSON.stringify(payload.value)}`);
            }
        }
    } catch(error) {
        console.error("MQTT Message: " + error);
    }
}   // onMessage handler
);  // onMessage registration


function calculateDspSP() {
    let nowTs = new Date(); // Seconds TS good enough
    if (myAppIf.startup) {
        clearInterval (myAppTimer);
        // Setup regular interval processing of algrithm
        myAppTimer = setInterval(calculateDspSP, myInputs.get("cpLoopInterval") * 1000);
        myAppIf.startup = false;
    }
    if (zoneDemand.size > 0) {
        let minVal = 100.0;
        let maxVal = 0.0;
        let sumDemand = 0.0;
        zoneDemand.forEach((value)=> {
            sumDemand += value;
            if (value < minVal)
                minVal = value;
            if (value > maxVal)
                maxVal = value;    
        });
        myAppIf.nvoMaxDemand = maxVal;
        myAppIf.nvoMinDemand = minVal;
        myAppIf.nvoAvgDemand = sumDemand/zoneDemand.size;
    }

    // Seek to keep the maximum zoned demand to 90%.  When a zone exceeds 95%, increase Dsp
    // Stop the adustment until when the pressure dips below 90%.  When the maximum box demand
    // drops below 85%, adjust Dsp downward by not a the 
    if (myInputs.get("nviEnable").state) {
        if (myAppIf.nvoMaxDemand == undefined)
            return;
        if ((myAppIf.nvoMaxDemand  >= 90 - myAppIf.deadband) && (myAppIf.nvoMaxDemand  <= 90 + myAppIf.deadband))
            return; // No adjustment need
        
        let error = myAppIf.nvoMaxDemand  - 90;
        myAppIf.nvoDspSP += parseInt(myAppIf.gain * error); 
        // Clip the DspSP 
        if (myAppIf.nvoDspSP  < myInputs.get("cpMinDspSP")) 
            myAppIf.nvoDspSP  = myInputs.get("cpMinDspSP");
        if (myAppIf.nvoDspSP  > myInputs.get("cpMaxDspSP"))    
            myAppIf.nvoDspSP  = myInputs.get("cpMaxDspSP");
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/SpController/0/nvoDspSP/value`,
        JSON.stringify(myAppIf.nvoDspSP)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/SpController/0/nvoMinDemand/value`,
        JSON.stringify(myAppIf.nvoMinDemand)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/SpController/0/nvoMaxDemand/value`,
        JSON.stringify(myAppIf.nvoMaxDemand)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/SpController/0/nvoAvgDemand/value`,
        JSON.stringify(myAppIf.nvoAvgDemand)
    );
}



