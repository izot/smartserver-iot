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

const _ = require("lodash");
const handleIfObjects = require("./handle_interface_objects");
const lit = require("./literals");
let glp, ctx;

/**
 * This function validates whether the object exists before deleting 
 * @param {Error object or null} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} clearJobOnError 
 */
function deleteActionValidator(
    error, 
    topic, 
    handle, 
    action, 
    args, 
    item, 
    clearJobOnError
) {
    if (!error) {
        if (!Object.values(ctx.mapUnidToDeviceHandle).includes(handle)) {
            error = "Device with handle " + handle + " does not exist";
        }
    }

    /**
     * User code goes here:
     * If there needs to be any more validation than checking id the device 
     * exists that can be done here.
     */
    if (error) {
        clearJobOnError();
    }
    return error;
}

/**
 * deleteActionCompletor:
 * This function is called by the Object module of the GLP toolkit 
 * after the device is deleted from the database. 
 * This function publishes a deleted state in the status object on the 
 * feedback channel
 * This function also clears the cfg object from the feedback channel 
 * by publishing null
 * @param {Error object or item} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 */
function deleteActionCompletor(error, topic, handle, action, args, item) {
    if (!(error instanceof Error)) {
        if (item) {
            // Clear handle from the map 
            let configTopic = glp.mqtt.transform(
                topic,
                glp.spec.FEEDBACK_CHANNEL,
                glp.spec.CONFIG_OBJECT
            );

            ctx.publishStatusObject(
                topic,
                handle,
                glp.spec.STATE_DELETED,
                null,
                null,
                null,
                null,
                null,
                function (error) {
                    if (!error) {
                        _.forEach(
                            ctx.mapUnidToDeviceHandle, 
                            function (value, key) {
                                if (value === handle) {
                                    delete ctx.mapUnidToDeviceHandle[key];
                                }
                            }
                        );
                        delete ctx.mapDeviceHandleToStatus[handle];
                        glp.log.info(topic, "Deleted device");
                    }
                }
            );

            glp.mqtt.publish(
                configTopic,
                null,
                true,
                1,
                function (error, topic, message) {
                    if (!error) {} else {
                        glp.log.error(topic, error);
                    }
                }
            );

            const deviceInterfaceRqTopic = glp.tools.topic_builder(
                topic,
                "if"
            );

            let deviceInterfaceFbTopic = glp.mqtt.transform(
                topic,
                glp.spec.FEEDBACK_CHANNEL
            );

            deviceInterfaceFbTopic = glp.tools.topic_builder(
                deviceInterfaceFbTopic,
                "if"
            );

            /**
             * Traverse through all the interface blocks and publish
             * null on the feedback channel to clear the retained messages
             */
            for (const interfaceName in lit.deviceInterface) {
                for (const block in lit.deviceInterface[interfaceName]) {
                    let interfaceTopic = glp.tools.topic_builder(
                        deviceInterfaceFbTopic,
                        interfaceName,
                        block
                    );

                    glp.mqtt.publish(
                        interfaceTopic,
                        null,
                        true,
                        1,
                        function (error, topic, message) {
                            if (!error) {} else {
                                glp.log.error(topic, error);
                            }
                        }
                    );
                }
            }
            
            /**
             * User code goes here to unsubscribe from all 
             * interface deep topics related to the deleted device
             */

            handleIfObjects.deregisterFromInterfaceTopics(
                deviceInterfaceRqTopic,
                true
            );
        }

    } else {
        glp.log.error(topic, error);
    }
}

function windup(context) {
    glp = context.glp;
    ctx = context;
}


exports.windup = windup;
exports.deleteActionValidator = deleteActionValidator;
exports.deleteActionCompletor = deleteActionCompletor;