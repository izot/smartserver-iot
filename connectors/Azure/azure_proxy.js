//
// SmartServer IoT / MS Azure IoT Hub Interface Example
// J. Bradshaw  - Adesto Technologies 2019-09-09
//

'use strict';

var uuid = require('uuid');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// var Protocol = require('azure-iot-device-amqp').AmqpWs;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
var AzureClient = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var mqtt = require('mqtt');

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"

// TODO: Populate connectionString with your Azure IoT Hub & Device credentials string.
// In Node.js you can use the environment variable in launch.json and uncomment the first line.  
// When running on the SmartServer itself, populate the connectionString directly and instead
// uncomment the second line

//var connectionString = process.env.DEVICE_CONNECTION_STRING;    // Node.js - launch.json
//var connectionString = 'HostName=SmartServerIoTHub.azure-devices.net;DeviceId=xxx;SharedAccessKey=xxx=';    // SmartServer

if (!connectionString) {
  console.log('Please set the DEVICE_CONNECTION_STRING');
  process.exit(-1);
}

/* environ - returns the value of a named environment variable, */
/* if it exists, otherwise it returns the default value.        */

function environ(variable, defaultValue) {
  return process.env.hasOwnProperty(variable) ?
      process.env[variable] : defaultValue;
}

// fromConnectionString must specify a transport constructor, coming from any transport package.

var azureclient = AzureClient.fromConnectionString(connectionString, Protocol);

//
// Get date and time
//

function getDateTime() {
  var date = new Date();
  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;
  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;
  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  var day  = date.getDate();
  day = (day < 10 ? "0" : "") + day;
  return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

//
// Get date and time (ISO 8601 format) for publishing to Azure
//

function getISODateTime() {
  var date = new Date();
return date.toISOString().replace('Z', '+0000');
}

//
// SmartServer message broker address and subscription topic
// Port 1883 needs to be open on the SmartServer - use "sudo ufw allow 1883"
//

var apollo_topic = 'glp/0/+/ev/data';   // Catch all event channel topic, will need filtering for datapoints of interest

// TODO: Modify this table of data point names, values, & units based on the data points you want to 
// capture from the SmartServer IoT MQTT messaage broker and forward on to the Azure IoT Hub.  In order 
// for data points to be published & picked up, their polling rates must be set in the CMS' data point browser

var datapoints = {
  nvoLuxLevel:    { name: "nvoLuxLevel",    value: "data.data",           units: "Lux" },
  nvoHVACTemp:   { name: "nvoHVACTemp",   value: "data.data",           units: "C" },
  nvoEPpos:    { name: "nvoEPpos",    value: "data.data",           units: "kWh" },
  nvoPowerF:    { name: "nvoPowerF",    value: "data.data",           units: "W" },
                    };


/* Create a connection to the Microsoft Azure IoT Hub using our device's  */
/* credentials found in the connectionString                              */

azureclient.open(function (err) {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else  {
    console.log('Azure IoT Hub connected');

    azureclient.on('error', function (err) {
      console.error(err.message);
      process.exit(-1);
    });

    //
    // Establish a connection with the SmartServer MQTT message broker
    //

    var SSIoTclient = mqtt.connect('mqtt://' + environ('DEV_TARGET', '127.0.0.1') + ':1883');

    SSIoTclient.on('error', function (argument) {
      console.log(getDateTime() +": " + argument); // Could not connect to the SmartServer
    });
  
    SSIoTclient.on('connect', function () {

      console.log(getDateTime() +": " + "SmartServer MQTT broker connected"); // Connected to the SmartServer
  
      SSIoTclient.subscribe(apollo_topic);                         // Subscribe to the event channel
  
      // Capture SmartServer IoT MQTT messages related to this topic and 
      // format and forward them to Microsoft Azure as necessary

      SSIoTclient.on('message', function (topic, message) {

        //
        // incoming message from SmartServer is in buffer
        //
      
        var data = JSON.parse(message); // Parse incoming message
        console.log(getDateTime() +": " + "Message from datapoint " + data.message + " received"); 
        //
        // Process datapoints as they come in...
        // Everything from the "apollo_topic" will arrive, 
        // so each message needs to be checked to see if it is of interest
        //
        var payload; // Payload to send to Azure
        var name;    // used to index into datapoints

        //
        // For the purposes of this example we are assuming that all datapoints are unique as defined only by data.message
        // which may not be the case, validation should be further refined based on the expected data.topic and data.message
        // for example: glp/0/17q2d7a/fb/dev/iox.411dee/meter/if/phase/1 and nvoVoltageRms
        //                                                
        for (var i in datapoints) { // Run though datapoints to see if this is a known datapoint (as defined by data.message) from the SmartServer
          if (data.message) {
            if (data.message.indexOf(datapoints[i].name) == 0) { 
              //
              // We have a match, so build up the MS Azure payload
              //

              // any type of data can be sent into a message: bytes, JSON...but the SDK will not take care of the serialization of objects.

              var message = new Message(JSON.stringify({
                timestamp: getISODateTime(),
                name: datapoints[i].name,
                value: eval(datapoints[i].value),
                units: datapoints[i].units
                }));
  
              // A message can have custom properties that are also encoded and can be used for routing
              //message.properties.add('propertyName', 'propertyValue');

              // A unique identifier can be set to easily track the message in your application
              
              message.messageId = uuid.v4();

              console.log('Sending message: ' + message.getData());

              azureclient.sendEvent(message, function (err) {
                if (err) {
                  console.error('Could not send: ' + err.toString());
                  //process.exit(-1);
                } else {
                  console.log('Message sent: ' + message.messageId);
                  //process.exit(0);
                }
              })//;       // For now, only process 
              break;      // one message per pass

            }
          }
        }
      });
    });
  }
});


