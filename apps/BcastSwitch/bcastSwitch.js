/*
 bcastSwich.js - Use this application emulates the  SmartServer 2 broadcast switch value.
       
   01/05/2021 - Release 1.00.001
  
*/ 
'use strict';
const mqtt = require('mqtt');
const appVersion = '1.00.001';

let myAppIf = {
    myAppPID : '9000012300438511', // This must match the PID for the XIF which defines this application
    myFbName : 'dev',
    myDeviceHandle : 'bcast-1',       // Your choice here, but must not already exist on your target SmartServer 
    initialized: false
};
var args = process.argv.slice(2);
let myState = 'unknown';
let provisioned = 'unknown';
let activeBcast = false;
let currnenBcastValue;
let bcastHearbeat = 300 * 1000; // 300s

// An agurment of 1 to override the device handle.
function cmdBanner (){
    console.log(`bcastSwitch.js - version: ${appVersion}  - Mimics the SmartServer 2 Broadcast Switch mechanism`);
    console.log(`\tAccepts 2 optional commandline arguments: to override the deivce handle (defaults to: bcast-1)`);    
    console.log(`\targ[0]: string to override the deivce handle (defaults to: bcast-1)`);    
    console.log(`\targ[1]: Integer seconds to override the default heartbeat of 300s the low limit is 60`);    
}
cmdBanner();

if (args.length == 1) {
    myAppIf.myDeviceHandle = args[0];
}
if (args.length == 2) {
    myAppIf.myDeviceHandle = args[0];
    bcastHearbeat = parseInt(args[1]) * 1000;
}

let glpPrefix='glp/0';  // this will include the sid once determined
let subscribtionsActive = false;
  
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

// sendBcast() will broadcast s SNVT_switch value using the device/do {action:message}
function sendBcast (thisSwValue) {
    if (thisSwValue.state === 'invalid') {
        console.log(`bcastSwitch is now inactive`);
        activeBcast = false;
    } else {    
        let msgPayload = {
            action:'message',
            args: {
                code: 59,
                data: [thisSwValue.value * 2, (thisSwValue.state !== 'invalid') ? thisSwValue.state : 255],
                service: 'unacknowledged',
                addressing: 'broadcast'
            }
        };
        if (activeBcast == false)
            console.log(`bcastSwitch is active`);
        activeBcast = true;
        currnenBcastValue = thisSwValue;
        client.publish (
            `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/do`,
            JSON.stringify(msgPayload),
            {qos:0},
            (err) => {
                 if(err !=null)
                     console.error (`Failed to update: ${outputPnt} : ${err}`);
             }
       );
    }
}

// Implement a heartbeat while nviValue.state != 'invalid'
setInterval (()=> {
        if (activeBcast) {
            sendBcast (currnenBcastValue);
        }
    }, 
    Math.max(60000, bcastHearbeat )
);
// This function will fire if the internal device for this application does not exist.
// This is the case the very first time this application runs on the target SmartServer.  
// This device will exist on the SmartServer until it is deleted by user action in the CMS
// or the SmartServer Apollo-reset normal... is executed.
const myDevCreateTmo = setTimeout (() => {
    console.log('Creating the internal bcastSwitch application');
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
        desc: 'Internal device for broadcast SNVT_switch value'
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
            client.unsubscribe (sidTopic);
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                //client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/cfg/#`);
                client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/sts/#`);
                client.subscribe (`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.myAppPID}`)
                client.subscribe (`${glpPrefix}/ev/error`);
                subscribtionsActive = true;
            } 
        } else {
                console.log(`${nowTs.toISOString()} - Redundant SID topic message`);
        }
    } 
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
        // On the first run, we need to confirm the device status is provisioned prior
        // to setting the monitor in attributees
        if (topic.endsWith(`${myAppIf.myDeviceHandle}/sts`)) {
            if (payload.state != 'deleted')
                clearTimeout(myDevCreateTmo);
            provisioned = payload.state;
            if (provisioned != 'deleted')
                myState = payload.health;
            console.log (`bcastSwitch deivce: ${myAppIf.myDeviceHandle} - State: ${provisioned} - Health: ${myState} `); 
        }
        if (topic.includes(`/ev/updated/dev/lon/type/${myAppIf.myAppPID}`)) {
            if (payload.datapoint === 'nviValue') {
                sendBcast(payload.value);
            }
        }
        if (topic.endsWith('ev/error')) {
            console.log(`${payload.ts}: ${payload.cat} - ${payload.topic} - Source: ${payload.source}  - ${payload.message}`);
        }
    
    } catch(error) {
        console.error('MQTT Message: ' + error + ` at Line: ${error.line}`);
    }
}   // onMessage handler
);  // onMessage registration
