/*
*   pointmonitor.js
*/
"use strict";
const mqtt = require('mqtt');

const devStates = new Map();

let glpPrefix="glp/0";  // this will include the sid once determined 
var  subscribtionsActive = false;

// Edit monitorSpecs object array according to your requirements to monitor the targets data points of interest
var monitorSpecs = [
    {
        pid: '9FFFFF0501840460',
        nvList: [
            {ptPath: 'LightSensor/0/nvoLuxLevel', ms:{rate: 20, report: 'any', threshold:0, inFeedback:false, event:false}}, 
            {ptPath: 'TempSensor/0/nvoHVACTemp', ms:{rate: 20, report: 'any', threshold:0, inFeedback:false, event:false}},
            {ptPath: 'Switch/0/nvoValue', ms:{rate: 20, report: 'any', threshold:0, inFeedback:false, event:false}},
        ]
    },
    {
        pid: '9FFFFF0501840450',
        nvList: [
            {ptPath: 'LightSensor/0/nvoLuxLevel', ms:{rate: 20, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'TempSensor/0/nvoHVACTemp', ms:{rate: 20, report: 'any', threshold:0, inFeedback:false, event:false}},
            {ptPath: 'Switch/0/nvoValue', ms:{rate: 20, report: 'any', threshold:0, inFeedback:false, event:false}},
        ]
    }
];


// environ returns the value of a named environment variable, if it exists, or returns the default value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ? process.env[variable] : defaultValue;
}

 // Set up a MQTT client for the duration of the app lifetime.
const client = mqtt.connect(`mqtt://${environ('DEV_TARGET', '127.0.0.1')}:1883`);
var rateOverride = -1;  // -2 means DLA managed polling. -1 means use monitor spec value. >= 0 set as the monitor rate

var args = process.argv.slice(2);
// rateOverride of -1 uses the rate defined in MonitorSpecs Object array, -2 assumes the DLA file was used to define
// the monitor rate.  0 will stop monitoring and the the application will exit
if (args.length === 1)
    rateOverride = parseInt(args[0]);
console.log ('PointMonitor applicaiton rateOverride: %d',rateOverride);

console.log (`PointMonitor applicaiton rateOverride: ${rateOverride}`);
if (rateOverride === -2)
    console.log ('An active DLA file must be use to start monitoring');

// Openloop exit after 20s operation, assuming all the targeted monitor points get set to 0
if (rateOverride === 0)
    setTimeout(() => { 
            console.log ('Exitting point monitor application. Monitor rates set to 0.');
            process.exit();
        }, 
        40000
    );

const sidTopic = 'glp/0/././sid'

    // Subscribe to the segment ID topic.
client.subscribe(
    sidTopic,
    (error) => {
        if (error) {
            console.log(error);
        }
    }
);

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
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
                client.subscribe (`${glpPrefix}/ev/data`);
                client.unsubscribe (sidTopic);
                subscribtionsActive = true;
            } else {
                console.log(`${nowTs.toISOString()} - Redundant SID topic message`);
            }
        } else {
            // We are not provisioned.
            cosole.log(`${nowTs.toISOString()} - [${sidMsg}] Problem with SID payload.`);
        }
    } else {
        console.error('The sid topic returned an unexpected payload type.')
    }
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
        console.log(`${nowTs.toISOString()} - Device: ${devHandle} (S/N: ${payload.addr.domain[0].subnet}/${payload.addr.domain[0].node}) is ${d1.state}`);
    }   
    return;
}

// IAP/MQ. MQTT message handler. 
client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message);
        let devHandle;  
        var nowTs = new Date(); // Seconds TS good enough

        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        if (topic.endsWith ("/sts")) {  
            let monSpecIndex;
            monSpecIndex = qualifiedDevice(payload);
            if (monSpecIndex == -1)
                return;
            devHandle = topic.split("/")[6];
            handleDeviceSts (devHandle, payload, monSpecIndex);    
        }
        if (topic.endsWith ('/ev/data')) {
            // Payload is a DP update. 
            let logRecord;
            let dpState;
            let pointPath;

            // <TS>,'<PointPath>','','','PointState,'','<value>'
            // Build up the to the <value>.  Making a log record that matches
            // SmartServer 2 log format
            
            devHandle =  payload.topic.split('/')[6];
            // Only looking for data events from targed devices. Just sending to the console in this example
            if (devStates.has(devHandle)) {
                dpState = devStates.get(devHandle) == "normal" ? 'ONLINE' : 'OFFLINE';
                pointPath = `${payload.topic.split('/')[7]}/${payload.topic.split('/')[8]}/${payload.topic.split('/')[9]}/${payload.message.split('/')[0]}`;
                logRecord = `${nowTs.toISOString()};\"${devHandle}/${pointPath}\";\"${dpState}\";\"${JSON.stringify(payload.data)}\"`; 
                console.log(logRecord); 
            }
        }
    } catch(error) {
        console.error(nowTs.toISOString() + ' - MQTT Message: ' + error);
    }
}   // onMessage handler
);  // onMessage registration
