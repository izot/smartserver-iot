'use strict';
let fs = require('fs');
let xml2js = require('xml2js');
const mqtt = require('mqtt');

const appVersion = '1.00.001';
// File: exportSurvey.js
// Input file is the output of an IzoT CT XML export for an existing IzoT CT project. This utility
// will summerize the resources that need to be added to the SmartServer IoT prior to running
// inex.exe to create IAP accesssable datapoint that use custome resources.

let parser = new xml2js.Parser({explicitArray:false});       

let args = process.argv.slice(2); //cmdline parameter start at index 2
let  devHndl = '';
let conPrefix = 'A';
let fileName = '';
let targetFound = false;
let exportParsed=false;

// An agurment of 1 to override the device handle.
function cmdBanner (){
    console.log(`exportSurvey.js - version: ${appVersion}  - Reports on needed resources to support inex.exe.`);
    if (args.length < 1) {
        console.log(`\tAccepts 1 commandline argument1:`); 
        console.log(`\t(1) XML export filename.`);
        //console.log(`\t(3) IP address of the tartget SmartServer IoT.`);     
        process.exit(0);
    }
}
cmdBanner();

if (args.length >= 1) {
    fileName = args[0];                           
}

let AppDevCollection = new Array();
let templateCollection = new Map();
let connectionCount = 0;

function pushDevice (AppDev) {
    if (AppDev.hasOwnProperty('$')) {
        AppDevCollection.push (AppDev);
        //templateCollection.
    }
    else
        for (let appD of AppDev) 
            AppDevCollection.push(appD); 
    return;
}
function pushTemplate (devTemplate) {
    if (AppDev.hasOwnProperty('$')) {
        AppDevCollection.push (AppDev);
        //templateCollection.
    }
    else
        for (let appD of AppDev) 
            AppDevCollection.push(appD); 
    return;
}
console.log(`Data file: ${__dirname}\\${fileName}`);
fs.readFile(__dirname + `\\${fileName}`, function(err, data) {
    if (err) {
        console.log(`Failed to open Export file: ${err}`);
        process.exit(0);
    }

    parser.parseString(data, function (err, result) {
        //Assuming the XML export includes the targeted internal device with the dynamic interface 
        let root = result.LonWorksNetwork.Subsystems;
        let tmplRoot = result.LonWorksNetwork.DeviceTemplates;
        for (let devTemplate of tmplRoot.DeviceTemplate ) {
            templateCollection.set(devTemplate.Name, devTemplate);
            console.log (`${devTemplate.Name}, XIF path: ${devTemplate.XifPath}`);
        }
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
        let reportS = fs.createWriteStream(__dirname + `/exportReport.csv`);
        reportS.write(`LNS Template,PID,XIF Path,Custom Resoure,DevFb\n`);
        //conFileS.write('Rule ID,Area Scope,Zone Scope,Device Name,Device Type,Datapoint Name,Direction,Map\n');
        //for (let devTempl)
        for (let appDev of AppDevCollection) {

            if (!appDev.hasOwnProperty('NeuronId'))
                continue; 
            let devTmp = templateCollection.get(appDev.Template);
 
            //let fbCollection = appDev.FunctionalBlocks.FunctionalBlock.length == null ? [appDev.FunctionalBlocks.FunctionalBlock] : appDev.FunctionalBlocks.FunctionalBlock;
            let fbs = appDev.FunctionalBlocks;
            if (fbs == null || typeof(fbs) == 'string')
                continue;
            if (devTmp != null) {
                reportS.write(`${devTmp.Name},${devTmp.Classification.ProgramId},${devTmp.XifPath},`)  
            } else {
                continue;
            }              let fbCollection = appDev.FunctionalBlocks.FunctionalBlock;
            // Need to promote an object to an array for Interfaces with a single FB.
            if (fbCollection.$ != null)
                fbCollection = [fbCollection];
            let unvtCount = 0;  
            let unvtDevCount = 0;
            let ucptCount = 0;
            for(let j = 0; j < fbCollection.length; j++) {
                let fb = fbCollection[j];
                let fbName;
                let fbProgName;
                let fbIndex;
                let nvs = fb.NetworkVariables.NetworkVariable;

                if (nvs == null) 
                    continue;
                if (fb.hasOwnProperty('ConfigProperties')) {
                    let cps = fb.ConfigProperties.ConfigProperty;
                    cps.forEach(cp => {
                        if(cp.Name.includes('UCPT'))
                            ++ucptCount;
                        }  
                    );
                };    
                fbProgName = fb.IsVirtualFb._ == 'True' ? 'device' : fb.ProgrammaticName.replace(/[^a-z,^A-Z]/g,'');    
                fbName = fb.Name;
                for (let m = 0; m < nvs.length; m++) {
                    let nv = nvs[m];
                    if (nv.Format.includes('UNVT')) {
                        ++unvtCount;
                        if (fb.IsVirtualFb._ == 'True')
                            ++unvtDevCount; 
                    }
                    if (nv.hasOwnProperty('ConfigProperty')) {
                        let nvcps = nv.ConfigProperties.ConfigProperty;
                        nvcps.forEach(nvcp => {
                            if(cp.Name.includes('UCPT'))
                                ++ucptCount;
                        })
                    }
                }    

            }
            //reportS.write(`LNS Template,PID,XIF Path,Custom Resoure,DevFb\n`);
            reportS.write(`${unvtCount},${unvtDevCount},${ucptCount}\n`);
            //templateCollection.delete(appDev.Template);
        }
        reportS.end();
    });
    //console.dir(result);

});

