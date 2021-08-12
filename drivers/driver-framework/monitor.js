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
const handleIfObjects = require("./handle_interface_objects");
let ctx, glp;

function windup(context) {
    ctx = context;
    glp = context.glp;
}

/**
 * This function is used to set monitoring rates based on the String passed 
 * This function publishes monitoring objects at the monitor rate
 * @param {String} topic 
 * @param {String} monitorRate 
 */
function setMonitoringRateForDatapoint(topic, interfaceTopic, monitorRate) {
    if (monitorRate === "slow") {
        monitorRate = 60;
    } else if (monitorRate === "fast") {
        monitorRate = 1;
    } else if (monitorRate === "normal") {
        monitorRate = 10;
    } else {
        monitorRate = Number(monitorRate);
    }

    glp.log.debug(topic, "Setting monitoring rate ", monitorRate);

    if (ctx.mapDatapointTopicToTimers[topic]) {
        clearInterval(ctx.mapDatapointTopicToTimers[topic]);
        delete ctx.mapDatapointTopicToTimers[topic];
    }

    ctx.mapDatapointTopicToTimers[topic] = setInterval(
        function () {
            handleIfObjects.publishMonitoringRequest(topic, interfaceTopic);
        },
        monitorRate * 1000
    );
}

/**
 * This function is responsible for creating a monitoring object and starting 
 * monitoring of points whose rates are greater than 0 and deleting points whose
 * rates are null, none or 0
 * This function returns undefined
 * @param {String} interfaceTopic 
 * @param {String} datapointTopic 
 * @param {String} datapoint 
 * @param {Object} datapointObject 
 */
function handleMonitoringEvent(
    interfaceTopic, 
    datapointTopic, 
    datapoint, 
    datapointObject
) {
    const monitorObject = {
        topic: glp.mqtt.transform(
            interfaceTopic,
            glp.spec.FEEDBACK_CHANNEL
        ),
        datapoint: datapoint + "/value",
        monitor: datapointObject.monitor,
        value: datapointObject.value
    };
    
    if (
        monitorObject.monitor.rate !== null &&
        monitorObject.monitor.rate !== "none" &&
        monitorObject.monitor.rate !== "0" &&
        monitorObject.monitor.rate !== 0
    ) {
        ctx.mapDatapointTopicToMonitoringObject[datapointTopic] = monitorObject;
        setMonitoringRateForDatapoint(
            datapointTopic, 
            interfaceTopic, 
            monitorObject.monitor.rate
        );
    } else {
        if (ctx.mapDatapointTopicToTimers[datapointTopic]) {
            glp.log.debug(datapointTopic, "Cleared interval");
            clearInterval(ctx.mapDatapointTopicToTimers[datapointTopic]);
            delete ctx.mapDatapointTopicToTimers[datapointTopic];
        }
    }
}

exports.windup = windup;
exports.handleMonitoringEvent = handleMonitoringEvent;
