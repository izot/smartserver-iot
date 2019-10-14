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
const lit = require("./literals");
const handleIfObjects = require("./handle_interface_objects");
let glp, ctx;

/**
 * This function publishes a provision action on the do topic of a created 
 * device.
 * This function is called only if the provision flag is set to true in the 
 * create device args.
 *
 * @param {String} topic
 * @param {String} handle
 */
function provisionDevice(topic, handle, args) {
    let deviceDoTopic = glp.tools.topic_builder(topic, "do");
    let provisionArgs = {
        "action": "provision",
        "args": args
    };
    glp.mqtt.publish(
        deviceDoTopic,
        JSON.stringify(provisionArgs),
        false,
        2,
        function (error, topic) {
            if (error) {
                glp.log.error(
                    topic,
                    "Provisioning for device ",
                    handle,
                    " failed"
                );
            } else {
                glp.log.debug(
                    topic,
                    "Provisioning initiated for device ",
                    handle
                );
            }
        }
    );
}

/**
 * 
 * This function is a validator which checks if a unid is provided in the 
 * provision action if it wasn't already provided in the create action. 
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} clearJobOnError 
 */
function provisionActionValidator(
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
            // Check for unid
            if (args && args.hasOwnProperty("unid")) {
                if (!args.unid) {
                    error = new Error(
                        "Unid is mandatory for provisioning device" +
                        " with handle " + handle
                    );
                } else {
                    if (!ctx.checkIfUnidIsUnique(args.unid, handle)) {
                        error = new Error(
                            "Unid is not unique for provisioning" +
                            " device with handle " + handle
                        );
                    }
                }
            } else {
                // Check if unid was already present in the map
                if (
                    Object.values(ctx.mapUnidToDeviceHandle) &&
                    !Object.values(ctx.mapUnidToDeviceHandle).includes(handle)
                ) {
                    error = new Error(
                        "Unid is mandatory for provisioning" +
                        " device with handle " +
                        handle
                    );
                }
            }
        }
    }
    if (error) {
        clearJobOnError();
    }
    return error;
}

/**
 * This function is used to publish interface blocks and status objects 
 * for the provisioned device.
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} onDone 
 */
function provisionActionExecutor(topic, handle, action, args, item, onDone) {
    /**
     * Publish the interface blocks related information
     * Publish the state as provisioned
     * This is a dummy block which can be used for reference
     */

    if (ctx.mapDeviceHandleToStatus[handle] !== glp.spec.STATE_PROVISIONED) {
        let deviceInterfaceFbTopic = glp.mqtt.transform(
            topic,
            glp.spec.FEEDBACK_CHANNEL
        );

        const deviceInterfaceRqTopic = glp.tools.topic_builder(
            topic,
            "if"
        );

        deviceInterfaceFbTopic = glp.tools.topic_builder(
            deviceInterfaceFbTopic,
            "if"
        );

        let unid;
        if (args && args.unid) {
            unid = args.unid;
        }

        /**
         * Traverse through all the interface blocks and publish
         * interface blocks on the feedback channel to clear the 
         * retained messages
         */
        for (const interfaceName in lit.deviceInterface) {
            for (const block in lit.deviceInterface[interfaceName]) {
                let interfaceTopic = glp.tools.topic_builder(
                    deviceInterfaceFbTopic,
                    interfaceName,
                    block
                );

                const mru = ctx.moment().utc().format(ctx.TIME_FORMAT) + "UTC";
                const interfaceBlock = lit.deviceInterface[interfaceName][block];
                interfaceBlock.mru = mru;
                glp.mqtt.publish(
                    interfaceTopic,
                    JSON.stringify(interfaceBlock),
                    true,
                    1,
                    function (error, topic) {
                        if (!error) {
                            glp.log.debug(topic, "Published interface block");
                            interfaceTopic = glp.tools.topic_builder(
                                deviceInterfaceRqTopic,
                                interfaceName,
                                block
                            );
                            const datapoint = {};
                            datapoint[interfaceName] = {};
                            datapoint[interfaceName][block] = interfaceBlock;
                            ctx.mapInterfaceTopicToInterfaceObject[
                                interfaceTopic
                            ] = datapoint;
                        } else {
                            glp.log.error(topic, error);
                        }
                    }
                );
            }
        }

        ctx.publishStatusObject(
            topic,
            handle,
            glp.spec.STATE_PROVISIONED,
            unid,
            null,
            glp.spec.DEVICE_HEALTH_NORMAL,
            null,
            null,
            function (error) {
                if (error) {
                    glp.log.error(topic, error);
                } else {
                    glp.log.debug(
                        topic,
                        "Provisioned successfully"
                    );

                }
            }
        );

        /**
         * User code goes here
         * The device can have multiple interface blocks, all interface blocks 
         * should be published here by the protocol engine
         * The device must also publish application metadata here
         * 
         */

        if (args && args.hasOwnProperty("unid")) {
            ctx.mapUnidToDeviceHandle[args.unid] = handle;
            ctx.mapDeviceHandleToStatus[handle] = glp.spec.STATE_PROVISIONED;
        } else {
            if (Object.keys(ctx.mapDeviceHandleToStatus).includes(handle)) {
                ctx.mapDeviceHandleToStatus[handle] = glp.spec.STATE_PROVISIONED;
            }
        }
    }

    onDone();
}


/**
 * This function is called after all the interface blocks and status objects 
 * of a provisioned device are published
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 */
function provisionActionCompletor(error, topic, handle, action, args, item) {
    if (error) {
        glp.log.error(topic, error);
    }

    /**
     * User code to be added here:
     * after all interface blocks are published and the updated status object 
     * is published the protocol engine can subscribe to deep interface block 
     * topics here to accept all monitoring and value control topics
     */
    const deviceInterfaceRqTopic = glp.tools.topic_builder(
        topic,
        "if"
    );

    handleIfObjects.registerToInterfaceObjects(
        deviceInterfaceRqTopic,
        true
    );

    handleIfObjects.registerToInterfaceFeedbackObjects(deviceInterfaceRqTopic);
}

/**
 * This function initializes the global context
 * @param {Object} context 
 */
function windup(context) {
    glp = context.glp;
    ctx = context;
}


exports.windup = windup;
exports.provisionDevice = provisionDevice;
exports.provisionActionValidator = provisionActionValidator;
exports.provisionActionExecutor = provisionActionExecutor;
exports.provisionActionCompletor = provisionActionCompletor;