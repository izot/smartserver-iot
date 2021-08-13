/*
 localDev.js - Use this application to define lon.attach:'local' devices on the SmartServer.
       
  
*/ 
'use strict';
const mqtt = require('mqtt');

const appVersion = '1.00.002';

let provisioned = 'unknown';
let gmState = 'unknown';
let startTm = new Date();

let args = process.argv.slice(2);
let devHndl = '';
let pidSelect = '';
let hostIp = '127.0.0.1';
let createPending = false;

// An agurment of 1 to override the device handle.
function cmdBanner (){
    console.log(`localDev.js - version: ${appVersion}  - Defines a lon.attach:local device based on a PID.`);
    if (args.length < 3) {
        console.log(`\tRequires 3 command line arguments:`);
        console.log(`\t(1) PID as a hex code string (16 characters)`);
        console.log(`\t(2) The device handle which should have an alpha prefix.  For example: dyn-1.`);     
        console.log(`\t(3) The IP address for the target SmartServer IoT`);     
        process.exit(0);
    }
}
cmdBanner();

if (args.length >= 2) {
    pidSelect= args[0];
    devHndl = args[1];   
    if(args.length == 3)
        hostIp = args[2];                          
}

let glpPrefix='glp/0';  // this will include the sid once determined
let subscribtionsActive = false;
  
const client = mqtt.connect(`mqtt://${hostIp}:1883`);
 
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
    console.log(`Creating the internal device: ${devHndl} based on PID: ${pidSelect}`);
    let createMyAppMsg = {
        action: 'create',
        args: {
            unid: 'auto',
            type: pidSelect,
            'lon.attach': 'local'
            }
        } // CreateMyAppMsg {}
    client.publish(
        `${glpPrefix}/rq/dev/lon/${devHndl}/do`,
        JSON.stringify(createMyAppMsg)
    );
    provisioned = 'unknown';
    createPending = true;
    let setCfg = {
        name: `${devHndl}`,
        desc: 'Internal device for monitoring applications'
    }
    client.publish(
        `${glpPrefix}/rq/dev/lon/${devHndl}/cfg`,
        JSON.stringify(setCfg)
    );
    const waitForDeviceCreate = setInterval (() => {
        if (!createPending) {
            console.log (`Device Handle: ${devHndl} created. state: ${provisioned} - Health: ${gmState}`);
            process.exit(1);
        }    
        }, 2000);
    },  // IAP/MQ do {action: 'create'} 
    10000
); //10s timeout to determine if the Internal device exists

function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`SmartServer SID: ${sidMsg}`);
            client.unsubscribe (sidTopic);
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                //client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/cfg/#`);
                client.subscribe (`${glpPrefix}/fb/dev/lon/${devHndl}/sts/#`);
                client.subscribe (`${glpPrefix}/ev/error`);
                subscribtionsActive = true;
            } 
        } else {
                console.log(`Redundant SID topic message`);
        }
    } 
}

// IAP/MQ. MQTT message handler. 
client.on(
    'message', 
    (topic, message) => {
    try {
        const payload = JSON.parse(message);
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        // On the first run, we need to confirm the device status is provisioned prior
        // to setting the monitor in attributees
        if (topic.endsWith(`${devHndl}/sts`)) {
            if (payload.state != 'deleted')
                clearTimeout(myDevCreateTmo);
            provisioned = payload.state;
            if (provisioned != 'deleted')
                gmState = payload.health;
            console.log (`${devHndl} - State: ${provisioned} - Health: ${gmState} `); 
            if (createPending) {
                createPending = false;
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





