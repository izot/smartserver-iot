// gc.js
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

const version = '1.00.003';

// gc.js
// This application implements 16 simple group controllers.  The first gc will optionally manage 
// Maintenance/Onnet of ../fb/dev/lon/lon.sys/if/system/0/mode. 


let pendingCreate;
let tsNow = new Date();
let onApollo = Boolean(process.platform == 'linux');
let args = process.argv.slice(1);
let delayStart = 1;
let startupPause = 120;


// DevNote: Hardcoded address for target to change
let mqttBroker =  (onApollo) ? 'mqtt://127.0.0.1:1883' : 'mqtt://192.168.10.202';
// SBS health monitoring 

let myAppIf = {
        appPID : '90000106000485A8',    
        fbName : 'gc',            
        devHandle : 'GC-1',               
};    

function cmdBanner (){
    console.log(`\ngc.js - version: ${version}`); 
    console.log(`[${tsNow.toLocaleString()}] - Startup.`)   
};
cmdBanner();
if (args.length > 1) {
    delayStart= parseInt(args[1],10);
    console.log(`Delay Start: ${delayStart}, ${startupPause}`);                      
}
if (onApollo && delayStart) {
    console.log(`Allowing SIOT processes to initialize.  Sleep for: ${(startupPause ).toString()}s`);
    // Only in linux
    execSync("sleep " +  (startupPause).toString());  // 10 Minutes required for large systems
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

function createGcDevice () {
    let tsNow = new Date();
    let thisHndl = myAppIf.devHandle;
    let thisPID = myAppIf.appPID;

    console.log(`[${tsNow.toLocaleTimeString()}] Creating: ${thisHndl} based on PID: ${thisPID}`);
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
        desc: 'Internal device Group Controller'
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisHndl}/cfg`,
        JSON.stringify(setCfg)
    );
    pendingCreate = thisHndl;
}

// If Internal devices required are not present, this function will fire
let myDevCreateTmo = setTimeout (createGcDevice,10000); 

function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`); 
            client.unsubscribe (sidTopic);
        } else {
            console.log(`Redundant SID topic message`);
        }
    } 
};

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
}
let gcDevRe = /fb\/dev\/lon\/GC-1\/sts/g;
let gcUpdateRe = new RegExp(`ev\/updated\/dev\/lon\/type\/${myAppIf.appPID}`);
let updateDelayTmo;
let lastUpdate = {};
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
        if (topic.match (gcDevRe)) {
            let provisioned = 'unknown';
            let state = 'unknown';
            let thisDevHndl = topic.split('/')[6];
            provisioned = payload.state;

            if (provisioned != 'deleted') {               
                state = payload.health;
                console.log (`\t${thisDevHndl} - State: ${provisioned} - Health: ${state} `); 
                client.subscribe(`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.appPID}`);
                clearTimeout(myDevCreateTmo); 
            }  
        } 
 
        if (topic.match (gcUpdateRe)) {
            let thisFb = payload.block.split('/')[2];

            let dpFingerPrint = payload.handle + payload.block + payload.datapoint + payload.value;
            let dp = {handle:myAppIf.devHandle,fb:myAppIf.fbName,fbIndex:thisFb,dp:'oDimVal',val:payload.value };

            // debounce duplicate updates
            if (lastUpdate == dpFingerPrint) {
                console.log('Ignoring duplicate event.')
                return; 
            }
            // What comes in goes to the output.  Switch to switch_2 translattion
            let sw2 = {state:"SW_SET_LEVEL",setting:{value:payload.value.value},scene_number:1};
            switch (payload.datapoint) {
                case 'iLocalOvrd':
                    // Add BL
                    updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimVal',dp.val);
                    updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimSw2val',sw2);
                    break;
                case 'iRemOvrd':
                    // Add BLupdateDp (myAppIf.devHandle,myAppIf.fbName,thisFb,'oDimVal',payload.value);
                    updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimVal',dp.val);
                    break;
                case 'iSchedule':
                    // Add BL    
                    updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimVal',dp.val);
                    updateDp (dp.handle,dp.fb,dp.fbIndex,'oDimSw2val',sw2);
                    break; 
            }
            console.log(`[${tsNow.toLocaleTimeString()}] update from: ${dp.handle}/${dp.fb}/${dp.fbIndex}/${dp.dp}: ${JSON.stringify(dp.val)}`);
            lastUpdate = dpFingerPrint;
            // Clear lastValue after 500ms 
            updateDelayTmo = setTimeout(()=>{
                lastUpdate = '';
            }, 500);
        }

    } catch(error) {
        let tsNow = new Date();
        console.error(`[${tsNow.toLocaleTimeString()}] MQTT Message: ${error.stack}`);
    }
}   // onMessage handler
);  // onMessage registrations