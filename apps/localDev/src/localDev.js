/*
 localDev.js - Use this application to define lon.attach:'local' devices on the SmartServer.
       
  
*/ 
'use strict';
const mqtt = require('mqtt');
const fs = require('fs'); 

const appVersion = '1.00.003';

let provisioned = 'unknown';
let gmState = 'unknown';
let startTm = new Date();

let args = process.argv.slice(2);
let devHndl = '';
let pidSelect = '';
let hostIp = '127.0.0.1';
let devTemplate = 'toSet';
const devCollection = new Map();
const uids = new Set();
// An agurment of 1 to override the device handle.
function cmdBanner (){
    console.log(`localDev.js - version: ${appVersion}  - Defines a lon.attach:local device based on a PID.`);
    if (args.length < 3) {
        console.log(`\tRequires 3 command line arguments:`);
        console.log(`\t(1) PID as a hex code string (16 characters)`);
        console.log(`\t(2) The device handle which should have an alpha prefix.  For example: dyn-1.`);     
        console.log(`\t(3) The IP address for the target SmartServer IoT`);     
        console.log(`\t(4) The number of devices to create using a index after the (2) prefix`);
        console.log('\t(5) The device template to apply to the devices file.')
        process.exit(0);
    }
}
cmdBanner();
let devCount = 0;
if (args.length >= 2) {
    pidSelect= args[0];
    devHndl = args[1];   
    if(args.length >= 3)
        hostIp = args[2];
    if(args.length >= 4)
        devCount = parseInt(args[3],10); 
    if(args.length >=5)
        devTemplate = args[4];                                   
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
let devicesRequested = 0;
let pendingDeviceIndex = 0;
let pendingDeviceHandle;
// This function will fire if the internal device for this application does not exist.
// This is the case the very first time this application runs on the target SmartServer.  
// This device will exist on the SmartServer until it is deleted by user action in the CMS
// or the SmartServer Apollo-reset normal... is executed.

function createDevice (thisDevHandle) {
    let createMyAppMsg = {
        action: 'create',
        args: {
            unid: 'auto',
            type: pidSelect,
            'lon.attach': 'local'
            }
    }; // CreateMyAppMsg {}
    let setCfg = {
        name: `${thisDevHandle}`,
        desc: 'Internal device applications'
    };    
    console.log(`Creating the internal device: ${thisDevHandle} based on PID: ${pidSelect}`);

    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisDevHandle}/do`,
        JSON.stringify(createMyAppMsg)
    )        
    client.publish(
        `${glpPrefix}/rq/dev/lon/${thisDevHandle}/cfg`,
        JSON.stringify(setCfg)
    );
    pendingDeviceHandle = thisDevHandle;

} 
const myDevCreateTmo = setTimeout (() => {
    if (devCount == 0) {
        createDevice (devHndl);
    } else {
        pendingDeviceIndex = 1;
        createDevice (`${devHndl}-${pendingDeviceIndex.toString().padStart(2,'0')}`);
    }
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
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts/#`);
                client.subscribe (`${glpPrefix}/ev/error`);
                client.subscribe (`${glpPrefix}/ev/created/#`)

                subscribtionsActive = true;
            } 
        } else {
                console.log(`Redundant SID topic message`);
        }
    } 
}

// IAP/MQ. MQTT message handler. 
let devCreateTmo;
let devicesCreated = false;
let deviceFileCreated = false;
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
   
        }
        if (topic.startsWith(`${glpPrefix}/ev/created/dev/lon`)) {
            if (payload.topic.endsWith(pendingDeviceHandle)) {
                console.log (`${pendingDeviceHandle} created.`)
                if (devCount == 0) {
                    process.exit(0);
                } else {
                    if (pendingDeviceIndex < devCount) {
                        ++pendingDeviceIndex;
                        createDevice (`${devHndl}-${pendingDeviceIndex.toString().padStart(2,'0')}`);
                    } else {
                        console.log (`${devCount} devices created.`);
                        devicesCreated = true;
                    }
                }
            } else 
                console.log (`Create event: ${payload.topic}`);
        }
        //let devStsTopicRegEx = new RegExp('glp\/0\/\w+\/fb\/dev\/lon\/LC-[0-9]+\/sts','g');
        let devStsTopicRegEx = new RegExp(`fb/dev/lon/${devHndl}-[0-9]+\/sts`,'g');
        if (topic.match(devStsTopicRegEx) != null) {
            if (payload.state != 'deleted')
                clearTimeout(myDevCreateTmo);
            provisioned = payload.state;
            if (provisioned != 'deleted')
                gmState = payload.health;
            let thisDevHandle =  topic.split('/')[6];  
            console.log (`${thisDevHandle} - State: ${provisioned} - Health: ${gmState} `);
            if (typeof payload.unid === 'undefined')
                return;
            let devRecord = `${thisDevHandle},${devTemplate},EDGE,lon,manual,,\'${payload.unid},-121.93216,37.28506,Customer 1,,,` ;
            devCollection.set(thisDevHandle,devRecord);
            uids.add(`${payload.unid}`);
            if (devCount > 0 && (devCollection.size == devCount) && !deviceFileCreated) {
                console.log(`Creating CMS import file.`);
                console.log(`Creating nodeUtil devices script file.`);
                let nodeutilFile = fs.createWriteStream('nuDevices.scr');
                let devicesFile = fs.createWriteStream('simDevices.csv','utf8');
                devicesFile.on('finish', () => {
                        console.log('CMS Device import file: simDevices.csv - has been created');
                        process.exit(0);
                    });
                devicesFile.on('error', (err) => {
                        console.log(err.stack);
                        process.exit (1)
                    });
                devicesFile.write('#filetype devices\n','utf-8');    
                devicesFile.write('name,deviceType,category,protocol,discoveryMethod,installationDate,uid,longitude,latitude,customerName,did,ownerMAC,timezone\n',"utf8");
                devCollection.forEach((value,key) =>  {
                    devicesFile.write(`${value}\n`,'utf8');
                });
                uids.forEach((uid) => {
                    nodeutilFile.write(`q\n${uid}\n`,'utf-8');
                });
                deviceFileCreated = true;
                nodeutilFile.end();
                devicesFile.end();
            };

        }       
        if (topic.endsWith('ev/error')) {
            console.log(`${payload.ts}: ${payload.cat} - ${payload.topic} - Source: ${payload.source}  - ${payload.message}`);
        }
    
    } catch(error) {
        console.error('MQTT Message: ' + error + ` at Line: ${error.line}`);
    }
}   // onMessage handler
);  // onMessage registration





