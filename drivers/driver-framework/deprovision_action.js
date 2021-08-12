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
const _ = require("lodash");
let ctx, glp;

/**
 * This function is used to initialize global contexts
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
}

/**
 * 
 * @param {Object or undefined} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} clearJobOnError 
 */
function deprovisionActionValidator(
    error,
    topic,
    handle,
    action,
    args,
    item,
    clearJobOnError
) {
    if (!error) {
        if (!item) {
            error = new Error(
                "Device with handle " + handle + " does not exist"
            );
        } else {
            if (
                ctx.mapDeviceHandleToStatus[handle] &&
                ctx.mapDeviceHandleToStatus[handle] !== "provisioned"
            ) {
                error = new Error(
                    "Cannot deprovision an unprovisioned device"
                );
            }
        }
    }
    if (error) {
        clearJobOnError();
    }
    return error;
}

function deprovisionActionExecutor(topic, handle, action, args, item, onDone) {
    ctx.mapDeviceHandleToStatus[handle] = glp.spec.STATE_UNPROVISIONED;
    handleIfObjects.deregisterFromInterfaceTopics(
        glp.tools.topic_builder(
            topic,
            "if"
        ),
        false
    );

    const statusFeedbackTopic = glp.mqtt.transform(
        topic, 
        glp.spec.FEEDBACK_CHANNEL
    );
    
    glp.mqtt.register(
        glp.tools.topic_builder(
            statusFeedbackTopic,
            glp.spec.STATUS_OBJECT
        ),
        null,
        function (error, subscription, ststopic, message) {
            if (!error) {
                const statusObject = JSON.parse(message.toString());
                glp.mqtt.deregister(
                    ststopic, 
                    true, 
                    function (error) {
                        if (error) {
                            glp.log.error(topic, error);
                        } else {
                            ctx.publishStatusObject(
                                topic,
                                handle,
                                glp.spec.STATE_UNPROVISIONED,
                                statusObject.unid,
                                statusObject.type,
                                statusObject.health,
                                null,
                                false,
                                function (error) {
                                    if (error) {
                                        glp.log.error(topic, error);
                                    }
                                }
                            );
                        }
                    }
                );
            } else {
                glp.log.error(topic, error);
            }

        },
        true
    );

    onDone();
}

function deprovisionActionCompletor(error, topic, handle, action, args, item) {
    if (error) {
        glp.log.error(topic, error);
    }
}

exports.windup = windup;
exports.deprovisionActionValidator = deprovisionActionValidator;
exports.deprovisionActionExecutor = deprovisionActionExecutor;
exports.deprovisionActionCompletor = deprovisionActionCompletor;