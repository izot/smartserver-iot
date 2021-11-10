'use strict';
const mqtt = require('mqtt');

const version = '1.00.001';
let replacePending = new Set();
let lonDevMap = new Map();
let cpsToSend = new Array();
let args = process.argv.slice(2);
let hostIp = '127.0.0.1';

function cmdBanner (){
    let now = new Date()
    console.log(`\n[${now.toLocaleString()}] - cfgReplace.js - version: ${version}`); 
}
cmdBanner();

if (args.length >= 1) {
    hostIp = args[0];                        
}
let glpPrefix='glp/0';  // this will include the sid once determined
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
function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`[${nowTs.toLocaleString()}] - SmartServer SID: ${sidMsg}`);
            client.unsubscribe (sidTopic);
            client.subscribe (`${glpPrefix}/rq/dev/lon/+/do`);
            client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
            client.subscribe (`${glpPrefix}/ev/error`);
        } else {
                console.log(`Redundant SID topic message`);
        }
    } 
}
// Regex for filtering IAP/MQ topics
const rqDoRe = /\w+\/rq\/dev\/lon\/\w+\/do/g;           // Detects ../lon/+/do actions
const lonDevStsRe = /\w+\/fb\/dev\/lon\/\w+\/sts/g;     // Detects ../lon/dev/sts updates
const fbIfRe = /\w+\/fb\/dev\/lon\/\w+\/if\/\w+/g;      // Detects published interfaces.

let activeReplace = new Set();
let ifPubTmo;
let fbCount = 0;
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
        let tsNow = new Date();
        if (topic.search(rqDoRe) != -1) {
            console.log(`[${tsNow.toLocaleString()}] - Replace Request: ${topic} : ${message}`);
            if (payload.action == "replace") {
                replacePending.add(payload.args.unid);
            }
            if (payload.action == 'provision') {
                replacePending.add(lonDevMap.get(topic.split('/')[6]));
            }
        }
        //console.log (`[${tsNow.getTime()}]->${topic}`);
        // On the first run, we need to confirm the device status is provisioned prior
        // to setting the monitor in attributees
        if (topic.search(lonDevStsRe) != -1) {
            if(payload.hasOwnProperty('unid'))
                lonDevMap.set(topic.split('/')[6], payload.unid);
            if (replacePending.has(payload.unid)) {
                if (payload.state == 'provisioned') {
                    console.log (`[${tsNow.toLocaleString()}] - Replace or provision complete, push CP values`);
                    // get the current interface fb
                    replacePending.delete(payload.unid);
                    let ifTopic = `${glpPrefix}/fb/dev/lon/${topic.split('/')[6]}/if/#`;
                    client.subscribe (ifTopic,{qos:2});
                    //console.log(`Get device interface: ${ifTopic}`);
                    fbCount = 0;
                } else {
                    console.log (`[${tsNow.toLocaleString()}] - Replace request failed.  Device state: ${payload.state}`)
                };
            } else {
                //console.log (`sts: ${topic}`);
            };
        };

        if (topic.search(fbIfRe) != -1) {
            //console.log(`[${tsNow.toLocaleString()}] - ${topic}`);
            ++fbCount;
            let ifObj = Object.entries(payload);
            for (const point of ifObj) {
                // Any object property that is a cp (property:true) will need to be send to the newly
                // replaced device.  cpsToSend Array is used to queue up this work.
                if (point[1].hasOwnProperty('property')) {
                    if (point[1].property && !point[1].hasOwnProperty('read-only')) {
                        let cpPathVal = {
                            topic:`${topic.replace('/fb/','/rq/')}/${point[0]}/value`,
                            val: point[1].value
                        }
                        cpsToSend.push(cpPathVal);
                    };
                };    
            };
            // Expected the if/device/0 to be published last.  But this is not then case
            // so using a 2s timeout to determine when the interface publishing is complete.
            clearTimeout(ifPubTmo);
            ifPubTmo = setTimeout(() => {
                let cpCount = cpsToSend.length;
                let ts = new Date();
                client.unsubscribe(`${topic.slice(0,topic.search(/\/device\/0/g))}/#`);
                while (cpsToSend.length) {
                    let thisCp = cpsToSend.shift();
                    client.publish (
                        thisCp.topic,
                        JSON.stringify(thisCp.val),
                        {qos:1},
                        (err) => {
                            if (err != null)
                                console.log (`[${tsNow.toLocaleString()}] - CP write failed : ${thisCp.topic}`);
                        }
                    );
                };
                console.log(`[${ts.toLocaleString()}] - ${cpCount} properties from ${fbCount} function blocks sent to device: ${topic.slice(0,topic.search(/\/if\//g))}`);  
            }, 2000);
        };
    
    } catch(error) {
        console.error('MQTT Message: ' + error + ` at Line: ${error.line}`);
    }
}   // onMessage handler
);  // onMessage registration

