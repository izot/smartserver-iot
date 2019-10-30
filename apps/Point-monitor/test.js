
let nowTs = new Date();
console.log(`${Date.now()/1000} - Start`);

let tmo1 = setTimeout(function (message) {
    console.log (`${Date.now()/1000} - ${message}`);
},2000, "Hellow again 2s later");

let tmo2 = setTimeout(function (message) {
    console.log (`${Date.now()/1000} - ${message}`);
},4000, "Hellow again 4s later");

console.log(`${Date.now()/1000} waiting`);

