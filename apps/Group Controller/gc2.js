// gc2.js
//
// Copyright © 2025 EnOcean Edge Inc
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in d
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';
const mqtt = require('mqtt');
const _ = require('lodash');
const { execSync } = require("child_process");
const { log } = require('util');
const { on } = require('events');
const { off } = require('process');

const version = '1.02.006';
const actionTrace = true;
// These lines allow treating Repeating and not repeating LTE starts differently
const REPEATING = false;
const LTE_QUALIFY_TIME = REPEATING ? 300 : 60; // was 8m for repeating

// gc2.js
// This application implements 16 simple group controllers.  
// It provides output control points for OLCs that support SNVT_switch, SNVT_swtich_2, or SNVT_count
// The iSchedule is the primary control point.
// There are serveral important features:
//  1. iSchedule initialization is driven by the Scheduler, and this app restarts the scheduler service to 
//     initialize scheduled values on startup
//  2. oDimVal, oDimSw2val, oLevelCnt are set to monitor:lon.cfg{propagationHeartbeat:300 } by default
//  3. The FB UFPTpwrController will directly update a point based on its iSchedul value.  It will heartbeat the
//     point at a 60s cadence.  When playing an OFF value, the smartServer system mode will be set to Offnet.  At the 
//     transition to ON, it will set the mode to Onnet,
//  3. The service monitors lte restarts, and will exit and restart by smartserverctl.
//
// At startup, gc2.js will restart the the scheduler to force calculation of iSchedule, 
// and initialize the values of oDimVal, and oDimSw2val and to 
// start the propagationHeartbeat.  The service file delays the start of the gc service
// by 10s to allow other elements of the system to settle.


const onApollo = Boolean(process.platform == 'linux');
const ap_version = onApollo ? process.env.APOLLO_VERSION : '0.00.000';
const serviceEnv = parseInt(ap_version.split('.')[0],10);
const deviceMap = new Map();
let args = process.argv.slice(2);

// Override this with an argument at launch
let defaultHeartbeat = REPEATING ? 600 : 300; 
let startup = true;
let hbSet = true;  // use true to prevent setting output HB every startup
let selfCreated = false;

const sentinelHandles = [2,3,7];
const startTs = new Date();
let currentLevel = [
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs},    
    {val:{value:0,state:255},ts: startTs},
    {val:{value:0,state:255},ts: startTs}
];

const lepAboutTopic = 'lep/0/lon/0/response/about';
// DevNote: Hardcoded address for target to change
let mqttBroker =  (onApollo) ? 'mqtt://127.0.0.1:1883' : 'mqtt://192.168.10.201';
// SBS health monitoring 

let myAppIf = {
        appPID : '90000106000485A9',    
        fbName : 'gc',            
        devHandle : 'GC-1', 
        ready:false,      
        exists:false        
};    
// Pwr controller cfg and state
const segPwrCfg = {
    dpPath:'',
    OnLevel: null,
    OffLevel: null,
    state: null,
    pwrOn: null,
    iSchedule: null,
    levelNow: null,
    heartbeat: 60*1000,
    lastUpdate: 0
};

function logPrefix (fullDate) {
    let tsNow = new Date();
    if(!onApollo || serviceEnv < 4) {
        return `[${fullDate ? tsNow.toLocaleString():tsNow.toLocaleTimeString()}] -`
    } else
        return ` `;
}

function cmdBanner (){
    console.log(`\ngc.js - version: ${version}`); 
    console.log(`${logPrefix(true)} - Startup.`)   
};
cmdBanner();
if (args.length == 1) {
    defaultHeartbeat = parseInt(args[0],10);
    hbSet = false;
    console.log(`defaultHeartbeat override: ${defaultHeartbeat}`);
} 
console.log(`Using ${defaultHeartbeat}s group heartbeat`);


// confirm the CMS is accessible.  This is to deal with the ARN problem.
let retryCount = 0;
if (onApollo) {
    let psRes = execSync('ps -aux',{encoding:'utf8'});
    const arnActiveRe = /\/sbin\/apollo-reset\s+normal/g;
    while (psRes.match(arnActiveRe) ) {
        if (retryCount++ == 0) 
             console.log(`${logPrefix(false)} Apollo-reset normal in progress.`);
        execSync('sleep 30');
        psRes = execSync('ps -aux',{encoding:'utf8'}); 
    }
}

// Allow allow breathing
if (retryCount > 8) {
    console.log('Exiting gc.js because ARN was detected');
    process.exit(1);
}
// Uptime > 1 minute expected.
let upTime;
let lteUpTime;
let lteStartDelayTmo = 0;
if (onApollo) {
    const isActive4 = /\sACTIVE/g;
    const isActive4plus = /\sactive/g;

    const timeLongRe = serviceEnv >= 4 ? /[0-9]+\s[y|m|w|d]/g : /[0-9]+:[0-9]+:[0-9]+/g;   // xx years|months|weeks|days
    const timeParseRe = serviceEnv >= 4 ?  /[0-9]+[h|m|s]/g : / [0-9]+:[0-9]+:[0-9]+/g;     // Looking for under a day of Match to parse human readable time strings
    upTime = parseInt(execSync('cat /proc/uptime', {encoding:'utf-8'}).split(' '),10);
    let lteStatus;
    if(serviceEnv < 4)
        lteStatus = execSync('sudo supervisorctl status lon:echlte', {encoding:'utf-8'});//.match(runTimeRe)[0].split(';')[1];
    else
        lteStatus = execSync('sudo smartserverctl status lte', {encoding:'utf-8'});//.match(runTimeRe)[0].split(';')[1];
    console.log(`${lteStatus}`);
    if (lteStatus.match(isActive4) == null && lteStatus.match(isActive4plus) == null) {
        console.log(`lte not active. Restarting gc service.`)
        process.exit(1);
    }
    // Must deal with 2 formatted time strings:
    //lte                  active since Fri 2023-10-13 23:49:19 PDT; 2 weeks 0 days ago
    //lte                  active     2 days 1h 2m 10s ago
    let parsedUpTimeL = lteStatus.match(timeLongRe); 
    let activeS = 1;
    let parsedUpTime = lteStatus.match(timeParseRe); // lte up for 1ms 24h
    if (serviceEnv >= 4) {

        const exDateRe = /d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
        const startUpLte = lteStatus.match(exDateRe);
        if (startUpLte !== null) {
            const now = new Date();
            const offsetMinutes = now.getTimezoneOffset();
            const sign = offsetMinutes > 0 ? '-' : '+';
            const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2,'0');
            const minutes = String(Math.floor(Math.abs(offsetMinutes) % 60)).padStart(2,'0'); 
            const startDateObj = new Date (startUpLte);
            startDateObj += `${sign}${hours}:${minutes}`;
            console.log (`lte Started: ${startDateObj.toLocaleString()}`);

            activeS = Math.floor((now - startDateObj)/1000);
        } else {
            const dayRe = /(\d) day/;
            const hourRe = /(\d+)h/;
            const minRe = /(\d+)min/
            const resMin = lteStatus.match(minRe);
            if (resMin !== null) 
                activeS = resMin[1] * 60;
            const resHr = lteStatus.match(hourRe);
            if (resHr !== null)
                activeS += resHr[1] * 60 * 60;
            const dayRes = lteStatus.match(dayRe);
            if (dayRes !== null)
                activeS += dayRes[1] * 24 * 60 * 60;
        }     
    } else {
        if (parsedUpTime != null) {
            console.log(`LTE Uptime: ${parsedUpTime}`);
            let timeSplit = parsedUpTime.toString().split(':');
            activeS = parseInt(timeSplit[0],10)*60*60 + parseInt(timeSplit[1],10)*60 + parseInt(timeSplit[2],10);
        }
    }

    lteUpTime = activeS;  //seconds
    console.log (`lte Active for at least: ${lteUpTime}s`);
    lteStartDelayTmo = (lteUpTime < LTE_QUALIFY_TIME) ? LTE_QUALIFY_TIME - lteUpTime : 0;
    //console.log(`Uptime res: ${uptimeRes}`);
    //upTime = parseInt(uptimeRes[0],10);  // uptime output: up [n] [secondS|minutes|days]
    console.log(`System uptime: ${upTime}s`);
    if (lteStartDelayTmo) {
        console.log(`Allow ${lteStartDelayTmo}s for lte to initialize`);
        execSync(`sleep ${lteStartDelayTmo}`);
    }
    // 4.00 syslog kicker
    //if (serviceEnv >= 4) 
    //    execSync('sudo systemctl restart syslog-ng');
}

let glpPrefix='glp/0';  // this will include the sid once determined
// TODO: change the target IP for debugging
const client = mqtt.connect(mqttBroker);
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
function setHeartbeats() {
    let pointTopicBase = `${glpPrefix}/rq/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/`;
    let hbSetMsg = {propagationHeartbeat:defaultHeartbeat};
    console.log(`${logPrefix(false)} setting group output heartbeat to ${defaultHeartbeat}`)
    for (let i=0; i < 16; i++) {
        client.publish (
            pointTopicBase + `${i}/oDimVal/monitor/lon.cfg`,
            JSON.stringify(hbSetMsg)
        );
        client.publish (
            pointTopicBase + `${i}/oDimSw2val/monitor/lon.cfg`,
            JSON.stringify(hbSetMsg)
        );
        client.publish (
            pointTopicBase + `${i}/oLevelCnt/monitor/lon.cfg`,
            JSON.stringify(hbSetMsg)
        );
       
    }
}

function createGcDevice () {
    let tsNow = new Date();
    let thisHandle = myAppIf.devHandle;
    let thisPID = myAppIf.appPID;

    if(myAppIf.exists)
        return;
    console.log(`${logPrefix(false)} Creating: ${thisHandle} based on PID: ${thisPID}`);
    let createMyAppMsg = {
        action: 'create',
        args: {
            unid: 'auto',
            type: thisPID,
            'lon.attach': 'local',
            provision : true
            }
        } // CreateMyAppMsg {}
    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisHandle}/do`,
        JSON.stringify(createMyAppMsg)
    );
    let setCfg = {
        name: thisHandle,
        desc: 'Internal device Group Controller'
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisHandle}/cfg`,
        JSON.stringify(setCfg)
    );
    // configure nv persistence
    // for (let i=0; i<16; i++) {
        // client.publish (
            // `${glpPrefix}/rq/dev/lon/${thisHandle}/if/${myAppIf.fbName}/${i}/iSchedule/lon.cfg/persistent`,
            // JSON.stringify(true)
        // )
    // }
    hbSet = false;
    selfCreated = true;
}

// If Internal devices required are not present, this function will fire
let myDevCreateTmo; 
// lte/dci startup coordination requires 7-8 minutes to be sure lte is in a good place
let systemStartTmo = setTimeout (()=> {
    myDevCreateTmo = setTimeout (createGcDevice,10000);
    //client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`); 
},lteStartDelayTmo  * 1000 + 1000);

let delayLteAccess = false;
if (lteStartDelayTmo) {
    console.log(`LTE needs: ${lteStartDelayTmo}s to startup.`)
    delayLteAccess = true;
    setTimeout(()=> {
        if(myAppIf.ready) {
            console.log(`${logPrefix(false)} Get iSchedule values`);
            client.subscribe(getRespTopic);
            setTimeout (getiSchedule,2000);
            startup = false;
        } else {
            console.log (`${logPrefix(false)} - Gc device not ready.`);
        }
    }, lteStartDelayTmo  * 1000 + 1500);
}
function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`SID: ${sidMsg} : ${glpPrefix}`);
            //myAppIf.exists = true; //DEBUG
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`); 
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/cfg`);
            client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/if/pwr/0`);
            client.subscribe (`${glpPrefix}/rq/con/+/do`);
            client.subscribe (`${glpPrefix}/ev/updated/dev/lon/900010500C08500`); // Mode change events
            client.subscribe (lepAboutTopic);
            client.unsubscribe (sidTopic);
        } else {
            console.log(`Redundant SID topic message`);
        }
    } 
};

const getRespTopic = 'myGetResp';
function getiSchedule() {
    execSync('sudo smartserverctl restart scheduler',{encoding:'utf8'});
}

function updateDp (devHndl, fb, index, dp, value) {
    client.publish (
        `${glpPrefix}/rq/dev/lon/${devHndl}/if/${fb}/${index}/${dp}/value`,
        JSON.stringify(value),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error (`Failed to update: ${outputPnt} : ${err}`);
        }
    );
    if (actionTrace && dp === 'oDimVal') {
        let tsNow = new Date();
        console.log(`${logPrefix(false)} GC[${index}].${dp}.value: ${JSON.stringify(value)}`);
    }
}

// Calls are spaced out at 10s when starting up the system
function setGroupLevel(index) {
    let sw2 = {state:'SW_SET_LEVEL',
        setting:{value:currentLevel[index].val.value},
        scene_number:1
    }
    updateDp (myAppIf.devHandle,myAppIf.fbName,index,'oDimVal',currentLevel[index].val);
    updateDp (myAppIf.devHandle,myAppIf.fbName,index,'oDimSw2val',sw2);
    updateDp (myAppIf.devHandle,myAppIf.fbName,index,'oLevelCnt',currentLevel[index].val);
}

function setMode(mode) {
    const topicMode = `${glpPrefix}/rq/dev/lon/lon.sys/if/system/0/mode`;
    const thisMode = {value:mode};
    client.publish (
        topicMode,
        JSON.stringify(thisMode),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error (`Failed to set mode: ${err}`);
        }
    );
}

const gcDevRe = new RegExp (`fb\/dev\/lon\/${myAppIf.devHandle}\/sts`);
const gcUpdateRe = new RegExp (`ev\/updated\/dev\/lon\/type\/${myAppIf.appPID}`);
const lonSysUpdateRe = new RegExp (`ev\/updated\/dev\/lon\/type\/9000010500C08500`);
const conReqRe = new RegExp (`rq\/con\/.+\/do`);
const devCfgRe = new RegExp (`fb\/dev\/lon\/(.+)\/cfg`);
const pwrIfRe = new RegExp (`fb\/dev\/lon\/${myAppIf.devHandle}\/if\/pwr\/0`);
// capture group 1 is the device handle, group 2 is the health
const dataEventRe = new RegExp ('topic":.+\/lon\/(.+)\/if.+"health":"(.+)'); 

let updateDelayTmo;
let failedGetCount = 0;
let lastUpdate = {};
let evDataTopic = '';
let updateDebounce;

function sendPwrPoint () {
    client.publish (
        `${glpPrefix}/rq/dev/${segPwrCfg.dpPath}/value`,
        JSON.stringify(segPwrCfg.levelNow),
        {qos:1},
        (err) => {
            if(err != null)
                console.error(`Failed to update ${segPwrCfg.dpPath}: ${err}`);
         }
    );    
};

let hbTimer;
function pwrSegmentControl () {
    if (segPwrCfg.dpPath == '')
        return;
    let lastLevel = segPwrCfg.levelNow;
    console.log(`LastLevel: ${lastLevel}, State: ${segPwrCfg.state}`);
    switch (segPwrCfg.state) {
        case 'AUTO':
            if (segPwrCfg.iSchedule == null)
                return;
            console.log(`AUTO: ${segPwrCfg.iSchedule}`);
            segPwrCfg.levelNow = segPwrCfg.iSchedule;
            break;
        case 'HAND':
            console.log(`HAND: ${segPwrCfg.OnLevel}`);
            segPwrCfg.levelNow = segPwrCfg.OnLevel;
            break;
        case 'OFF':
            console.log(`OFF: ${segPwrCfg.OffLevel}`);
            segPwrCfg.levelNow = segPwrCfg.OffLevel;
            break;      
        default:
            console.log ('State fall through');
            return;    
    };
    // Handle transition to segment power OFF.  Note that update event
    if (lastLevel != segPwrCfg.levelNow && segPwrCfg.levelNow == segPwrCfg.OffLevel) {
        console.log(`Segment Power transition to: ${segPwrCfg.levelNow}. Control: ${segPwrCfg.state}`);
        //setMode("Offnet");
    }
    // Handle transition to segment power ON
    if (lastLevel != segPwrCfg.levelNow && segPwrCfg.levelNow == segPwrCfg.OnLevel) {
        console.log(`Segment Power transition to: ${segPwrCfg.levelNow}. Control: ${segPwrCfg.state}`);
        //setMode("Onnet");
    }
    // Don't update control point if the path is not set
    if (segPwrCfg.dpPath !== '') {
        sendPwrPoint();
        clearInterval(hbTimer);
        hbTimer = setInterval(sendPwrPoint, segPwrCfg.heartbeat);
    }
    updateDp ('GC-1','pwr',0,'oLevelFb',segPwrCfg.levelNow);
}

client.on(
    'message', 
    (topic, message) => {
    try {
        //console.log(`topic: ${topic} msg: ${message}`);
        if (message == '')
            return;
        const payload = JSON.parse(message);
        let tsNow = new Date();
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        if (topic.match (gcDevRe)) {
            let provisioned = 'unknown';
            let state = 'unknown';
            let thisDeviceHandle = topic.split('/')[6];
            provisioned = payload.state;
            state = payload.health;
            console.log (`${logPrefix(true)} ${thisDeviceHandle} - State: ${provisioned} - Health: ${state} `); 
            if (provisioned != 'deleted') {      
                myAppIf.exists = true;         
                //console.log (`${logPrefix(true)} ${thisDeviceHandle} - State: ${provisioned} - Health: ${state} `); 
                clearTimeout(myDevCreateTmo);
                if (provisioned != 'provisioned')
                    return;
                client.subscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/if/pwr`);
                client.subscribe(`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.appPID}`);
                if (!hbSet && state == 'normal') {
                    setHeartbeats();
                    hbSet = true;
                    client.subscribe(getRespTopic);
                    setTimeout (getiSchedule,16000);
                    startup = false;
                } 
                if (state == 'normal' && startup ) {
                    if(!delayLteAccess) {
                        console.log(`${logPrefix(false)} Get iSchedule values`);
                        client.subscribe(getRespTopic);
                        setTimeout (getiSchedule,2000);
                        startup = false;
                    } else {
                        myAppIf.ready = true;
                    }
                }
            } 
            return; 
        } 
        // Build a map for the edge LCs
        let cfg = topic.match(devCfgRe);
        if (cfg != null) {
            let devObj = {name: payload.name, health: "UNKNOWN", ts: tsNow}; 
            if (payload.name != '' && payload.name !== myAppIf.devHandle) {   
                deviceMap.set(cfg[1].toString(), devObj);
                console.log(`Monitoring: ${payload.name}`)
                if (evDataTopic == '') {
                    evDataTopic = `${glpPrefix}/ev/data`;
                    client.subscribe(evDataTopic); // dpp of at least on dp on each edge device set to publish every poll. 
                }
            }
        }
        // lepAboutTopic fires when lte restarts.  Adding resources can restart LTE. Some restarts are to be
        // expected.  But if one should occur while dp updates or binding requests are in flight, these operations
        // can be lost.  Lighting management software should monitor oRestarts while management operations are processed.
        if (topic == lepAboutTopic) {
            console.log(`${logPrefix(false)}*** LTE restarted. Exiting gc service to be restarted by systemctl`);
            process.exit(1);
        }
        // Power Controller FB handler
        if (topic.match(pwrIfRe)) {
            //console.log(`topic: ${topic} msg: ${message}`);
            segPwrCfg.state = payload.cpHOA.value;
            segPwrCfg.OffLevel = payload.cpOffLevel.value;
            segPwrCfg.OnLevel = payload.cpOnLevel.value;
            segPwrCfg.dpPath = payload.cpPointPath.value.pathStr;
            console.log(`pwrControl state: ${segPwrCfg.state} Off: ${segPwrCfg.OffLevel} On: ${segPwrCfg.OnLevel}`);
            console.log(`   Control Point: ${segPwrCfg.dpPath}`);
            if (segPwrCfg.dpPath == '') 
                console.log(`***Segment pwr controller has no target***`)
            pwrSegmentControl();
            // Initialize, now follow the update requests
            //client.unsubscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/if/pwr/0`);
        }
        if (topic.match(evDataTopic)){
            const thisTopic = payload.topic;
            if (thisTopic == null)
                return;
            const thisDeviceHandle = thisTopic.split('/')[6].toString();
            let deviceSt = deviceMap.get(thisDeviceHandle);
            //console.log(`Device: ${thisDeviceHandle} ev/data: ${message}`);
            // Report health changes for monitored edge devices.
            if (deviceSt != null) {
                if(deviceSt.health != payload.health) {
                    console.log(`${deviceSt.name} health was: ${deviceSt.health} is: ${payload.health} ${tsNow.toLocaleString()}`);
                    deviceSt.health = payload.health;
                    deviceSt.ts = tsNow;
                    deviceMap.set(thisDeviceHandle,deviceSt);
                }
            }
        }

        //console.log (`Topic: ${topic}`);
        // This receives the initial reads of iiSchedule. Not used in 1.01.009 an newer where lon persistence was dropped
        if (topic == getRespTopic) {
            if (payload.result == null)
                return;
            for (let i = 0; i < payload.result.length; i++) {
                if (payload.result[i].error != null) {
                    ++failedGetCount;
                    if (failedGetCount > 5) {
                        console.log (`${logPrefix(false)}GC-1: ${payload.result[i].error} restarting lte`);
                        if (serviceEnv >= 4)
                            execSync('sudo smartserverctl restart lte',{encoding:'utf8'});
                        else 
                            execSync('sudo supervisorctl restart lon:echlte',{encoding:'utf8'});
                    } else {
                        setTimeout (getiSchedule,5000); // Try again in 5s
                    }
                    break;
                } else if (payload.result[i].error == null) {
                    currentLevel[i].val.value = payload.result[i].value.value;
                    currentLevel[i].val.state = payload.result[i].value.state;
                    currentLevel[i].ts = tsNow;
                    setTimeout(setGroupLevel,REPEATING == 1 ? 10000*i : 1000*i,i);
                }                
            }
            // Send out updates spaced at 10s
        }
 
        if (topic.match (gcUpdateRe)) {
            let thisFb = payload.block.split('/')[2];
            // Ignoring outputs 
            if (payload.datapoint.match(/o.+/) || payload.value == null)
                return;    
            let dpFingerPrint = payload.handle + payload.block + payload.datapoint + payload.value;
            let dp = {handle:myAppIf.devHandle,fb:myAppIf.fbName,fbIndex:thisFb,dp:'oDimVal',val:payload.value };

            // debounce duplicate updates
            if (_.isEqual(payload.value, currentLevel[thisFb].val) && (tsNow - currentLevel[thisFb].ts < 2000)) {
                console.log('Ignoring duplicate event.')
                return; 
            }
            if (payload.block == 'if/pwr/0') { //Only handle iSchedule updates. CPs handled above
                if (payload.datapoint == 'iSchedule' ) {
                    segPwrCfg.iSchedule = payload.value;
                    if (tsNow - segPwrCfg.lastUpdate > 2000) {
                        segPwrCfg.lastUpdate = tsNow;
                        console.log(`pwrSegment iSchedule: ${payload.value}`);
                        pwrSegmentControl ();
                    }
                }
            } else {  
                //console.log (`Topic: ${topic}, msg: ${payload}`);
                // What comes in goes to the output.  Switch to switch_2 translation
                let sw2 = {state:"SW_SET_LEVEL",setting:{value:payload.value.value},scene_number:1};

                switch (payload.datapoint) {
                    case 'iSchedule':
                        console.log(`iSchedule [${dp.fbIndex}]: ${JSON.stringify(payload.value)} Current: ${JSON.stringify(currentLevel[dp.fbIndex])}`);
                        // A little logic to distinguish the startup setting of iSchedule to start the HB sequence.   
                        if (!_.isEqual(dp.val, currentLevel[dp.fbIndex].val) || (tsNow - currentLevel[thisFb].ts > 2000 )) { // check for startup init
                            updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimVal',dp.val);
                            updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimSw2val',sw2);
                            updateDp (dp.handle,dp.fb,dp.fbIndex,'oLevelCnt',dp.val.value);
                            currentLevel[dp.fbIndex].val = dp.val;
                            currentLevel[dp.fbIndex].ts = tsNow;
                            console.log(`${logPrefix(false)} update from: ${dp.handle}/${dp.fb}/${dp.fbIndex}/${dp.dp}: ${JSON.stringify(dp.val)}`);
                        } 
                    break; 
                    default:
                    break;    
                }
            }

        }
        // Here to log connection changes which are expected to by rare once a system is commissioned 
        if (topic.match (conReqRe)) {
            console.log(`${logPrefix(false)}${topic}: Msg: ${message}`);
        }

    } catch(error) {
        let tsNow = new Date();
        console.error(`${logPrefix(false)} MQTT Message: ${error.stack}`);
    }
}   // onMessage handler
);  // onMessage registrations
