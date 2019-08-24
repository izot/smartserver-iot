/*
 * 
 *
 */ 
"use strict";
const mqtt = require("mqtt");
const map = require ("collections/map"); //collections.js www.collectionsjs.com

/* UFPTDspSPcontroller interface (see apolloDev.typ 1.06 or higher):
    Inputs and CPs
    "DspSPcontroller/0/nviAddRouge"     SNVT_str_asc
    "DspSPcontroller/0/nviRemoveRouge"  SNVT_str_asc
    "DspSPcontroller/0/nviShowRouge"    SNVT_count
    "DspSPcontroller/0/nviEnable"       SNVT_switch
    "DspSPcontroller/0/cpDefaultDspSP"  SCPTductStaticPressureSetpoint
    "DspSPcontroller/0/cpDelay"         SCPTdelayTime  
    "DspSPcontroller/0/cpLoopInterval"  SCPTmeasurementInterval 
    "DspSPcontroller/0/cpMaxDspSP"      SCPTmaxDuctStaticPressureSetpoint
    "DspSPcontroller/0/cpMinDspSP"      SCPTminDuctStaticPressureSetpoint
    
    Outputs
    "DspSPcontroller/0/nvoRougeReport"  UNVTdevHanle (index), Device handle (string)
    "DspSPcontroller/0/nvoAvgDemand"    SNVT_lev_percent
    "DspSPcontroller/0/nvoMinDemand"    SNVT_lev_percent
    "DspSPcontroller/0/nvoMaxDemand"    SNTT_lev_percent
    "DspSPcontroller/0/nvoDspSP"      SNVT_press_p output must heartbeat and is intended as an input to the AHU controller
];
*/
let myAppIf = {
    myAppPID : "9000010600030400",    //This must match the PID for the XIF which defines this application
    myDeviceHandle : "myDev.1",
    deadband : 2,
    gain: 1,
    nvoAvgDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoMinDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoMaxDemand : -1.0,     // SNVT_lev_percent 0-100 at 0.5 steps
    nvoDspSP : 0,           // SNVT_press_p pascals
};

// This application works with VAV controller SNVT_hvac_status values to drive the control sequence
// This opject
let monitorSpecs = [
    {
        pid: "9000015600040400",    // TODO: Set this value to match your system
        nvList: [
            // TODO: Chose only one of the following.  Event false and non-zero polling for IMM mode.  event:true is used in DMM systems
            {ptPath: "device/0/nvoVAVstatus", ms:{rate: 0, report: "any", threshold:0, event:true}}, 
            // {ptPath: "Device/0/nvoStatus",ms:{rate: 0, report: "change", threshold:1, inFeedback:false, event:true}},
        ]
    },

    /*{ // TODO: In somecase you may have multiple device types providing the SNVT_hvac_status value that this application needs to monitor
        pid: "900010000000",    // TODO: Set this value to match your system.
        nvList: [
            // TODO: Chose only one of the following.  Event false and non-zero polling for IMM mode.  event:true is used in DMM systems
            {ptPath: "Device/0/nvoStatus", ms:{rate: 20, report: "any", threshold:0, event:fasle}}, 
            // {ptPath: "Device/0/nvoStatus",ms:{rate: 0, report: "change", threshold:1, inFeedback:false, event:true}},
        ]
    }*/
];
const devStates = new Map();
const zoneDemand = new Map();
const rougeZones = new Map();
const myInputs = new Map();

let glpPrefix="glp/0";  // this will include the sid once determined
let subscribtionsActive = false;
let myAppTimer;
let DspSP = 0;

function initializeInputs (interfaceObj) {
    clearTimeout (myDevCreateTmo);
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
    // This application has one output to feed the Duct Static Pressure Setpoint to the AHU
    // A 3 minute hearbeat and 12 pascal (.048 inches H20) propagation thresold will be applied
    // These parameters would normally be deviced a configuraton points for the FB.
    const monObj = {
        rate: 0,
        "lon.cfg" : {
            propagationHeartbeat: 180,
            propagationThrottle: 0,
            maxRcvTime: 0,
            propagationThreshold: 1
        }
    };
    myAppTimer = setInterval(calculateDspSP, myInputs.get("cpLoopInterval") * 1000);
    myAppIf.nvoDspSP = myInputs.get("cpDefaultDspSP");

    // This IAP/MQ topic sets up the attributes for handling the primary output of this controller
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0/nvoDspSP/monitor`,
        JSON.stringify(monObj),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoDspSP");
        }
    );
}    

// environ returns the value of a named environment
// variable, if it exists, or returns the default
// value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ?
        process.env[variable] : defaultValue;
}
const client = mqtt.connect(`mqtt://${environ("DEV_TARGET", "127.0.0.1")}:1883`);
// If devHandle is not provided as an argument, it is assumed there is only one matching
// device PID in the system
let args = process.argv.slice(2);

let myDevHandle = "";
if (args.length === 1)
    myDevHandle = args[0];

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
// This function will fire if the internal device for this application does not exist
// which is the case the very first time the application runs on the target.
const myDevCreateTmo = setTimeout (function () {
    console.log("Creating the internal device for this applicaton");
    let creatMyAppMsg = {
        action: "create",
        args: {
            unid: "auto",
            type: myAppIf.myAppPID,
            "lon.attach": "local"
        }
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/do`,
        JSON.stringify(creatMyAppMsg)
    )
    }, 
    6000);


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
            if (typeof(payload) === typeof("xyz")) {
                if (payload.length > 0) {
                    glpPrefix += `/${payload}`;
                    console.log(`${nowTs.toISOString()}- SmartServer SID: ${payload}`);
                    // Note how the "+" wild card is used to monitor device status for 
                    // any lon device.  Note, once we know the SID, we need to avoid
                    // adding multiple listeners.  Subscbribe once and only once              
                    if (!subscribtionsActive) { 
                        // This IAP/MQ topic reports the status of all devices on the lon channel                      
                        client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
                        // Subscribe to ALL data events
                        client.subscribe (`${glpPrefix}/ev/data`,{qos : 0})
                        // All action of the internal application come through this topic ../ev/updated/dev/lon/type
                        client.subscribe (`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.myAppPID}`);
                        // We need to find the current state of on interace for this internal application
                        client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0`);
                        client.unsubscribe (sidTopic);
                        subscribtionsActive = true;
                    } else {
                        console.log(`${nowTs.toISOString()} - Redundant SID topic message`);
                    }
                } else {
                    // We are not provisioned.
                    sid = undefined;
                    cosole.log(`${nowTs.toISOString()} - [${payload}] Problem with SID payload.`);
                }
            }
        }  
        // This topic applies to only one device in the system
        if (topic.endsWith(`${myAppIf.myDeviceHandle}/if/DspSPcontroller/0`)) {
            if (payload.state == "deleted")
                return;
            // topic: glp/0/{sid}/fb/dev/lon/{devHandle}/sts
            //        [0][1] [2] [3][4] [5]   [6]
            devHandle = topic.split("/")[6];
            initializeInputs(payload);
            client.unsubscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0`);
            console.log("myDev.1 internal device interface is ready!")
        }
        // Process glp/0/{sid}/fb/dev/lon/+/sts messages.  Device state and health are used to determine if the 
        // data events are to be considered valid
        if (topic.endsWith ("/sts")) {  
            let dpTopic;
            let i;
            // topic: glp/0/{sid}/fb/dev/lon/{devHandle}/sts
            //        [0][1] [2] [3][4] [5]   [6]
            devHandle = topic.split("/")[6];
            // qualify the device as a target VAV for monitoring
            for ( i = 0; i < monitorSpecs.length; i++)
                if (payload.type === monitorSpecs[i].pid)
                    break;
            if (i === monitorSpecs.length)
                return; 
            if (payload.state === "provisioned") {
                // define the monitorObj assuming provisioned and healthy devices
                let monitorObj = {}; 
           
                // Track the health of monitored devices in the devState map is used to determine if the monitoring has be set
                let setMonitorParams = false;
                if (payload.health === "normal") {
                    if (!devStates.has(devHandle)) { // First time through, set up monitoring
                        devStates.set(devHandle,"normal");
                        setMonitorParams = true;
                    } else { // Transistion from down or unknown to normal, set monitoring
                        if(devStates.get(devHandle) !== "normal") {
                            devStates.set(devHandle,"normal");
                            setMonitorParams = true;                            
                        }
                    } 
                    console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${payload.addr.domain[0].subnet}/${payload.addr.domain[0].nodeId}) is Up.`);
                } else { 
                    devStates.set(devHandle,payload.health);
                    console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${payload.addr.domain[0].subnet}/${payload.addr.domain[0].nodeId}) is ${d1.health}.`);
                }

                monitorSpecs[i].nvList.forEach(function(dp) {
                    if (payload.health !== "normal") {
                        offlineLogRecord = `${nowTs.toISOString()};\"${devHandle}/if/${dp}"\;\"OFFLINE\";\"\"\r\n`; 
                        console.log (offlineLogRecord);   
                    };
                    // setMonitorRate is true at the health transitions and at startup.  
                    if (setMonitorParams) {             
                        monitorObj = dp.ms;
                        dpTopic = `${glpPrefix}/rq/dev/lon/${devHandle}/${dp.ptPath}`;
                        console.log (`${nowTs.toISOString()} - Set Monitor: ${dpTopic}, Interval: ${monitorObj.rate}`);
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
                    return;                           
                });                    
            } else {
                devHandle = topic.split("/")[6];
                devStates.delete(devHandle);
                console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${payload.addr.domain[0].subnet}/${payload.addr.domain[0].node}) is ${d1.state}`);
            }   
        }
        // Data events will arrive on this topic.  In this example, the monitoring for the VAV 
        // SNVT_hvac_status is set to events:true.  The LTE engine will create a bound connection
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
        // The IAP channel will carry updates for NVs/CPs for internal Lon Devices.
        // note that more than one instance could exist.  The Updated event has different
        // structure than a data event.
        if (topic.endsWith (`/ev/updated/dev/lon/type/${myAppIf.myAppPID}`)) {
            if (payload.handle == myAppIf.myDeviceHandle) {
                // The values published in calculateDspSP() will generate updated events
                if (payload.datapoint.search("nvo"))
                    return;
                // If required, at checks for nvi values that must generate a event driven response
                if (payload.datapoint === "nviEnable")
                    DspSP = payload.datpoint.value.state == 1 ? myInputs.get("cpDefaultDspSP") : myInputs.get("cpMinDspSP");    

                console.log(`${payload.datapoint}: ${JSON.stringify(payload.value)}`);
            }
        }
    } catch(error) {
        console.error("MQTT Message: " + error);
    }
}   // onMessage handler
);  // onMessage registration


function calculateDspSP() {
    myAppIf.nvoMaxDemand = zoneDemand.max();
    myAppIf.nvoMinDemand = zoneDemand.min();
    myAppIf.nvoAvgDemand = zoneDemand.average();
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
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0/nvoDspSP/value`,
        JSON.stringify(myAppIf.nvoDspSP)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0/nvoMinDemand/value`,
        JSON.stringify(myAppIf.nvoMinDemand)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0/nvoMaxDemand/value`,
        JSON.stringify(myAppIf.nvoMaxDemand)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/DspSPcontroller/0/nvoAvgDemand/value`,
        JSON.stringify(myAppIf.nvoAvgDemand)
    );
}



