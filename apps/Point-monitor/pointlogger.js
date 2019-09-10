"use strict";
const mqtt = require('mqtt');
const fs = require('fs'); 
const util = require('util');

const appVersion = '1.00.001';
const devStates = new Map();
const nameMap = new Map();

let glpPrefix='glp/0';  // this will include the sid once determined 
let sid='';
let  subscribtionsActive = false;

let  recordCount = 0;
let stagedRecords = 0;
let testLimit = -1;  // -1 means no limit

// Edit monitorSpecs object array according to your requirements to monitor the targets data points of interest
// Review the IAP/MQ documentation on the use of event: true.  This can only be done in DMM managed systems
var monitorSpecs = [
    {
        pid: '9FFFFF0501840460',
        nvList: [
            {ptPath: 'LightSensor/0/nvoLuxLevel', ms:{rate: 20, report: 'any', threshold:0, infeedback:false, event:false}}, 
            {ptPath: 'TempSensor/0/nvoHVACTemp', ms:{rate: 20, report: 'any', threshold:0, infeedback:false, event:false}},
            {ptPath: 'Switch/0/nvoValue', ms:{rate: 20, report: 'any', threshold:0, infeedback:false, event:false}},
        ]
    },
    {
        pid: '9FFFFF0501840450',
        nvList: [
            {ptPath: 'LightSensor/0/nvoLuxLevel', ms:{rate: 20, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'TempSensor/0/nvoHVACTemp', ms:{rate: 20, report: 'any', threshold:0, infeedback:false, event:false}},
            {ptPath: 'Switch/0/nvoValue', ms:{rate: 20, report: 'change', threshold:1, inFeedback:false, event:false}},
        ]
    },
    {
        pid: '90000106000B0401',
        nvList: [
            {ptPath: 'nodeModel/0/nvoCount1', ms:{rate: 15, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'nodeModel/0/nvoCount2', ms:{rate: 15, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'nodeModel/0/nvoCount3', ms:{rate: 15, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'nodeModel/0/nvoCount4', ms:{rate: 15, report: 'change', threshold:1, inFeedback:false, event:false}}, 
            {ptPath: 'nodeModel/0/nvoCounterData', ms:{rate: 15, report: 'threshold-any', 
                threshold:{'counter[0]':1,'counter[1]':1,'counter[2]':1,'counter[3]':1,'faultCounter':1}, inFeedback:false, event:false}},
        ]
    },
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
// rateOverride of -1 uses the rate defined in MonitorSpecs Object array, -2 assumes the DLA file was used to define
// the monitor rate.  0 will stop monitoring and the the application will exit
if (args.length === 1)
    rateOverride = parseInt(args[0]);

if (args.length === 2){
    rateOverride = parseInt(args[0]);
    testLimit = parseInt(args[1]);
}
console.log (`Pointlogger version: ${appVersion}`);
console.log (`PointMonitor applicaiton rateOverride: ${rateOverride}`);
if (rateOverride === -2)
    console.log ('An active DLA file must be use to start monitoring');

// Openloop exit after 40s operation, assuming all the targeted monitor points get set to 0
if (rateOverride === 0)
    setTimeout(() => { 
            console.log ('Exitting point monitor application. Monitor rates set to 0.');
            process.exit();
        }, 
        40000
    );
// Determine available FS assets.  Using SD card on SmartServer if available
const eloggerDataDir = process.env.hasOwnProperty('APOLLO_DATA') ? '/media/sdcard' : '.';
// Integration TODO:
// 1. On Apollo target: sudo mkdir /media/sdcard/eloggerdata
// 2. sudo mkdir /media/sdcard/transfer
// 3. sudo chown apollo:apollo /media/sdcard/eloggerdata
// 4. sudo chown apollo:apollo /media/sdcar/transfer

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
    nowTs = new Date();
    fs.copyFile(`${eloggerDataDir}/eloggerdata/point-data.csv`, 
        `${eloggerDataDir}/transfer/${sid}-${parseInt(nowTs/1000)}.csv`,
        (err) => {
            if (err) 
                console.error(err);
            else {
                console.log(`${nowTs.toLocaleString()} Transfer Staged. Monitored Devices: ${devStates.size}. Staged Records: ${stagedRecords}`);
                stagedRecords = 0;
                logTruncate = true;
            }
        }
    );    
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
            console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is Up.`);
        } else { 
            devStates.set(devHandle, stsMsg.health);
            console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].nodeId}) is ${stsMsg.health}.`);
            return;
        }
        if (rateOverride == -2)
            return;
        // Setup monitoring if 
        monitorSpecs[monSpecIndex].nvList.forEach(function(dp) {
            // setMonitorRate is true at the health transitions and at startup.  
            if (setMonitorParams) {             
                monitorObj = dp.ms;
                if (rateOverride >= 0)
                    monitorObj.rate = rateOverride;
                dpTopic = `${glpPrefix}/rq/dev/lon/${devHandle}/if/${dp.ptPath}/monitor`;
                console.log (`${nowTs.toLocaleString()} - Set Monitor: ${dpTopic}, Interval: ${monitorObj.rate}`);
                client.publish (
                    dpTopic, 
                    JSON.stringify(monitorObj), 
                    {qos:2,retain: false}, 
                    (err) => {
                        if (err != null)
                            console.error(`${nowTs.toLocaleString()} - Failed to update Nv`);
                    }     
                );
            }                   
        });
        return;
    } else {
        devStates.delete(devHandle);  // If not provisioned, drop all consideration
        console.log(`${nowTs.toLocaleString()} - Device: ${devHandle} (S/N: ${stsMsg.addr.domain[0].subnet}/${stsMsg.addr.domain[0].node}) is ${stsMsg.state}`);
    }   
    return;
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
        const payload = JSON.parse(message);
        let devHandle;  
        var nowTs = new Date(); // Seconds TS good enough
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
            handleDeviceSts (devHandle, payload, monSpecIndex);    
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
                /*dpState = devStates.get(devHandle) == 'normal' ? 'ONLINE' : 'OFFLINE';
                pointPath = `${payload.topic.split('/')[7]}/${payload.topic.split('/')[8]}/${payload.topic.split('/')[9]}/${payload.message.split('/')[0]}`;
                logRecord = `${nowTs.toLocaleString()};\"${devHandle}/${pointPath}\";\"${dpState}\";\"${JSON.stringify(payload.data)}\"`; 
                console.log(logRecord);*/
                dpState = devStates.get(devHandle) === 'normal' ? 'ONLINE' : 'OFFLINE';
                //pointPath = `${payload.topic.split('/')[7]}/${payload.topic.split('/')[8]}/${payload.topic.split('/')[9]}/${payload.message.split('/')[0]}`
                pointPath = `${nameMap.get(devHandle)}/${payload.message.split('/')[0]}`
                logRecord = `${nowTs.toLocaleString()};\"${pointPath}\";\"${dpState}"\;\"`; 
                // The application has knowledge of the payload data to only log the relavent values.  The SNVT_trans_table values are useing
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
                
                fs.writeFile(`${eloggerDataDir}/eloggerdata/point-data.csv`, `${logRecord}\r\n`, logTruncate ? {flag: 'w'} :
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
