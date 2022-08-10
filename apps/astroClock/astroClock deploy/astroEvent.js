'use strict';

const mqtt = require('mqtt');
const sunCalc = require('suncalc');
//const solarCalc = require('solar-calc');
const { execSync } = require('child_process');
const { Console } = require('console');
const { createCipheriv } = require('crypto');
const moment = require('moment-timezone');

let hostIp = '127.0.0.1';
//let hostIp = '192.168.10.204';
let year=1970;
let month=0; // 0 based,  Jan = 0
let day=1
let args = process.argv.slice(2);
let lat = -1.0;
let lng = -1.0;
let zone = '';
let updateCfgTz = false;

if (args.length >= 3) {
    year = parseInt(args[0]);
    month = parseInt(args[1]) - 1;
    day = parseInt(args[2]);
    console.log(`Using: ${(month+1).toString().padStart(2,'0')}/${day.toString().padStart(2,'0')}/${year.toString()}`)
    if(args.length == 6) {
        lat = parseFloat(args[3]);
        lng = parseFloat(args[4]);
        zone = args[5];
        console.log('Blocking reboots and disabling ntp to set the clock');
        execSync('block_reboot',{encoding:'utf-8'});
        execSync(`timedatectl set-timezone ${zone}`,{encoding:'utf-8'});
        execSync('timedatectl set-ntp false',{encoding:'utf-8'});
        execSync(`timedatectl set-time \"${year}-${month+1}-${day} 03:01:00\"`,{encoding:'utf-8'});
        console.log('*** Remember to run: sudo timedatectl set-ntp true and to enable reboots: unblock_reboot ***');
        updateCfgTz=true;
    }

} else if(args.length == 3){
    let nowTs = new Date();
    year = nowTs.getFullYear();
    month = nowTs.getMonth();
    day = nowTs.getDate();1
} else if (args.length != 0) {
    console.log(`astroClock.js requires 0, 3 or 6 parameters: [yyyy mm dd]| yyyy mm dd lat lng {timezone}`);
    process.exit(1);
}

// Code for scheduler service 1.01
let sunriseAngle = -6,
    sunsetAngle = -6;
let sunriseTime = -1,
    sunsetTime = -1;
let glpPrefix='glp/0';  // this will include the sid once determined
const client = mqtt.connect(`mqtt://${hostIp}:1883`);
// Subscribe to the segment ID topic.
const sidTopic = `${glpPrefix}/././sid`;

// From: https://github.com/moment/moment-timezone/issues/314
function getPosixStringForCurrentYear(tz) {
    var jan = moment.tz({month: 0, day: 1}, tz);
    var jun = moment.tz({month: 5, day: 1}, tz);
    var janOffset = jan.utcOffset();
    var junOffset = jun.utcOffset();
    var stdOffset = Math.min(janOffset, junOffset);
    var dltOffset = Math.max(janOffset, junOffset);
    var std = stdOffset === janOffset ? jan : jun;
    var dlt = dltOffset === janOffset ? jan : jun;

    var s = formatAbbreviationForPosix(std).concat(formatOffsetForPosix(stdOffset));

    if (stdOffset !== dltOffset) {
        s = s.concat(formatAbbreviationForPosix(dlt));
        if (dltOffset !== stdOffset + 60) {
            s = s.concat(formatOffsetForPosix(dltOffset));
        }

        s = s.concat(',').concat(formatTransitionForPosix(tz, std));
        s = s.concat(',').concat(formatTransitionForPosix(tz, dlt));
    }

    return s;
}

function formatAbbreviationForPosix(m) {
    var a = m.format('z');
    return /^[\+\-\d]+$/.test(a) ? '<'.concat(a).concat('>') : a;
}

function formatOffsetForPosix(offset) {
    var h = -offset / 60 | 0;
    var m = Math.abs(offset % 60);
    return h + (m === 0 ? '' : ':'.concat(m < 10 ? '0' : '').concat(m));
}

function formatTransitionForPosix(tz, m) {
    var zone = moment.tz.zone(tz);
    var ts = zone.untils[zone._index(m)];
    if (!isFinite(ts)) {
        return "J365/25";
    }
    var transition = moment(ts).utcOffset(-zone.utcOffset(ts - 1));
    var n = ((transition.date() - 1) / 7 | 0) + 1;
    var s = transition.format('[M]M.[n].d').replace('n', n);
    var time = transition.format('[/]H:mm:ss').replace(/\:00$/, '').replace(/\:00$/, '');
    if (time !== '/2') {
        s = s.concat(time);
    }
    return s;
}
client.subscribe(
        sidTopic,
        (error) => {
            if (error) {
                console.log(error);
            }
        }
);
let cfgTopic = '';

function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Seconds TS good enough
    if (typeof(sidMsg) === typeof('xyz')) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            cfgTopic = `${glpPrefix}/fb/cfg`;
            if (args.length <= 3)
                client.subscribe (cfgTopic);
            client.unsubscribe (sidTopic);
        } else {
                console.log(`Redundant SID topic message`);
        }
    } 
}

let times;

sunCalc.addTime(sunriseAngle, "apolloSunrise", "");
sunCalc.addTime(sunsetAngle, "", "apolloSunset");

function setConfigLocation() {
    let PosixTz = getPosixStringForCurrentYear(zone);
    console.log(`Using POSXI tz: ${PosixTz}`);
    let cfg = {
        time:{tz:PosixTz ,zone:zone},
        loc:{desc:'',lat:lat,lng:lng,ele:0}
    };
    console.log(`Setting timezone: ${zone}, Lat: ${lat}, Lng: ${lng}`);
    client.publish(
        `${glpPrefix}/rq/cfg`,
        JSON.stringify(cfg)
    );
}

client.on(
    'message', 
    (topic, message) => {
    try {
        const payload = JSON.parse(message);
        let tsNow = new Date();
        
        if (topic === sidTopic) {
            // Assuming the SID topic is a string payload
            handleSid(payload);
            if (args.length == 6) {
                setConfigLocation();
                client.subscribe(cfgTopic);
            }
        }  
        // Brute force set all outputs to the same heartbeat passed in
        // as the arg[3]s
        if (topic.includes (cfgTopic)) {
            let thisLat = payload.loc.lat;
            let thisLng = payload.loc.lng;
            if (updateCfgTz && (thisLat != lat || thisLng != lng))
                return;
            updateCfgTz = false;    
            let calcTs = new Date();
            if (year != 1970) { 
                calcTs.setFullYear(year,month,day);
            }
            calcTs.setHours(3);
            calcTs.setMinutes(1);
            times = sunCalc.getTimes(calcTs, thisLat, thisLng);
            sunriseTime = times.apolloSunrise.getTime();
            sunsetTime = times.apolloSunset.getTime();
            console.log(`tz: ${payload.time.tz}, zone: ${payload.time.zone}`);
            console.log(`${calcTs.toLocaleDateString()} ${calcTs.toTimeString()} Lat: ${thisLat}, Lng: ${thisLng}`);               
            console.log(`\tCivil Dawn: ${times.apolloSunrise.toLocaleString()} - epoch time: ${sunriseTime}`);         
            console.log(`\tCivil Dusk: ${times.apolloSunset.toLocaleString()} - epoch time: ${sunsetTime}`);  
            //console.log('Solar-calc results');
            // let sc = new solarCalc(calcTs,lat,lng);
            // let civilDawn = new Date(NaN);
            // let civilDusk = new Date(NaN);
            // if (sc.civilDawn.getHours() != sc.civilDusk.getHours() || sc.civilDawn.getMinutes() != sc.civilDusk.getMinutes()) {
            //     civilDawn = sc.civilDawn;
            //     civilDusk = sc.civilDusk;
            // }
            
            // console.log(`\tCivil Dawn: ${civilDawn.toLocaleString()} ${(isNaN(civilDawn.valueOf())) ? `- ${sc.civilDawn.toLocaleString()}`: ''}`);         
            // console.log(`\tCivil Dusk: ${civilDusk.toLocaleString()} ${(isNaN(civilDusk.valueOf())) ? `- ${sc.civilDusk.toLocaleString()}`: ''}`);  

            process.exit(0);    
        }
        
    } catch(error) {
        console.error(`MQTT Message: ${error.stack}`);
    }
}   // onMessage handler
);  // onMessage registration








