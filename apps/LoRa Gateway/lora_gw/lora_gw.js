/*
 * Example SmartServer IoT Internal LON Device with LoRa support
 *
 * The LON interface uses a UFPTLoRaGateway which defines 4 output NV of differing types as indicated below.  
 * The type files are in the github repository.
 * In addition to the topics required for the LON device, the application subscribes to the application/+/# MQTT topic 
 * which is published by the ChirpStack Application Server installed on the SmartServer IoT.
 * Incoming messages are filtered by topic and message content, with selective data being published to local copies of the output NVs of myAppIf
 * The LON datapoint updates can be mapped to BACnet datapoints using the example lora.btm file supplied in the github repository
 * This application works with Netvox R712 and Elsys ERS CO2 sensors which can be purchased from alliot.co.uk along
 * with a suitable gateway.
 * The ChirpStack device profile codecs are supplied in the github repository.
 */

"use strict";
const mqtt = require("mqtt");

// Add or change DP references here for other LoRa configurations
/*   UFPTLoRaGateway:  
    "LoRaGateway/0/nvoCO2"       SNVT_ppm_f
    "LoRaGateway/0/nvoLux"       SNVT_lux
    "LoRaGateway/0/nvoRH"        SNVT_lev_cont_f
    "LoRaGateway/0/nvoTemp"      SNVT_temp_p
*/

// The device interface
// Add or change DP references here for other LoRa configurations
let myAppIf = {
    myAppPID : "9000010A0A048500",    // This must match the PID for the XIF which defines this application
    myFbName : "LoRaGateway",         // This must match the FB name in the XIF which define this application
    myDeviceHandle : "LoRaGateway",   // Must not already exist on your target SmartServer 
    nvoCO2 : 0,                       // SNVT_ppm_f
    nvoLux : 0,                       // SNVT_lux
    nvoRH : 0,                        // SNVT_lev_cont_f
    nvoTemp : 0,                      // SNVT_temp_p
    initialized : false,
    startup : true
};

let glpPrefix="glp/0";                // this will include the sid once determined
let subscribtionsActive = false;
let myAppTimer;

// LoRa Topics
// Add or change topic references here for other LoRa configurations
let lora_application_topic = 'application/+/#';   // Catch all application topic
let lora_app_id = 2; // Application #2
let lora_deveui_1 = "00137a100000d1c1"; // Device DEVEUI 00137a100000c425 R712 Temp & RH
let lora_deveui_2 = "a81758fffe04ab14"; // Device DEVEUI a81758fffe04ab14 ERS CO2 & Illuminance
let lora_up_topic_1 = "application/" + lora_app_id + "/device/" + lora_deveui_1 + "/event/up"; // Specific uplink message from sensor #1
let lora_up_topic_2 = "application/" + lora_app_id + "/device/" + lora_deveui_2 + "/event/up"; // Specific uplink message from sensor #2

function initializeInputs (interfaceObj) {
    // This function must not be called before the MQTT connection to the SmartServer has be established, 
    // and the Internal device has been created and provision by IAP/MQ
    clearTimeout (myDevCreateTmo); // Cancel the auto internal device create

    const pointDriverProps = {
        rate: 10,                     // Set monitor rate to non-zero value so that just in case DLA file is not loaded that BACnet will work
        "lon.cfg" : {
            propagationHeartbeat: 180,
            propagationThrottle: 0,
            maxRcvTime: 0,
            propagationThreshold: 5
        }
    };

    // The following Interval timer is where output datapoints are updated
    myAppTimer = setInterval(updateDPs, 10000); // 10000ms in the first instance to allow for initialisation

    // The lon driver specific properties are set here for the points nvoCO2, nvoLux, nvoRH, nvoTemp
    // Add or change DP references here for other LoRa configurations
    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoCO2/monitor`,
        JSON.stringify(pointDriverProps),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoCO2");
        }
    );

   

    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoLux/monitor`,
        JSON.stringify(pointDriverProps),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoLux");
        }
    );

    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoRH/monitor`,
        JSON.stringify(pointDriverProps),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoRH");
        }
    );

    client.publish (
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoTemp/monitor`,
        JSON.stringify(pointDriverProps),
        {qos:1},
        (err) => {
            if(err !=null)
                console.error ("Failed to set lon.cfg for nvoTemp");
        }
    );
    
    // Initial output variable is set for nvoCO2, nvoLux, nvoRH, nvoTemp
    // nvoCO2
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoCO2/value`,
        JSON.stringify(myAppIf.nvoCO2)
    )

    // nvoLux
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoLux/value`,
        JSON.stringify(myAppIf.nvoLux)
    )
    
    // nvoRH
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoRH/value`,
        JSON.stringify(myAppIf.nvoRH)
    )

    // nvoTemp
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0/nvoTemp/value`,
        JSON.stringify(myAppIf.nvoTemp)
    )
}    

// environ returns the value of a named environment variable, if it exists, 
// or returns the default value otherwise.
function environ(variable, defaultValue) {
    return process.env.hasOwnProperty(variable) ?
        process.env[variable] : defaultValue;
}

// Connect to the SmartServer broker
const client = mqtt.connect(`mqtt://${environ("DEV_TARGET", "127.0.0.1")}:1883`);

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
    console.log("Creating the internal device for this applicaton");
    let creatMyAppMsg = {
        action: "create",
        args: {
            unid: "auto",
            type: myAppIf.myAppPID,
            "lon.attach": "local"
        }
    } // CreateMyAppMsg {}
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/do`,
        JSON.stringify(creatMyAppMsg)
        )
    },  // IAP/MQ do {action: "create"} 
    10000
); //10s timeout to determine if the Internal device exists


function handleSid (sidMsg) {
    // Assuming the SID topic is a string sidMsg
    let nowTs = new Date(); // Get current time stamp
    if (typeof(sidMsg) === typeof("xyz")) {
        if (sidMsg.length > 0) {
            glpPrefix += `/${sidMsg}`;
            console.log(`${nowTs.toISOString()} - SmartServer SID: ${sidMsg}`);
            // Note how the "+" wild card is used to monitor device status for 
            // any lon device.  Note, once we know the SID, we need to avoid
            // adding multiple listeners.  Subscbribe once and only once              
            if (!subscribtionsActive) { 
                // The following fb topic will capture the fact that the internal lon device has been created/provisioned
                client.subscribe (`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/#`);
                // NVs and CP updates appear on this event channel
                client.subscribe (`${glpPrefix}/ev/updated/dev/lon/type/${myAppIf.myAppPID}`);
                // This IAP/MQ topic reports the status of all devices on the lon channel                      
                client.subscribe (`${glpPrefix}/fb/dev/lon/+/sts`);
                // Unsubscribe from SID topic
                client.unsubscribe (sidTopic);
                subscribtionsActive = true;
            } else {
                console.log(`${nowTs.toISOString()} - Redundant SID topic message`);
            }
        } else {
            // We are not provisioned.
                sid = undefined;
                cosole.log(`${nowTs.toISOString()} - [${s}] Problem with SID payload.`);
        }
    } else {
        console.error(nowTs.toISOString()  + ' - The sid topic returned an unexpected payload type.')
    }
}

// IAP/MQ & LoRa MQTT message handler. 
client.on(
    "message", 
    (topic, message) => {
        try {
            const payload = JSON.parse(message);
            let devHandle;  
            let nowTs = new Date(); // Get current time stamp
        
            if (topic === sidTopic) {
                // Assuming the SID topic is a string payload
                handleSid(payload); 
            }  

            // This topic applies to only one device in the system, this internal device
            if (topic.endsWith(`${myAppIf.myDeviceHandle}/if/${myAppIf.myFbName}/0`)) {
                // Note - The payload is null when the device is in the deleted state
                if (payload == null)
                    return;
                //     
                if (!myAppIf.initialized) {  
                    client.unsubscribe(`${glpPrefix}/fb/dev/lon/${myAppIf.myDeviceHandle}/if/#`); 
                    initializeInputs(payload);
                    myAppIf.initialized = true;
                    client.subscribe(
                        lora_application_topic,
                        (error) => {
                            if (error) {
                                console.log(error);
                            }
                        }
                    );
                    console.log(nowTs.toISOString() + " - LoRaGateway internal device interface is ready");
                }
            }

            // Add or change topic and DP references here for other LoRa configurations
            if (topic == lora_up_topic_1) {
                // This traps uplink messages from application 2 and the device with DEVEUI of 00137a100000c425
                // Netvox R712
                console.log(nowTs.toISOString() + " - Message from topic " + lora_up_topic_1 + " received");
                myAppIf.nvoRH  = payload.object.Humidity;
                myAppIf.nvoTemp = payload.object.Temperature;
                console.log(nowTs.toISOString()  + " - Temperature = " + myAppIf.nvoTemp + " °C");
                console.log(nowTs.toISOString()  + " - Humidity = " + myAppIf.nvoRH + " %");
            }

            if (topic == lora_up_topic_2) {
                // This traps uplink messages from application 2 and the device with DEVEUI of a81758fffe04ab14
                // Elsys ERS CO2
                console.log(nowTs.toISOString() + " - Message from topic " + lora_up_topic_2 + " received");
                myAppIf.nvoCO2  = payload.object.co2;
                myAppIf.nvoLux = payload.object.light;
                console.log(nowTs.toISOString() + " - CO2 = " + myAppIf.nvoCO2 + " ppm");
                console.log(nowTs.toISOString() + " - Illuminance = " + myAppIf.nvoLux + " Lux");
            }

        } catch(error) {
        console.error(nowTs.toISOString()  + " - MQTT Message: " + error);
        }
    }   
);  


function updateDPs() {

    //let nowTs = new Date(); // Seconds TS good enough
    if (myAppIf.startup) {
        clearInterval (myAppTimer);
        // Setup regular interval to call this function
        myAppTimer = setInterval(updateDPs, 10000); // 10s
        myAppIf.startup = false;
    }

    // Publish updates to the output DPs each time the timer expires
    // Add or change DP references here for other LoRa configurations
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/LoRaGateway/0/nvoCO2/value`,
        JSON.stringify(myAppIf.nvoCO2)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/LoRaGateway/0/nvoLux/value`,
        JSON.stringify(myAppIf.nvoLux)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/LoRaGateway/0/nvoRH/value`,
        JSON.stringify(myAppIf.nvoRH)
    );
    client.publish(
        `${glpPrefix}/rq/dev/lon/${myAppIf.myDeviceHandle}/if/LoRaGateway/0/nvoTemp/value`,
        JSON.stringify(myAppIf.nvoTemp)
    );
}



