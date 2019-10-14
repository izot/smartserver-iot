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
let glp, ctx;
let DATAPOINT_GET_TOPIC;

/**
 * This function is used to assign the global context when the module starts
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
    DATAPOINT_GET_TOPIC = "glp/0/./=engine/" + ctx.protocol + "/rq/poll/#";
}

/**
 * 
 * @param {Error or undefined} error 
 * @param {String} subscription Wildcard subscription glp/0/./=engine/P/rq/poll/#
 * @param {String} topic Specific topic requesting for a datapoint e.g.
 * glp/0/./=engine/modbus/rq/poll/dev/modbus/amik1/if/block/1/Volts_1
 * @param {Buffer} message String buffer which contains the datapoint get request
 */
function handleDatapointGetRequests(error, subscription, topic, message) {
    if (!error) {
        const requestObject = JSON.parse(message.toString());
        const extractedGetTopic = glp.mqtt.extract(subscription, topic)[0];
        const datapointTopic = "glp/0/" + ctx.sid + "/rq/" + extractedGetTopic;
        const splitDatapointTopic = datapointTopic.split("/");
        const datapoint = splitDatapointTopic.splice(10)[0];
        const interfaceTopic = splitDatapointTopic.join("/");
        let value;
        if (ctx.mapDatapointTopicToDatapointObject[interfaceTopic]) {
            if (ctx.mapDatapointTopicToDatapointObject[interfaceTopic][datapoint]) {
                value = ctx.mapDatapointTopicToDatapointObject[interfaceTopic][datapoint].value;
            }
        }
        if (value === undefined || value === null) {
            error = "Value for datapoint " + datapoint + " not found";
        }

        let response = {
            corr: requestObject.corr
        };

        if (error) {
            response.error = error;
        } else {
            response.value = value;
        }

        glp.mqtt.publish(
            requestObject.respond, 
            JSON.stringify(response), 
            false, 
            1, 
            function (error, topic, message) {
                if (error) {
                    glp.log.error(topic, error);
                } else {
                    glp.log.debug(topic, "Published ", message);
                }
            }
        );

    } else {
        glp.log.error(topic, error);
    }
}

/**
 * This function subscribes to the topic glp/0/./=engine/P/rq/poll/# 
 * and registers a callback to handle datapoint get requests
 * This function returns undefined
 */
function registerForDatapointGetRequests() {
    glp.mqtt.register(
        DATAPOINT_GET_TOPIC,
        null,
        handleDatapointGetRequests,
        true,
        function (error) {
            if (error) {
                glp.log.error(DATAPOINT_GET_TOPIC, error);
            }
        }
    );
}

exports.windup = windup;
exports.registerForDatapointGetRequests = registerForDatapointGetRequests;