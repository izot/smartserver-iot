// dcxMngr.js
//
// Copyright © 2022 EnOcean Edge Inc
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
const { execSync } = require("child_process");

const version = '1.01.004';
// dcxMngr.js
// This application implements scheduled control of DCI device connectivity
// functions to support PL repeating networks that control power to streetlight
// segments.  It prevents the DCI from marking down devices that are switched off
// to reduce startup time when power is applied.  It manages the maintenance mode
// as well to prevent polling devices that will not respond.  There are sequencing
// delays to manage operation of the DCI relative to application layer functions.
//  
// It also supervises the uptime of the lte service to inform application layer
// operations of unexpected restarts of the stack that could result in lost messages.
//
// In addition, this application integrates the ADAM-6266 DIO module with directy MQTT access.  It will 
// use the first input of of the 6266 module for a localOvrd input (di1), and drive the relay (do1) to
// controll segment power.  
// 06/13/2033: 1.00.004 - Improved startup checks to prevent operating on uninitialized input.  Modified
//   Console messages to include full dates in some output to provide better reference points for events.
//

let onApollo = Boolean(process.platform == 'linux');
let args = process.argv.slice(1);
let ap_version = onApollo ? process.env.APOLLO_VERSION : '0.00.000';
let serviceEnv = parseInt(ap_version.split('.')[0],10);
let delayStart = 1;
let startupPause = 120;

let inputSetComplete=false;
let fixPlRepeating=true;
const onScript = '/var/apollo/data/apps/dcxMngr/dcxOn.sh';
const onStaticScript = '/var/apollo/data/apps/dcxMngr/dcxOnStatic.sh';
const offScript = '/var/apollo/data/apps/dcxMngr/dcxOff.sh';
const upScript = '/var/apollo/data/apps/dcxMngr/dcxUp.sh';

const States = Object.freeze({OFF: 'OFF', ON: 'ON',  DCI_ENABLE: 'DCI_ENABLE', SET_ONNET:'SET_ONNET', SET_MAINT:'SET_MAINT', DCI_DISABLE:'DCI_DISABLE', INIT:'INIT' });
const Events = Object.freeze({BYPASS_OFF: 0, BYPASS_ON:1, SCHED_ON:2, SCHED_OFF:3, DCI_CMD_TMO:4, MODE_TMO:5, GRP_MSG_TMO:6, NO_EVENT: 7 });
// These are the values the lep uses.  $
const PL_Modes = Object.freeze({OFF:'repeatingDisabled', OPTIMIZED:'optimizedProxyChain',STATIC:'staticProxyChain'});
let controlState = States.INIT;
// DevNote: Hardcoded address for target to change
let mqttBroker =  (onApollo) ? 'mqtt://127.0.0.1:1883' : 'mqtt://192.168.10.201';
let repeatingActive = PL_Modes.OPTIMIZED;
let myAppIf = {
        appPID : '9000010600008502',    
        fbName : 'DcxManager',            
        devHandle : 'dcx-1',
        iLocalOvrd: null,
        iSched    : null, 
        oGroupSw: {value:0, state:0},
        oSegmentSw: null,
        oRestarts: null, 
        bypassState : null, 
        defLevel : null,
        groupDelay: null,
        offSequence: null,
        scheduled : false,
        isActive : false,
        dciOn : null         
};    

let downDevices = new Set();
let deviceMap = new Map();
const dioRelay='do1';
const dioCtlOn = {'v':true};
const dioCtlOff = {'v':false};
const swOff = {value:0,state:0};
const swOn = {value:100,state:1};
const lepAboutTopic = 'lep/0/lon/0/response/about';
let lepInterfaceTopic ='';
let lonSysTopic = '';
let dciScriptTmo;
let modeTmo;
let cmdTmo; 
let initializeSet = new Set();

const dciCmdDelay = 2000;
const modeDelay =  5000;
const cmdDelay = 10000;
const uptimeInterval = 60000;
const downCheckInterval = 300000;

function logPrefix (fullDate) {
    let tsNow = new Date();
    if(!onApollo || serviceEnv < 4) {
        return `[${fullDate ? tsNow.toLocaleString():tsNow.toLocaleTimeString()}] -`
    } else
        return ` `;
}

function cmdBanner (){
    console.log(`dcxMngr.js - version: ${version} Apollo Version: ${ap_version}`); 
    
};
cmdBanner();
if (args.length > 1) {
    delayStart = parseInt(args[1],10);    
    //console.log (`Delay active: ${onApollo && delayStart} arg[0]: ${args[0]}`);  
    if (args.length == 3) 
        if (args[2].toLocaleLowerCase() == 'static')
            repeatingActive = PL_Modes.STATIC;

}
console.log(`onApollo: ${onApollo} - Delay Start: ${delayStart} - Start Delay ${startupPause} - Repeating: ${repeatingActive} `);
 
if (onApollo && delayStart) {
    console.log(`Allowing SIOT processes to initialize.  Sleep for: ${(startupPause ).toString()}s`);
    // Only in linux
    execSync("sleep " +  (startupPause).toString());  
    
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
// LTE Runtime counter.  This runtime is relative to this process startup or since
// the last LTE restart observed by this service.
console.log(`Report LTE uptime every: ${uptimeInterval}ms`);
let uptimeLTE = 0;
setInterval(()=>{
    uptimeLTE += 60;
    updateDp(myAppIf.devHandle, myAppIf.fbName, 0,'oUpTime',uptimeLTE);
},uptimeInterval);

function createInternalDevice () {
    let tsNow = new Date();
    let thisHndl = myAppIf.devHandle;
    let thisPID = myAppIf.appPID;

    console.log(`${logPrefix(false)}Creating: ${thisHndl} based on PID: ${thisPID}`);
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
        `${glpPrefix}/rq/dev/lon/${thisHndl}/do`,
        JSON.stringify(createMyAppMsg)
    );
    let setCfg = {
        name: thisHndl,
        desc: 'DCX cooridinator'
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisHndl}/cfg`,
        JSON.stringify(setCfg)
    );
    client.publish (
        `${glpPrefix}/rq/dev/lon/${thisHndl}/if/${myAppIf.fbName}/0/iLocalOvrd/lon.cfg/persistent`,
        JSON.stringify(true)
    );
    // Assert localOvrd ON at first start to prevent locking out the DCI from doing
    // its job.  In systems with a PL device managing power to the lighting segment, this
    // is very important.  The PL IO device needs to be provissioned before it can operate.
    client.publish (
        `${glpPrefix}/rq/dev/lon/${thisHndl}/if/${myAppIf.fbName}/0/iLocalOvrd/value`,
        JSON.stringify(swOn)
    );

}

function setDciEnable(enable) {
    if (repeatingActive == PL_Modes.OFF) {
        console.log('PL repeating is OFF.  DCI control is not possible');
        return;
    }
    myAppIf.dciOn = enable;
    if (onApollo) {
        if (enable) {
            if (repeatingActive == PL_Modes.OPTIMIZED)
                execSync(onScript);
            else
                execSync(onStaticScript);      
        } else 
            execSync(offScript);

        //console.log(`DCI Enabled: ${enable}`);     
    } else {
        console.log(`DCI state emulated: ${enable}`);
    }
}
function setAllUp() {
    if (repeatingActive == PL_Modes.OFF) {
        console.log('PL repeating is OFF.  DCI control is not possible');
        return;
    }
    if (onApollo) {
        execSync(upScript);   
    } else {
        console.log(`DCI UP sim`);
    }    
}

// If Internal devices required are not present, this function will fire
let myDevCreateTmo = setTimeout (createInternalDevice,10000); 
// Note: iLocalOvrd, iSched, and the Adam-6266 di1 have this behavior.
//  1. di1 == true higher priority than iLocalOvrd.state == 0, iSched.state == 0
//  2. iLocalOvrd.state == 1, higher priority that di1 == false, and iSched.state == 0 
//  3. iSched.state == 1, higher priority that di1 == false, and iLocalOvrd.state == 0
function dciEnable () {
    if (!inputSetComplete) {
        return false;
    }
    
    if (inputState.di1 == true) { 
        myAppIf.scheduled = false;
        return true;
    }
    if ((inputState.di1 == false) && (myAppIf.iLocalOvrd.state == 1) ||(myAppIf.iSched.state == 1) ) {
        myAppIf.scheduled = (myAppIf.iLocalOvrd.state == 1) ? false : true;
        return true;
    }
    myAppIf.scheduled = false;
    return false;    
}
function segmentPower (isOn) {
    if((isOn == true) ) {
        updateDp(myAppIf.devHandle,myAppIf.fbName,0,'oSegmentSw',swOn);
        client.publish(`Advantech/${dioMac}/ctl/${dioRelay}`,JSON.stringify(dioCtlOn));
    } else  {
        updateDp(myAppIf.devHandle,myAppIf.fbName,0,'oSegmentSw',swOff);
        client.publish(`Advantech/${dioMac}/ctl/${dioRelay}`,JSON.stringify(dioCtlOff));
    } 
    console.log(`Relay State: ${isOn}`);
}
// This function determine the snvt_switch value to drive downstream group controllers.
// it is possible for this function to return null, which is used to prevent updates
// to oGroupSw.
function calculateGroupLevel () {
    let swValue = {value:100, state:1};
    if (dciEnable()) {
        if (inputState.di1 == true) {
            swValue.value = myAppIf.defLevel;
        }
        if (inputState.di1 == false && (myAppIf.iLocalOvrd.state == 1) ||(myAppIf.iSched.state == 1)) {
            swValue.value = (myAppIf.iLocalOvrd.state == 1) ? myAppIf.defLevel : myAppIf.iSched.value;
        }   
    } else {
        if (myAppIf.offSequence == 'OFF_BY_CMD')
            swValue = swOff;
        if (myAppIf.offSequence == 'OFF_WITH_DEFAULT') 
            swValue.value = myAppIf.defLevel;
        if (myAppIf.offSequence == 'OFF_BY_POWER') {
            console.log('Switching relay without a groupControl message');    
            swValue = null;
        }       
    }
    return swValue;
}

function processStateMachine (event) {
    let tsNow = new Date();
    switch (controlState) {
        case States.INIT:
            if (dciEnable()) { 
                setAllUp();
                segmentPower(true);
                clearTimeout (modeTmo);
                modeTmo = setTimeout (()=> {
                    controlState = States.ON;
                    processStateMachine(Events.DCI_CMD_TMO);
                }, modeDelay);
            } else { // At startup we need to squence to OFF gracefully
                //updateDp(myAppIf.devHandle, myAppIf.fbName, 0, 'oSegmentSw', swOff);
                //updateDp(myAppIf.devHandle, myAppIf.fbName, 0, 'oGroupSw', swOff);
                clearTimeout (cmdTmo);
                cmdTmo = setTimeout(()=> {
                    controlState = States.OFF;
                    processStateMachine(Events.GRP_MSG_TMO);
                },modeDelay);

            }    
            break;
        case States.OFF:
            if (dciEnable()) {
                setAllUp();
                segmentPower(true);
                clearTimeout (modeTmo);
                modeTmo = setTimeout (()=> {
                    controlState = States.ON;
                    processStateMachine(Events.DCI_CMD_TMO);
                }, modeDelay);
            } else {
                console.log(`${logPrefix(false)}Disable DCI functions`);
                setDciEnable(false);
                segmentPower(false);
            }   
            break; 
        case States.SET_ONNET:
            if(dciEnable()) {
                let groupSw = calculateGroupLevel();  
                updateDp (myAppIf.devHandle, myAppIf.fbName,0,'oGroupSw',groupSw);
                clearTimeout(cmdTmo);
                cmdTmo = setTimeout(()=>{
                    controlState = States.ON;
                    processStateMachine(Events.GRP_MSG_TMO)  
                },cmdDelay);
            } else {
                clearTimeout(modeTmo);
                //updateDp('lon.sys','system',0,'mode','Maintenance');
                controlState = States.SET_MAINT;
            }
            break;    
        case States.SET_MAINT:
            if(dciEnable()) {
                clearTimeout(cmdTmo);
                controlState = States.SET_ONNET;
                updateDp('lon.sys','system',0,'mode','Onnet');
            } else {
                //updateDp('lon.sys','system',0,'mode','Maintenance');
                setTimeout(()=> {
                    controlState = States.OFF;
                    processStateMachine(Events.MODE_TMO);
                },modeDelay);
            }
            break;
    
        case States.ON:
            let newSw = calculateGroupLevel();
            if(!dciEnable()) {
                if (newSw != null) {
                    //updateDp('lon.sys','system',0,'mode','Maintenance');
                    updateDp (myAppIf.devHandle, myAppIf.fbName,0,'oGroupSw',newSw);
                    if (myAppIf.dciOn) {
                        setDciEnable(false);
                    } 
                    clearTimeout(dciScriptTmo);
                    clearTimeout(cmdTmo);
                    cmdTmo = setTimeout(()=> {
                        controlState = States.OFF;
                        processStateMachine(Events.GRP_MSG_TMO);
                    },myAppIf.groupDelay);
                } else {  
                    clearTimeout(cmdTmo);  
                    controlState = States.OFF;
                    processStateMachine(Events.NO_EVENT);        
                }
            } else {    
                if (newSw.value !== myAppIf.oGroupSw.value) {
                    updateDp(myAppIf.devHandle, myAppIf.fbName, 0, 'oGroupSw', newSw);
                }
                clearTimeout (dciScriptTmo);
                dciScriptTmo =setTimeout(()=> {   
                        let tsNow = new Date();                 
                        console.log(`${logPrefix(false)}Enable DCI functions`);
                        setDciEnable(true);
                        updateDp('lon.sys','system',0,'mode','Onnet');
                },myAppIf.groupDelay);
            }
            break;                      
    }
    console.log(`${logPrefix(false)}Current State: ${controlState}`);

}
function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`); 
            lonSysTopic = `${glpPrefix}/fb/dev/lon/lon.sys/impl`;
            client.subscribe (lonSysTopic);
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/cfg`);
            client.subscribe (`${glpPrefix}/rq/con/#`);
            client.subscribe (`${glpPrefix}/rq/dev/lon/#/do`);
            client.unsubscribe (sidTopic);

        } else {
            console.log(`Redundant SID topic message`);
        }
    } 
};
function updateDp (devHndl, fb, index, dp, value) {
    if (!myAppIf.isActive || value == null)
        return;
    client.publish (
        `${glpPrefix}/rq/dev/lon/${devHndl}/if/${fb}/${index}/${dp}/value`,
        JSON.stringify(value),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error (`Failed to update: ${outputPnt} : ${err}`);
        }
    );
}

let devStsRe = new RegExp(`fb\/dev\/lon\/${myAppIf.devHandle}\/sts`);
let devCfgRe = new RegExp(`fb\/dev\/lon\/[a-zA-Z0-9]+\/cfg`);
let dciUpdateRe = new RegExp(`ev\/updated\/dev\/lon\/type\/${myAppIf.appPID}`);
let edgeDeviceStsRe = new RegExp('fb\/dev\/lon\/[a-zA-Z0-9]+\/sts');
let conRqRe = new RegExp('rq\/con\/[a-zA-Z0-9]+\/do');
let devProvRe = new RegExp('rq\/dev\/lon\/[a-zA-Z0-9]+\/do');

let updateDelayTmo;
let dioMac='';
let lastUpdate = {};
let inputState = {di1:false,di2:false,di3:false,di4:false};
let outputState = {do1:null,do2:null,do3:null,do4:null};
let dioConnected=false;

function doTest (devHndl) {
    let topic = `${glpPrefix}/rq/dev/lon/${devHndl}/do`;
    let msg = {action:'test'};
    client.publish(topic,JSON.stringify(msg));
}
// Points that need initial values from IAP
initializeSet.add('iLocalOvrd');
initializeSet.add('iSched');
initializeSet.add('cpDefLevel');
initializeSet.add('cpGroupDelay');
initializeSet.add('cpOffSequence');

let downCheckTmr;
let setIterator = downDevices[Symbol.iterator]();

// Round robin device test for provisioned devices that are down.
// Device point polling should normally brind devices back to normal
// This is a backstop measure.
downCheckTmr = setInterval(()=> {
    if (downDevices.size == 0)
        return;
    if (!myAppIf.dciOn) 
        return;   
    let thisDev = setIterator.next().value;
    if (typeof (thisDev) == 'undefined') { 
        setIterator = downDevices[Symbol.iterator]();
        thisDev = setIterator.next().value;
    }
    console.log (`${logPrefix(false)}Backstop testing device handle: ${thisDev.toLocaleString()}`);
    doTest(thisDev.toLocaleString());
}, downCheckInterval);

client.on(
    'message', 
    (topic, message) => {
    try {
        const payload = JSON.parse(message);
        let tsNow = new Date();
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        if (topic == lonSysTopic) {
            if (typeof (payload.meta.link.channel) !== 'undefined') {
                client.unsubscribe(lonSysTopic);
                // TODO: work with fixPlRepeating false and drop the next to lines
                if (fixPlRepeating) {
                    console.log (`Using fixed PL Repeating: ${repeatingActive}`);
                    return;
                }
                // dev handle lon.sys/impl meta.link.channel describes the handle of the interface
                let lonChannel = payload.meta.link.channel.split('/')[2]
                lepInterfaceTopic = `lep/0/lon/0/response/${lonChannel}/meta`;
                console.log(`lep interface: ${lepInterfaceTopic}`);
                client.subscribe(lepInterfaceTopic);
                //TODO: This in not showing up for some reason              
                client.publish(`lep/0/lon/0/request/${lonChannel}`, JSON.stringify({method:'GET'}));
                console.log(`Request PL repeating mode ${lonChannel}`);    
            }
        }
        if (topic == lepInterfaceTopic) {
            repeatingActive = payload.body.meta.link.mode;
            console.log(`${logPrefix(false)}PL repeating Mode from lep: ${repeatingActive}`);
        }
        if (topic.match (devStsRe)) {
            let provisioned = 'unknown';
            let state = 'unknown';
            let thisDevHndl = topic.split('/')[6];
            provisioned = payload.state;

            if (provisioned != 'deleted') {               
                state = payload.health;
                console.log (`\t${thisDevHndl}State: ${provisioned} - Health: ${state} `); 
                myAppIf.isActive = true;
                if (myAppIf.defLevel == null) {
                    client.subscribe(`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.appPID}`);
                    clearTimeout(myDevCreateTmo); 
                    client.subscribe(lepAboutTopic);
                    client.subscribe('myRespQ');

                    client.publish(
                        `${glpPrefix}/=get/dp/request`,
                        JSON.stringify({item:['dev/lon/dcx-1/if/DcxManager/0/iLocalOvrd',
                        'dev/lon/dcx-1/if/DcxManager/0/iSched',
                        //'dev/lon/dcx-1/if/DcxManager/0/oSegmentSw',
                        //'dev/lon/dcx-1/if/DcxManager/0/oGroupSw',
                        'dev/lon/dcx-1/if/DcxManager/0/cpDefLevel',
                        'dev/lon/dcx-1/if/DcxManager/0/cpGroupDelay',
                        'dev/lon/dcx-1/if/DcxManager/0/cpOffSequence',
                        'dev/lon/dcx-1/if/DcxManager/0/oRestarts'
                    ], response:"myRespQ"}));
                    client.subscribe(`${glpPrefix}/fb/dev/lon/+/sts`);
                }

            } 
            if (provisioned !== 'provisioned') {
                myAppIf.isActive = false; 
            }
            return;
        } 
        if (topic.match(devCfgRe)) {
            let thisDevHndl = topic.split('/')[6];
            deviceMap.set(thisDevHndl,payload.name);
        }
        // Background Up check
        if (topic.match(edgeDeviceStsRe)) {
            let provisioned = 'unknown';
            let state = 'unknown';
            let thisDevHndl = topic.split('/')[6];
            provisioned = payload.state;
            if (provisioned == 'provisioned') {
                if (payload.health == 'down' && !downDevices.has(thisDevHndl)) {
                    console.log(`${logPrefix(false)}Device: ${deviceMap.has(thisDevHndl) ? deviceMap.get(thisDevHndl):thisDevHndl} is down.`);
                    downDevices.add(thisDevHndl);
                }
                if (payload.health == 'normal') {
                    downDevices.delete(thisDevHndl);                    
                    console.log(`${logPrefix(false)}Device: ${deviceMap.has(thisDevHndl) ? deviceMap.get(thisDevHndl):thisDevHndl} is normal.`);
                }
            }
        }
        // lepAboutTopic fires when lte restarts.  Adding resources can restart LTE. Some restarts are to be
        // expected.  But if once should occur while dp updates or binding requests are in flight, these operations
        // can be lost.  Lighting managment software should monitor oRestarts while management operations are processed.
        if (topic == lepAboutTopic) {
            console.log(`${logPrefix(false)}***LTE restarted`);
            myAppIf.oRestarts += 1;
            updateDp(myAppIf.devHandle, myAppIf.fbName, 0, 'oRestarts', myAppIf.oRestarts);
        }
        if (topic == 'myRespQ') {
            let pointCount = 0;
            console.log(`${logPrefix(false)}DCX manager startup:`);
            payload.result.forEach((element) => {
                if(element.item.endsWith('iLocalOvrd')) { 
                    myAppIf.iLocalOvrd = element.value != null ? element.value : {value:0,state:0};
                    console.log(`\tiLocalOvrd: ${JSON.stringify(myAppIf.iLocalOvrd)}`);
                    initializeSet.delete('iLocalOvrd');
                }
                if(element.item.endsWith('iSched')) {
                    myAppIf.iSched = element.value != null ? element.value : {value:0,state:0};
                    console.log(`\tiSched: ${JSON.stringify(myAppIf.iSched)}`);
                    initializeSet.delete('iSched');
                }
                if(element.item.endsWith('cpDefLevel')) {
                    myAppIf.defLevel = element.value;    
                    console.log(`\tdefLevel: ${JSON.stringify(myAppIf.defLevel)}`);
                    initializeSet.delete('cpDefLevel');
                }
                //if(element.item.endsWith('oSegmentSw'))
                //    myAppIf.oSegmentSw = element.value;    
                //if(element.item.endsWith('oGroupSw'))
                //    myAppIf.oGroupSw = element.value;    
                if(element.item.endsWith('cpGroupDelay')) {
                    myAppIf.groupDelay = element.value * 1000;
                    console.log(`\tgroupDelay: ${JSON.stringify(myAppIf.groupDelay)}`);
                    initializeSet.delete('cpGroupDelay');
                }            
                if(element.item.endsWith('cpOffSequence')) { 
                    myAppIf.offSequence = element.value; 
                    console.log(`\toffSequence: ${JSON.stringify(myAppIf.offSequence)}`);
                    initializeSet.delete('cpOffSequence');
                }
                if(element.item.endsWith('oRestarts')) {
                    console.log(`\toRestarts: ${JSON.stringify(myAppIf.oRestarts)}`);                    
                    myAppIf.oRestarts = element.value; 
                }
            });


            if (initializeSet.size == 0) {
                inputSetComplete = true;
                processStateMachine(Events.NO_EVENT);
                client.unsubscribe('myRespQ');
                client.subscribe ('Advantech/+/Device_Status');
            } else {
                console.log(`${logPrefix(false)}*** Failed to initialize point values.  Exiting now.`);
                process.exit(1);
            }
        }
        // Auto detect presense of an Adam-6266 connected to the WAN/eth1 port on 
        // subnet 192.168.2.x.  Adam-6266 expecting to find the MQTT broker at 192.168.2.222
        // Feature must be enabled, the Adam-6266 properly configured at addres 195.168.2.5
        // and enabled to use MQTT.  
        if (topic.startsWith('Advantech')) {
            if (topic.endsWith('Device_Status')) {
                if (dioMac == '') {
                    if (payload.status == 'connect' ) {
                        dioMac = topic.split('/')[1];
                        client.subscribe(`Advantech/${dioMac}/data`);
                        console.log(`Adam-6266 is connected. MACID: ${dioMac}`); 
                    } else {
                        console.log(`Advantech Status: ${message}`)
                    }
                }
                if (typeof (payload.status) != 'undefined')
                    dioConnected = payload.status == 'connect';
                if (!dioConnected) {
                    inputState.di1 = false;
                    inputState.di2 = false;
                    inputState.di3 = false;
                    inputState.di4 = false;
                    console.log(`${logPrefix(false)}***Adam 6266 Disconnected.`)    
                }
            }
            if (topic.endsWith('data')) {
                let ctlMsg = {v:null};
                if (payload.di1 !== inputState.di1){
                    if (inputState.di1 == null) {
                        console.log ('Init local IO state cache.')
                        inputState.di1 = payload.di1;
                        inputState.di2 = payload.di2;
                        inputState.di3 = payload.di3;
                        inputState.di4 = payload.di4;
                        outputState.do1 = payload.do1;
                        outputState.do2 = payload.do2;
                        outputState.do3 = payload.do3;
                        outputState.do4 = payload.do4;
                    }
                    inputState.di1 = payload.di1;
                    ctlMsg.v = inputState.di1;
                    myAppIf.bypassState = inputState.di1;
                    processStateMachine(inputState.d1 ? Events.BYPASS_ON : Events.BYPASS_OFF);
                    console.log(`${logPrefix(false)}Local Bypass: ${(inputState.di1 == true) ? 'ON':'OFF'}`);
                    return;    
                }
            }

        }
        if (topic.match (dciUpdateRe)) {
            let thisFb = payload.block.split('/')[2];
            let dpFingerPrint = payload.handle + '/' + payload.block +'/' + payload.datapoint + '/' + JSON.stringify(payload.value);
            
            // debounce duplicate updates
            if (lastUpdate == dpFingerPrint) {
                console.log('Ignoring duplicate event.')
                return; 
            }
            
            // What comes in goes to the output
            let controlEvent= Events.NO_EVENT;
            switch (payload.datapoint) {
                case 'iLocalOvrd':
                    if (payload.value.hasOwnProperty('value') && (payload.value.hasOwnProperty('state'))) {
                        myAppIf.iLocalOvrd = payload.value;
                        controlEvent = payload.value.state == 1 ? Events.BYPASS_ON : Events.BYPASS_OFF;
                    } else {
                        console.log(`${logPrefix(false)}Invalid iLocalOverd: ${payload.value}, update not processed`);
                        return;
                    }
                    break;
                case 'iSched':
                    if (payload.value.hasOwnProperty('value') && (payload.value.hasOwnProperty('state'))) {
                        myAppIf.iSched = payload.value;
                        controlEvent = payload.value.state == 1 ? Events.SCHED_ON : Events.SCHED_OFF;
                        console.log(`${logPrefix(false)}iSched value: ${JSON.stringify(payload.value)}`);
                    } else {
                        console.log(`${logPrefix(false)}Invalid iSched: ${payload.value}, update not processed`);
                        return;
                    }
                    break;
                case 'cpDefLevel':
                    myAppIf.defLevel = payload.value;    
                case 'oSegmentSw':
                    if (payload.value.hasOwnProperty('value') && (payload.value.hasOwnProperty('state'))) {
                        myAppIf.oSegmentSw = payload.value;
                    } else {
                        console.log(`${logPrefix(false)}Invalid oSegmentSw: ${payload.value}, update not processed`);
                        return;
                    }
                    break;    
                case 'oGroupSw':
                    if (payload.value.hasOwnProperty('value') && (payload.value.hasOwnProperty('state'))) {
                        myAppIf.oGroupSw = payload.value;
                    } else {
                        console.log(`${logPrefix(false)}Invalid oGroupSw: ${payload.value}, update not processed`);
                        return;
                    }    
                    break;  
                default:
                    return;
                    break; 
            }
            
            if (controlEvent !== Events.NO_EVENT)
                processStateMachine(Events.controlEvent);
            if (!dpFingerPrint.includes('oUpTime'))     
                console.log(`${logPrefix(false)} ${dpFingerPrint}`);
            lastUpdate = dpFingerPrint;
            // Clear lastValue after 500ms 
            updateDelayTmo = setTimeout(()=>{
                lastUpdate = {};
            }, 500);
        }
        if (topic.match(conRqRe)) {
            console.log(`${logPrefix(false)}Connection: ${topic}: ${message}`);
        }
        if (topic.match(devProvRe)) {
            if(payload.action != 'test')
                console.log(`${logPrefix(false)}Device: ${topic}: ${message}`);
        }

    } catch(error) {
        let tsNow = new Date();
        console.error(`[${tsNow.toLocaleTimeString()}] MQTT Message: ${error.stack}`);
    }
}   // onMessage handler
);  // onMessage registrations