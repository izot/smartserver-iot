const SolarCalc = require('solar-calc');
 
// SolarCalc(date,lat,long)
var solar = new SolarCalc(new Date('Aug 20 2021'),34.15157,-118.64777);
const version = '1.00.001';
console.log(`astroClock.js - version: ${version}`); 
console.log(`Sunrise: ${solar.sunrise.toLocaleTimeString('en-us')}, Sunset: ${solar.sunset.toLocaleTimeString('en-us')}`);
console.log(`Dawn: ${solar.civilDawn.toLocaleTimeString('en-us')}, Dusk: ${solar.civilDusk.toLocaleTimeString('en-us')}`);
