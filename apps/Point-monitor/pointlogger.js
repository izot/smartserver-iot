"use strict";
const mqtt = require('mqtt');
const fs = require('fs'); 
const child_process = require('child_process');

const appVersion = '1.03.002';
const devStates = new Map();
const nameMap = new Map();
const msToSet = new Map();
const monitorSetRequestDelay = 2000;

let glpPrefix='glp/0';  // this will include the sid once determined 
let sid='';
let  subscribtionsActive = false;

let  recordCount = 0;
let stagedRecords = 0;
let testLimit = -1;  // -1 means no limit
let delayStart = true;
// Using the prefix 'A' and 'B' to toggle the active log file to 
// avoid contention between logging and copies to the transfer folder
let filePrefix = 'A';

// Edit monitorSpecs object array according to your requirements to monitor the target data points of interest
// Review the IAP/MQ documentation on the use of event: true.  This can only be used in DMM managed systems.
// the ms object below is used to set the monitoring objects of multiple points with one IAP/MQ request
var monitorSpecs = [
    {
        pid: '9000011503020465',
        ptPath: 'device/0',
        ms:{ 
            nvoPF: { monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            nvoI: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}}, 
            nvoU_F: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            nvoP: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            nvoEPpos: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}}
            //nvoPF_2: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            //nvoI_2: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            //nvoU_F_2: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            //nvoP_2: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}},
            //nvoEPapos: {monitor: {rate: 60, report: 'any', inFeedback:false, event:false}}
        }
    }
    
];
// environ returns the value of a named environment variable, if it exists, or returns the default value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ? process.env[variable] : defaultValue;
}

 // Set up a MQTT client for the duration of the app lifetime.
const client = mqtt.connect(`mqtt://${environ('DEV_TARGET', '127.0.0.1')}:1883`);

let logTruncate = true;
let rateOverride = -1;  // -2 means DLA managed polling. -1 means use monitor spec value. >= 0 set as the monitor rate
let  args = process.argv.slice(2);  
if (args.length === 1)
    rateOverride = parseInt(args[0]);

if (args.length === 2){
    rateOverride = parseInt(args[0]);
    delayStart = JSON.parse(args[1]) ;
}

// The first argument is used to override the monitorSpec polling rate. 
if (rateOverride >= 0) {
    monitorSpecs.forEach(target => {
        for (let point in target.ms) {
            target.ms[point].monitor.rate = rateOverride;
        };
    });
}
let nowTs = new Date();
console.log (`${nowTs.toLocaleString()} Pointlogger version: ${appVersion}`);
console.log (`Pointlogger applicaiton rateOverride: ${rateOverride}`);

// Blocking delay to hold off until the rest of the SIOT services are running
if (delayStart) {
    console.log(`Allowing SIOT processes to settle`);
    child_process.execSync("sleep 300");  // Pause for 5 minutes!
}

// Determine available file system assets.  Using SD card on SmartServer if available
// See Integration TODO:
const eloggerDataDir = process.env.hasOwnProperty('APOLLO_DATA') ? '/media/sdcard' : '.';
if (rateOverride === -2)
    console.log ('An active DLA file must be used to start monitoring');

// Integration TODO:
// 1. On Apollo target: sudo mkdir /media/sdcard/eloggerdata
// 2. sudo mkdir /media/sdcard/transfer
// 3. sudo chown apollo:apollo /media/sdcard/eloggerdata
// 4. sudo chown apollo:apollo /media/sdcar/transfer

// Creating the B file place hoder
fs.writeFile(`${eloggerDataDir}/eloggerdata/Bpoint-data.csv`, ``,  {flag: 'w'}, 
    (err) => {
        if (err) {
            console.error(err);
        return;
    }
});
function reportDeviceState () {
    let upDeviceList = '';
    let downDeviceList = '';
    for (const [k, v] of devStates.entries()) {
        if (v !== 'normal')
            downDeviceList += `${k}, `;
        else
            upDeviceList += `${k}, `;    
    }
    console.log (`Up Devices - ${upDeviceList}`);
    console.log (`Down Devices - ${downDeviceList}`);
}
// Scheduling copy to the transfer folder every 5m (300s)
setInterval(() => {
    let nowTs = new Date();
    fs.copyFile(`${eloggerDataDir}/eloggerdata/${filePrefix}point-data.csv`, 
        `${eloggerDataDir}/transfer/${sid}-${parseInt(nowTs/1000)}.csv`,
        (err) => {
            if (err) 
                console.error(err);
            else {
                console.log(`${nowTs.toLocaleString()} Transfer Staged. Monitored Devices: ${devStates.size}. Staged Records: ${stagedRecords}`);
                stagedRecords = 0;
                if (filePrefix === 'A')
                    fs.truncate(`${eloggerDataDir}/eloggerdata/Bpoint-data.csv`, 
                        (err) => {
                            if (err) 
                                console.error(err);
                        });
                else
                    fs.truncate(`${eloggerDataDir}/eloggerdata/Apoint-data.csv`, 
                        (err) => {
                            if (err) 
                                console.error(err);
                    });
                //logTruncate = true;
            }
        }
    );
    // toggle files
    filePrefix = filePrefix === 'A' ? 'B' : 'A';   
}, 300000);    
  
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
            sid = sidMsg;
            glpPrefix += `/${sidMsg}`;
            console.log(`${nowTs.toLocaleString()}- SmartServer SID: ${sidMsg}`);
            // Note how the "+" wild card is used to monitor device status for 
            // any lon device.  Note, once we know the SID, we need to avoid
            // adding multiple listeners.  Subscbribe once and only once              
            if (!subscribtionsActive) { 
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/cfg`);
                client.subscribe (`${glpPrefix}/ev/data`);
                client.unsubscribe (sidTopic);
                subscribtionsActive = true;
            } else {
                console.log(`${nowTs.toLocaleString()} - Redundant SID topic message`);
            }
        } else {
            // We are not provisioned.
            cosole.log(`${nowTs.toLocaleString()} - [${sidMsg}] Problem with SID payload.`);
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
    let setMs = false;
    let nowTs = new Date(); // Seconds TS good enough

    if (stsMsg.state === "deleted") {
        devStates.delete(devHandle);
        nameMap.delete(devHandle);
        console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} deleted [sts].`);
        return false;
    }

    if (stsMsg.state === "provisioned" ) {
        // To track the health of monitored devices the devState map is used to determine if the monitoring has be set
        if (stsMsg.health === "normal") {
            if (!devStates.has(devHandle)) { // First time through, set up monitoring
                devStates.set(devHandle,"normal");
                msToSet.set(devHandle, monSpecIndex);
                setMs = true;
            } else { // Transistion from down or unknown to normal, set monitoring
                if(devStates.get(devHandle) !== "normal") {
                    devStates.set(devHandle, "normal");   
                    msToSet.set(devHandle, monSpecIndex);
                    setMs = true;                    
                }
            } 
            console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is ${stsMsg.health}.`);
        } else {
            if (stsMsg.health === "unknown")
                devStates.delete (devHandle);
            else     
                devStates.set(devHandle, stsMsg.health);
            console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is ${stsMsg.health}.`);
            return false;
        }
        if (rateOverride == -2 || !setMs) {
            if (!setMs)
                console.log(`${nowTs.toLocaleString()} - Monitor Object already set.`);
            return false;
        }
        return true;
    } else {
        devStates.delete(devHandle);  // If not provisioned, drop all consideration
        console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is ${stsMsg.state}`);
    }   
    return false;
}
function handleDeviceCfg (devHandle, cfgMsg) {
    let devPath = cfgMsg.name.split('.')
    if (devPath.length > 0)
        nameMap.set(devHandle,devPath[devPath.length-1]);
    else   
        nameMap.set(devHandle,devHandle);    
}
// IAP/MQ. MQTT message handler. 
client.on('message', (topic, message) => {
    try {
        let devHandle;  
        var nowTs = new Date();  // Seconds TS good enough
        // When net export deletes a device, IAP/MQ sends a [../cfg] topic with no message
        // that is delt with here.  Local catch maps entries are deleted as well
        if (message.length == 0 && topic.endsWith('/cfg')) {
            devHandle = topic.split('/')[6];
            nameMap.delete(devHandle);
            devStates.delete(devHandle);
            console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} deleted [cfg].`);
            return;
        }
        let payload;
        try {
            payload = JSON.parse(message);
        } catch(error) {
            console.log (`Error parsing JSON: ${message}`);
            return;
        }

        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        } 
        if (topic.endsWith ('/sts')) {  
            let monSpecIndex;
            monSpecIndex = qualifiedDevice(payload);
            if (monSpecIndex == -1)
                return;
            devHandle = topic.split('/')[6];
            if (handleDeviceSts (devHandle, payload, monSpecIndex)) {
                // Setting the monitor object is a intensive operation that is being throttled
                // here to reduce conjestion on the message bus.
                if (msToSet.size == 1) {
                    let msPaceInt = setInterval (() => {
                        let dpTopic;
                        let nowTs = new Date();
                        let firstKey = msToSet.keys().next().value;
                        let firstValue = msToSet.values().next().value;
                        dpTopic = `${glpPrefix}/rq/dev/lon/${firstKey}/if/${monitorSpecs[firstValue].ptPath}`;
                        client.publish (
                            dpTopic, 
                            JSON.stringify(monitorSpecs[monSpecIndex].ms), 
                            {qos:1}, 
                            (err) => {
                                if (err != null)
                                    console.error(`${nowTs.toLocaleString()} - Failed to update Monitoring`);
                            }     
                        );
                        console.log (`${nowTs.toLocaleString()} - MonitorSet update: ${dpTopic}`);
                        msToSet.delete(firstKey);
                        // If the polulation has be touched, shut this down
                        if (msToSet.size == 0)
                            clearInterval(msPaceInt);
                    }, monitorSetRequestDelay);
                }
            };   
        }   
        if (topic.endsWith('/cfg')) {
            devHandle = topic.split('/')[6];
            handleDeviceCfg(devHandle, payload);
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
                dpState = devStates.get(devHandle) === 'normal' ? 'ONLINE' : 'OFFLINE';
                pointPath = `${nameMap.get(devHandle)}/${payload.message.split('/')[0]}`
                // Use the Timestamp from the inside data event  MQTT client process the message
                // This timestamp is in UTC. The back end should convert to the site's local timezone
                logRecord = `${payload.ts},\"${pointPath}\",\"${dpState}"\,\"`; 
                // The application has knowledge of the payload data to only log the relavent values.  The SNVT_trans_table values are using
                // 3 or 4 floats depending on the network variable.  If a data event 
                if (payload.message === 'nvoP/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]} ${payload.data.point[3]}\"`;
                else if (payload.message === 'nvoP_2/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]} ${payload.data.point[3]}\"`;
                else if  (payload.message === 'nvoI/value')
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]}\"`;       
                else if  (payload.message === 'nvoI_2/value')
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]}\"`;        
                else if  (payload.message === 'nvoU_F/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]}\"`;           
                else if  (payload.message === 'nvoU_F_2/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]}\"`;          
                else if  (payload.message === 'nvoPF/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]} ${payload.data.point[3]}\"`;
                else if  (payload.message === 'nvoPF_2/value') 
                    logRecord += `${payload.data.point[0]} ${payload.data.point[1]} ${payload.data.point[2]} ${payload.data.point[3]}\"`;
                else if  (payload.message === 'nvoEPpos/value')
                    logRecord += `${payload.data}\"`; 
                else if  (payload.message === 'nvoEPapos/value')
                    logRecord += `${payload.data}\"`; 
                else if (payload.message === 'nvoCounterData/value')    
                    logRecord += `${payload.data.counter[0]} ${payload.data.counter[1]} ${payload.data.counter[2]} ${payload.data.counter[3]} ${payload.data.faultCounter}\"`;
                else // The application could be designed to ONLY filter on the 5 key network variables, and might abort loging the data at this point
                    logRecord += `${JSON.stringify(payload.data)}\"`;
                
                fs.writeFile(`${eloggerDataDir}/eloggerdata/${filePrefix}point-data.csv`, `${logRecord}\r\n`, logTruncate ? {flag: 'w'} :
                    {flag:'a+'}, (err) => {
                        if (err) {
                            console.error(err);
                        return;
                        }
                }); 
                logTruncate = false; 
                ++recordCount;
                ++stagedRecords;
                if (testLimit !== -1 && recordCount >= testLimit) {
                    client.end(true);
                    console.log (`Test completed. ${recordCount} data events captured`);
                    process.exit();
                }
                if (recordCount % 10000 === 0) {
                    console.log(`${nowTs.toLocaleString()} ${recordCount} records logged` );
                    reportDeviceState();
                }                                     

            }
        }      
    } catch(error) {
        console.error("MQTT Message error: " + error);
    }
}   // onMessage handler
);  // onMessage registration
