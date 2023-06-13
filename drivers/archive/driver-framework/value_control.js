/**
 * IAP/MQ protocol engine example
 *
 *
 * Copyright (c) 2019 Adesto Technologies
 * License
 * -------
 * Use of the source code contained in this file is subject to the terms of the 
 * Echelon Example Software License Agreement which is available at 
 * www.echelon.com/license/examplesoftware/.
 * IAP/MQ protocol engine example is an abstract code structure written in 
 * Node.js which uses all the IAP/MQ actions required by drivers to support 
 * a custom protocol. 
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

"use strict";
const VALUE_CONTROL_TOPIC = "glp/0/./=control/service";
const eventEmitter = require("events").EventEmitter;
const readyToCallback = new eventEmitter();
let RESPONSE_TOPIC;
let glp, ctx;

/**
 * This function sets the global context
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
    RESPONSE_TOPIC = "glp/0/./=engine/" + ctx.protocol + "/dp/xyz";
}

/**
 * This function is a callback message handler which is responsible for handling 
 * control responses after the datapoint value control service responds to the 
 * driver. This function parses the actual value and the values map from 
 * the response and returns it to the caller using an event emitter
 * @param {Object} error 
 * @param {String} subscription 
 * @param {String} topic 
 * @param {Buffer} message 
 */
function handleValueControlResponse(error, subscription, topic, message) {
    if (!error) {
        try {
            const parsedControlResponse = JSON.parse(message.toString());
            const activeLevel = parsedControlResponse.datapoint.values.level;
            const actualValue = parsedControlResponse.datapoint.values.levels[activeLevel];
            glp.mqtt.deregister(
                RESPONSE_TOPIC, 
                true, 
                function(error) {
                    if (error) {
                        glp.log.error(RESPONSE_TOPIC, error);
                    }
                }
            );
            readyToCallback.emit(
                "ready", 
                actualValue, 
                parsedControlResponse.datapoint.values
            );
        } catch (err) {
            glp.log.error(topic, err);
        }
    } else {
        glp.log.error(topic, error);
    }
}


/**
 * This function is responsible for handling datapoint control requests and 
 * creating a datapoint control request object. This function publishes the 
 * datapoint value control request to the service and registers a callback 
 * for the response. This function then also registers an event emitter to 
 * receive the datapoint value control response and sends it back to the caller
 * @param {String} interfaceTopic 
 * @param {String} datapointTopic 
 * @param {String} datapoint 
 * @param {Object} datapointObject 
 * @param {Function} callback 
 */
function handleValueRequest(
    interfaceTopic, 
    datapointTopic, 
    datapoint, 
    datapointObject, 
    callback
) {
    const controlRequest = {};
    const controlDatapoint = {};
    controlDatapoint.value = datapointObject.value;
    if (datapointObject.hasOwnProperty("values")) {
        controlDatapoint.values = datapointObject.values;
    } 

    if (datapointObject.hasOwnProperty("prio")) {
        controlDatapoint.prio = datapointObject.prio;
    }

    if (datapointObject.hasOwnProperty("active")) {
        controlDatapoint.active = datapointObject.active;
    }

    controlRequest.datapoint = controlDatapoint;
    controlRequest.respond = RESPONSE_TOPIC;

    glp.mqtt.register(
        RESPONSE_TOPIC, 
        null, 
        handleValueControlResponse, 
        true, 
        function(error) {
            if (error) {
                glp.log.error(RESPONSE_TOPIC, error);
            } else {
                glp.mqtt.publish(
                    VALUE_CONTROL_TOPIC, 
                    JSON.stringify(controlRequest), 
                    false, 
                    1, 
                    function(error, topic, message) {
                        if (error) {
                            glp.log.error(topic, error);
                        } else {
                            glp.log.debug(topic, "Published ", message);
                        }
                    }
                );
            }
        }
    );

    readyToCallback.once(
        "ready", 
        function(value, values) {
            callback(value, values);
        }
    );
}

exports.handleValueRequest = handleValueRequest;
exports.windup = windup;