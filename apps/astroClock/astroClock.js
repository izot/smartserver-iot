'use strict';
const mqtt = require('mqtt');
const SolarCalc = require('solar-calc');
const child_process = require('child_process');

// 
// astroClock.js
// Provides UFPTrealtimeClock capabilities related to reporting dusk/dawn control points on
// an internal device.  Based on UFPTastroClock defined ApolloDev.typ 1.31 or higher.  Calculations
// occur at 3:15 AM to avoid any confussion related to daylight savings clock adjustments.
// PID: 90000106000A8511 Handle: astro-1 must be created using localDev.js 
// 08/25/2021 - 1.00.003, Fixed up issue with stacking timers on nvoAfterDark transistion.

// SolarCalc(date,lat,long)
var solar = new SolarCalc(new Date(),34.15157,-118.64777);
const version = '1.00.003';
const scheduleTm = 3*3600000 + 15*60000;
let args = process.argv.slice(2);
let startupPause = 180;
let updatePace = 20;
const points = new Map();
let delayStart = true;

let eventHb = 60 * 1000;
let timeCheck;

let myAppIf = {
    appPID : '90000106000A8511',
    fbName : 'astroClock',
    devHandle : 'astro-1',       // Your choice here, but must not already exist on your target SmartServer 
    lat:0.0,
    lng:0.0,
    dusk: new Date(0),
    dawn: new Date(0),
    sunrise: new Date(0),
    sunset: new Date(0),
    initialized: false,
    state:'unknown',
    duskOffset: 0,      // ms    
    dawnOffset:0,       // ms
    solarEvtHb: 300000, // ms
    timeHb: 300000,
    isPowerline: true

};

function cmdBanner (){
    let now = new Date()
    console.log(`\n${now.toLocaleString()} - astroClock.js - version: ${version}`); 
    console.log(`Sunrise: ${solar.sunrise.toLocaleTimeString('en-us')}, Sunset: ${solar.sunset.toLocaleTimeString('en-us')}`);
    console.log(`Dawn: ${solar.civilDawn.toLocaleTimeString('en-us')}, Dusk: ${solar.civilDusk.toLocaleTimeString('en-us')}`);
}
cmdBanner();
if (args.length >= 1) {
    updatePace = parseInt(args[0]);
    // Optional second argument to override the startup delay
    startupPause = args.length == 2 ? parseInt(args[1]) : 180;
}

// Blocking delay to hold off until the rest of the SIOT services are running
// delayStart is true by default.  Windows debugging should provide a third
// commannd argument of "false"
if ((process.platform == 'linux') && (delayStart == true)) {
    console.log(`Allowing SIOT processes to initialize.  Sleep for: ${(startupPause ).toString()}s`);
    // Only in linux
    child_process.execSync("sleep " +  (startupPause).toString());  // 10 Minutes required for large systems
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

const myDevCreateTmo = setTimeout (() => {
    return;
    console.log('You must run localDev.exe to setup the internal');
    console.log('\tlocalDev 90000106000A8511 astro-1 [SSIOT IP address]');
    process.exit(0);
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
            // Note how the '+' wild card is used to monitor device status for 
            // any lon device.  Note, once we know the SID, we need to avoid
            // adding multiple listeners.  Subscbribe once and only once              
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                client.subscribe (`${glpPrefix}/fb/cfg`);  // Determine location
                client.subscribe (`${glpPrefix}/ev/error`);
                client.unsubscribe (sidTopic);
                subscribtionsActive = true;
            } else {
                console.log(`${nowTs.toLocaleString()} - Redundant SID topic message`);
            }
        } else {
            // We are not provisioned.
            cosole.log(`${nowTs.toLocaleString()} -  Problem with SID payload.`);
        }
    } else {
        console.error('The sid topic returned an unexpected payload type.')
    }
};
let calcTmo;
let clkHbTmo;
let hb1Tmo;
let hb2Tmo;
let hb3Tmo
let hb4Tmo;
let hbAdTmo;
let AdTmo;

// The solar events are set at 3:15AM each day to avoid conflict with DST changes 
// that happen twice each year at 2:00 AM.  
function scheduleNextDay () {
    let tsNow = new Date();
    let delayToSchedule = 0;
    let msToday = tsNow.getHours() * 3600000 + tsNow.getMinutes() * 60000 + tsNow.getSeconds()*1000 + tsNow.getMilliseconds();
    if (msToday < scheduleTm) {
        delayToSchedule = scheduleTm - msToday; 
    } else {
        delayToSchedule = (23*3600000 + 59 * 60000 + 60*1000) - msToday + scheduleTm;
    }
    console.log(`${tsNow.toLocaleString()} - Scheduled Solar event calc in: ${delayToSchedule/1000}s.`)
    return delayToSchedule;


function sendPoint (dpName) {
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/0/${dpName}/value`,
        JSON.stringify(points.get(dpName),
        {qos:0}),
        (err) => {
            if(err != null)
                console.error(`Failed to update ${dpName}: ${err}`);
        }
    );  
    if (dpName == 'nvoDawn') {
        clearTimeout(hb1Tmo);
        hb1Tmo = setTimeout (sendPoint, myAppIf.solarEvtHb, 'nvoDawn');
        return; 
    }    
    if (dpName == 'nvoSunrise') {
        clearTimeout(hb2Tmo);
        hb2Tmo = setTimeout (sendPoint, myAppIf.solarEvtHb, 'nvoSunrise');
        return; 
    }   
    if (dpName == 'nvoDusk') {
        clearTimeout(hb3Tmo);
        hb3Tmo = setTimeout (sendPoint, myAppIf.solarEvtHb, 'nvoDusk');
        return; 
    } 
    if (dpName == 'nvoSunset') {
        clearTimeout(hb4Tmo);
        hb4Tmo = setTimeout (sendPoint, myAppIf.solarEvtHb, 'nvoSunset');
        return; 
    }   
    if (dpName == 'nvoAfterDark') {
        clearTimeout(hbAdTmo);
        hbAdTmo = setTimeout (sendPoint, myAppIf.solarEvtHb, 'nvoAfterDark');
        return; 
    } 
}

function setSnvtTime(solarEvent) {
    let timeStamp = {
        year:2000,
        month:1,
        day:1,
        hour:0,
        minute:0,
        second:0
    };
    let solarDateTm = new Date();
    solarDateTm = myAppIf[solarEvent];
    timeStamp.year = solarDateTm.getFullYear();
    timeStamp.month =  solarDateTm.getMonth() + 1;
    timeStamp.day =  solarDateTm.getDate();
    timeStamp.hour = solarDateTm.getHours();
    timeStamp.minute = solarDateTm.getMinutes();
    timeStamp.second = solarDateTm.getSeconds();
    return timeStamp;
}

function checkForTimeJump () {
    let now = new Date();
    // if time changes by more than 5m recaclulate solar events
    if (timeCheck && (Math.abs(now.getTime() - timeCheck) > 300000)) {
        console.log(`${now.toLocaleString()} - Time has changed. Force calculation of solar events.`)
        setAstroTimes(true);
    }
    timeCheck = now.getTime() + 60000;
}
setInterval(checkForTimeJump, 60000);

function setAfterDark (sendNow) {
    let now = new Date();
    let solar = new SolarCalc(now ,myAppIf.lat,myAppIf.lng);
    if (now.getTime() >= solar.civilDawn.getTime() && now.getTime() < solar.civilDusk.getTime()) { 
        points.set('nvoAfterDark', {value:0, state:0});
    } else {
        points.set('nvoAfterDark', {value:100, state:1});
    }
    let adValue = points.get('nvoAfterDark');
    if (sendNow) {
        client.publish (
            `${glpPrefix}/rq/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/0/nvoAfterDark/value`,
            JSON.stringify(adValue),
            {qos:0},
            (err) => {
                if(err != null)
                    console.error(`${now.toLocaleString()} - Failed to update nvoAfterDark: ${err}`);
            }
        );
        console.log(`${now.toLocaleString()} - Send nvoAfterDark.state: ${adValue.state}`)
    }
    // Solar events trigger nvoAfterDark state changes to the ms.
    if (adValue.state == 0) { // schedule send at dusk
        clearTimeout(AdTmo);
        setTimeout(setAfterDark, myAppIf.dusk.getTime() - now.getTime(), true);  
    } else if (now.getTime() < myAppIf.dawn) { 
        clearTimeout(AdTmo);
        setTimeout(setAfterDark, myAppIf.dawn.getTime() - now.getTime(), true);
    }
}

function setAstroTimes (newDay) {
    let solar = new SolarCalc(new Date(),myAppIf.lat,myAppIf.lng);
    let now = new Date();
    myAppIf.sunrise = solar.sunrise;
    myAppIf.sunset = solar.sunset;
    myAppIf.dusk = solar.civilDusk;
    myAppIf.dawn = solar.civilDawn;
    // Solar event time adjustments are required.  Values in myAppIf are in ms
    if (myAppIf.dawnOffset != 0) 
        myAppIf.dawn.setTime(myAppIf.dawn.getTime() + myAppIf.dawnOffset);
    if (myAppIf.duskOffset != 0) 
        myAppIf.dusk.setTime(myAppIf.dusk.getTime() + myAppIf.duskOffset);       
    setAfterDark (false);
    if (newDay) {
        console.log(`${now.toLocaleString()} - Dawn: ${myAppIf.dawn.toLocaleTimeString()}`);
        console.log(`${now.toLocaleString()} - Dusk: ${myAppIf.dusk.toLocaleTimeString()}`);
    }
    points.set('nvoSunrise', setSnvtTime('sunrise'));
    points.set('nvoDawn', setSnvtTime('dawn'));
    points.set('nvoSunset', setSnvtTime('sunset'));
    points.set('nvoDusk', setSnvtTime('dusk'));
    if (myAppIf.initialized) {
        clearTimeout(calcTmo);
        calcTmo = setTimeout(setAstroTimes, scheduleNextDay(), true );
        clearTimeout(hbAdTmo);
        hbAdTmo = setTimeout(sendPoint, 100, 'nvoAfterDark');
        clearTimeout(hb1Tmo);
        hb1Tmo = setTimeout (sendPoint, myAppIf.isPowerline ? updatePace * 1000: 100, 'nvoDawn');
        clearTimeout(hb2Tmo);
        hb2Tmo = setTimeout (sendPoint, myAppIf.isPowerline ? updatePace * 2 *1000 : 100, 'nvoSunrise');
        clearTimeout(hb3Tmo);
        hb3Tmo = setTimeout (sendPoint, myAppIf.isPowerline ? updatePace * 3 * 1000 : 200, 'nvoDusk');
        clearTimeout(hb4Tmo);
        hb4Tmo = setTimeout (sendPoint, myAppIf.isPowerline ? updatePace * 4 * 1000 : 300, 'nvoSunset');
    }
    
}
function sendRtc () {
    let snvtTs = {
        year:2000,
        month:1,
        day:1,
        hour:0,
        minute:0,
        second:0
    };
    let now = new Date();
    snvtTs.year = now.getFullYear();
    snvtTs.month = now.getMonth() + 1;
    snvtTs.day = now.getDate();
    snvtTs.hour = now.getHours();
    snvtTs.minute = now.getMinutes();
    snvtTs.second = now.getSeconds();
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/0/nvoLocalTime/value`,
        JSON.stringify(snvtTs),
        {qos:0},
        (err) => {
            if(err != null)
                console.error(`${now.toLocaleString} - Failed to update nvoLocalTime: ${err}`);
        }
    );
    clearTimeout(clkHbTmo);
    clkHbTmo = setTimeout (sendRtc, myAppIf.timeHb);
}

// IAP/MQ. MQTT message handler. 
client.on(
    'message', 
    (topic, message) => {
    try {
        const payload = JSON.parse(message);
        let now = new Date();
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
        }  
        // Capture the segment controller GPS location
        if (topic === `${glpPrefix}/fb/cfg`) {
            myAppIf.lat = payload.loc.lat;
            myAppIf.lng = payload.loc.lng;
            console.log (`${now.toLocaleString()} - Using Lat: ${myAppIf.lat} Lng: ${myAppIf.lng}`)
            client.subscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/sts`);
            if (myAppIf.initialized)
                setAstroTimes (true);
        }
        // On the first run, we need to confirm the device status is provisioned prior
        // looking for the interface.
        if (topic.endsWith(`${myAppIf.devHandle}/sts`)) {
            let gmState;
            if (payload.state != 'deleted')
                clearTimeout(myDevCreateTmo);
            myAppIf.state = payload.state;
            if (myAppIf.state != 'deleted')
                gmState = payload.health;
            console.log (`${myAppIf.devHandle} - State: ${myAppIf.state} - Health: ${gmState} `);    
            client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/0`);    
        }
        if (topic.endsWith(`${myAppIf.devHandle}/if/${myAppIf.fbName}/0`)) {
            myAppIf.duskOffset = payload.cpDuskAdjust.value * 60000;
            myAppIf.dawnOffset = payload.cpDawnAdjust.value * 60000;
            myAppIf.timeHb = Math.max(parseInt(payload.cpTimeHb.value) * 1000, 60000);
            myAppIf.solarEvtHb = Math.max(parseInt(payload.cpDuskDawnHb.value) * 1000, 60000); 
            myAppIf.isPowerline = payload.cpPowerline.value == 1;
            myAppIf.initialized = true;
            console.log (`${now.toLocaleString()} - DawnOffset: ${myAppIf.dawnOffset} DuskOffset: ${myAppIf.duskOffset} timeHb: ${myAppIf.timeHb/1000}s SolarEvtHb: ${myAppIf.solarEvtHb/1000}`)
            client.unsubscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.devHandle}/if/${myAppIf.fbName}/0`);
            client.subscribe (`${glpPrefix}/ev/data`);
            setAstroTimes (true);
            sendRtc();
        }
        if (topic.endsWith('ev/data')) {
            // Look for adjustments to astroClock cp values
            if (payload.topic.includes(`${myAppIf.devHandle}/if/${myAppIf.fbName}/0`)) {
                if (payload.message.startsWith('cpDawnAdjust') && myAppIf.dawnOffset != payload.data * 60000) {
                    myAppIf.dawnOffset = payload.data * 60000; // value stored in ms.  cp in minutes
                    console.log (`${now.toLocaleString()} - cpDawnAdjust: ${myAppIf.dawnOffset}ms`);
                    setAstroTimes(false);
                }
                if (payload.message.startsWith('cpDuskAdjust') && myAppIf.duskOffset != payload.data * 60000) {
                    myAppIf.duskOffset = payload.data * 60000; // value stored in ms.  cp in minutes
                    console.log (`${now.toLocaleString()} - cpDuslAdjust: ${myAppIf.duskOffset}ms`);
                    setAstroTimes(false);
                }
                if (payload.message.startsWith('cpTimeHb') && myAppIf.timeHb != parseInt(payload.data) * 1000 ) {
                    myAppIf.timeHb = Math.max(parseInt(payload.data) * 1000, 60000); // value stored in ms.  cp in minutes
                    console.log (`${now.toLocaleString()} - cpTimeHb : ${myAppIf.timeHb}ms`);
                    sendRtc();
                }
                if (payload.message.startsWith('cpDuskDawnHb') && myAppIf.solarEvtHb != parseInt(payload.data) * 1000) {
                    myAppIf.solarEvtHb = Math.Max(parseInt(payload.data) * 1000, 60000); // value stored in ms.  cp in minutes
                    console.log (`${now.toLocaleString()} - cpDuskDawnHb: ${myAppIf.solarEvtHb}ms`);
                    setAstroTimes(false);
                }
                if (payload.message.startsWith('cpPowerline') && myAppIf.isPowerline != (parseInt(payload.data) == 1)) {
                    myAppIf.isPowerline = parseInt(payload.data) == 1; // value stored in ms.  cp in minutes
                    console.log (`${now.toLocaleString()} - cpPowerline: ${myAppIf.isPowerline}`);
                    setAstroTimes(false);
                }
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

