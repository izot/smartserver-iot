'use strict';
let fs = require('fs');
let xml2js = require('xml2js');
const mqtt = require('mqtt');

const appVersion = '1.00.003a';
// File: typeFix.js
// Input file is the output of an IzoT CT XML export this is executed from the subsystem that includes
// the intennal device supporting a dynamic interface.  In this workflow, the internal device IAP handle
// must match the device name in CT, (case sensitive)
// Cmd line Argurments: $1[export file] $2[Internal Device Target] $3[Target SmartServer IP address]

let parser = new xml2js.Parser({explicitArray:false});
let points = new Map();
let fbNames = new Map();        

let args = process.argv.slice(2); //cmdline parameter start at index 2
let  devHndl = '';
let smartServerIp = '';
let exportParsed = false;
let fileName = '';
let targetFound = false;

// An agurment of 1 to override the device handle.
function cmdBanner (){
    console.log(`typeFix.js - version: ${appVersion}  - Uses a IzoT CT export file to set UNVT types.`);
    if (args.length < 3) {
        console.log(`\tAccepts 3 command line arguments:`); 
        console.log(`\t(1) XML export filename.`);
        console.log(`\t(2) Target Internal device. Use '*' to fixType on all devices in the Export.`);     
        console.log(`\t(3) IP address of the target SmartServer IoT.`);     
        process.exit(0);
    }
}
cmdBanner();

if (args.length >= 3) {
    fileName = args[0];
    devHndl = args[1];  
    smartServerIp = args[2];                           
}
let glpPrefix='glp/0';  // this will include the sid once determined
let subscribtionsActive = false;

const client = mqtt.connect(`mqtt://${smartServerIp}:1883`);
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
            console.log(`SmartServer SID: ${sidMsg}`);
            client.unsubscribe (sidTopic);
            if (!subscribtionsActive) { 
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
        let nowTs = new Date(); // Seconds TS good enough
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        // Parse each FB to find unformatted data points devHndl/if/fb/index/dpObject,name,format 
        if (topic.startsWith(`${glpPrefix}/fb/dev/lon/${devHndl}/if`)) {
            let topicBits = topic.split('/')
            for (const [key, value] of Object.entries(payload)) {
                if (value.type != null && (value.type.includes('rawHex') || value.type.includes('unknown') ))
                    console.log(`${topicBits[6]}/${topicBits[8]}/${topicBits[9]}/${key}, ${value.name},${value.type}`);
              }
        }
        
        if (topic.endsWith('ev/error')) {
            console.log(`${payload.cat} - ${payload.topic} - Source: ${payload.source}  - ${payload.message}`);
        }
    
    } catch(error) {
        console.error('MQTT Message: ' + error + ` at Line: ${error.line}`);
    }
}   // onMessage handler
);  // onMessage registration
let mqttRetries = 0;
function updateIAP () {
    if (!exportParsed) {
        console.log ('Timeout before Export file parsing');
        process.exit(0);
    }
    if (glpPrefix == 'glp/0') {
        ++mqttRetries;
        if (mqttRetries < 15) {
            setTimeout(updateIAP,1000);
            return;
        } else {
            console.log ('Timeout connecting to SmartServer IoT.');
            process.exit(0);         
        }
    }
    console.log(`Setting UNVT types in IAP/MQ tree. `);
    let pointIterator = points.entries();
    points.forEach (point => {
        let topic = `${glpPrefix}/rq/dev/lon/${pointIterator.next().value[0]}`;
        let fmtMsg = {type: point.typeStr};
        console.log(`${topic} Set type: ${(fmtMsg.type)}`);
        client.publish (
            topic,
            JSON.stringify(fmtMsg)
        );
    });
    let fbIterator = fbNames.entries();
    console.log(`Setting Functional block names.`)
    fbNames.forEach (fb => {
        let topic = `${glpPrefix}/rq/dev/lon/${fbIterator.next().value[0]}/name`;
        client.publish (
            topic,
            JSON.stringify(fb)
        );       
    });
    setTimeout(() => {
       console.log(`typeFix completed!`); 
       process.exit(1);
    }, 3000);
}
setTimeout(updateIAP,2000);
function pushDevices (AppDevs, AppDevCollection) {
    if (AppDevs.hasOwnProperty('$.Handle')) {
        AppDevCollection.push(subS.AppDevices.AppDevice);
    } else {
        for (let appD of subS.AppDevices.AppDevice) {
            AppDevCollection.push(appD);
        }
    }    
}
let AppDevCollection = new Array();

function pushDevice (AppDev) {
    if (AppDev.hasOwnProperty('$'))
        AppDevCollection.push (AppDev);
    else
        for (let appD of AppDev) 
            AppDevCollection.push(appD); 
    return;
}

fs.readFile(/*__dirname +*/ `./${fileName}`, function(err, data) {
    if (err != null) {
        console.log(`Export File error: ${err.message}`);
        process.exit(1);
    }
    parser.parseString(data, function (err, result) {
        //Assuming the XML export includes the targeted internal device with the dynamic interface 
        if (err != null) {
            console.log(`Export file parsing error: ${err.message}`);
            process.exit(1);
        }
        let root = result.LonWorksNetwork.Subsystems;

        // Creating a flat collecitons of Devices
        // Handle the signal subsystem export and root level AppDevices
        if (root.Subsystem.hasOwnProperty('AppDevices')) {
            pushDevice(root.Subsystem.AppDevices.AppDevice);
        }
        if (root.Subsystem.hasOwnProperty('Subsystems') && root.Subsystem.Subsystems.Subsystem.length) {  // Need to walk the subsytem tree.  Should do this with recursion.
            for (let subSys1 of root.Subsystem.Subsystems.Subsystem) { // Second tier of Subsystems
                if (subSys1.hasOwnProperty('AppDevices')) 
                    pushDevice(subSys1.AppDevices.AppDevice); // AppDevices collected   
                if (subSys1.hasOwnProperty('Subsystems')) { // Do more tiers exist?
                    let subSys2 = subSys1.Subsystems;
                    for (let subSys3 of subSys2.Subsystem) {
                        if (subSys3.hasOwnProperty('AppDevices'))
                            pushDevice(subSys3.AppDevices.AppDevice);
                        if (subSys3.hasOwnProperty('Subsystems')) {
                            let subSys4 = subSys3.Subsystems;
                            for(let subSys5 of subSys4.Subsystem) {
                                if (subSys5.hasOwnProperty('AppDevices'))
                                    pushDevice(subSys5.AppDevices.AppDevice);
                                if (subSys5.hasOwnProperty('SubSystems')) {
                                    let subSys6 = subSys5.Subsystems;
                                    for(let subSys7 of subSys6.SubSystem) {
                                        if (subSys7.hasOwnProperty('AppDevices'))
                                            pushDevice(subSys7.AppDevices.AppDevice);
                                    }
                                }    
                            }   
                        }    
                    }
                }
            }
        }    
        
        if (AppDevCollection.length == 0) {
            console.log(`No application devices are defined in the file ${fileName}`);
            return;
        }
        let thisHndl;
        for (let appDev of AppDevCollection) {
            if (!appDev.hasOwnProperty('NeuronId'))
                continue; 
            if (appDev.Name == devHndl || devHndl == '*' ) {
                targetFound = true;
                if (devHndl == '*') {
                    thisHndl = appDev.Description.toLowerCase() == 'local' ? appDev.Name : appDev.$.Handle;
                }  else
                    thisHndl = devHndl;
                //let fbCollection = appDev.FunctionalBlocks.FunctionalBlock.length == null ? [appDev.FunctionalBlocks.FunctionalBlock] : appDev.FunctionalBlocks.FunctionalBlock;
                let fbs = appDev.FunctionalBlocks;
                if (fbs == null || typeof(fbs) == 'string')
                    continue;
                let fbCollection = appDev.FunctionalBlocks.FunctionalBlock;
                // Need to promote an obect to an array for Interfaces with a single FB.
                if (fbCollection.$ != null)
                    fbCollection = [fbCollection];
   
                for(let j = 0; j < fbCollection.length; j++) {
                    let fb = fbCollection[j];
                    let fbName;
                    let fbIndex;
                    let nvs = fb.NetworkVariables.NetworkVariable;
                    if (nvs == null) 
                        continue;
                    fbName = fb.IsVirtualFb._ == 'True' ? 'device' : fb.ProgrammaticName.replace(/[^a-z,^A-Z]/g,'');    
                    fbIndex = fb.IsVirtualFb._ == 'True' ? '0' : j.toString() 
                    nvs.forEach(nv => {
                        let topicTail = `${thisHndl}/if/${fbName}/${fbIndex}/${nv.ProgrammaticName}`;
                        let fmtSpec = {
                            typeStr:'',
                            fbLnsName:`${fb.Name}`,
                            nvLnsName:`${nv.Name}`
                        }
                        //console.log(`${topicTail} Format: ${nv.Format}`);
                        if (nv.Format == '') {
                            switch (nv.TypeSpec.Scope.$.ID) {
                                case '0':   // Unprovisioned device in an export
                                    fmtSpec.typeStr = '';
                                    break
                                case '3':
                                    fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,6)}0000000000-3/${nv.TypeSpec.TypeName}`;
                                    break;
                                case '4':
                                    fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,10)}000000-4/${nv.TypeSpec.TypeName}`;
                                    break;
                                case '5':
                                    fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,14)}00-5/${nv.TypeSpec.TypeName}`;
                                    break;   
                                case '6':
                                    fmtSpec.typeStr = `${nv.TypeSpec.ProgramId}-6/${nv.TypeSpec.TypeName}`;
                                    break;                                                                         
                            }
                            console.log(`${topicTail},${fmtSpec.typeStr}`);
                            if (fmtSpec.typeStr != '') // UNVT with no format override, do nothing
                                points.set(topicTail,fmtSpec);
                        } else if (nv.Format.startsWith('#')) { // Non LM associated type format override
                            if (nv.LonMarkMemberIndex == -1) {
                                fmtSpec.typeStr = ((nv.Format.replace('#','')).replace('[','-').replace(']','')).replace('.','/');
                            } else { // UNVT that needs to match the IAP resource string requirements.
                                switch (nv.TypeSpec.Scope.$.ID) {
                                    case '0':
                                        fmtSpec.typeStr = nv.TypeSpec.TypeName;
                                        break;
                                    case '3':
                                        fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,6)}0000000000-3/${nv.TypeSpec.TypeName}`;
                                        break;
                                    case '4':
                                        fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,10)}000000-4/${nv.TypeSpec.TypeName}`;
                                        break;
                                    case '5':
                                        fmtSpec.typeStr = `${nv.TypeSpec.ProgramId.slice(0,14)}00-5/${nv.TypeSpec.TypeName}`;
                                        break;   
                                    case '6':
                                        fmtSpec.typeStr = `${nv.TypeSpec.ProgramId}-6/${nv.TypeSpec.TypeName}`;
                                        break;                                                                         
                                }
                                //fmtSpec.typeStr = nv.Format.slice(1,19).replace('[','-')+nv.Format.slice(20);
                            }    
                            console.log(`${topicTail}, Apply ->${fmtSpec.typeStr}`);
                            if (fmtSpec.typeStr != '') // Expecting this to always be true
                                points.set(topicTail,fmtSpec);
                        }
                    });
                    fbNames.set(`${thisHndl}/if/${fbName}/${fbIndex}`,fb.Name);
                }
            }
        }
    });
    //console.dir(result);
    if (targetFound) {
        exportParsed = true;
        console.log(`Export Parsed.  Datapoint types to fix: ${points.size}, Function Block Names to Set: ${fbNames.size}`);
        //setFormats();
    } else {
        console.log(`The target internal device: ${devHndl} not found in export file. No types are modified.`);
        process.exit(0);
    }
});

