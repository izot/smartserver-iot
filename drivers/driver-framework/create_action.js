/**
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
 * 
 * This file provides functions to handle the create request for a device.
 * This function validates the uniqueness of the unid and maps it with a unique
 * handle to ensure that the create request is for a new device and not a 
 * duplicate. If the create request includes the provision flag, the provision
 * method is called to complete the creation flow.
 * This file also publishes the state "UNPROVISIONED" to the device's feedback
 * status topic and publishes the configuration object to the device's feedback
 * channel which provides information about the created device.
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */
"use strict";
const moment = require("moment-timezone");
let glp;
let ctx;

/**
 *
 * This function validates the create action arguments. 
 * It returns an error object or null.
 * In case of an error, the create action is cleared from the job queue 
 * by calling the clearJobOnError function
 * This function checks for the unid if the provision flag is set to true 
 * in the create args, it returns an error if the unid is not present
 *
 * @param {Object} error
 * @param {String} topic
 * @param {String} handle
 * @param {String} action
 * @param {Object} args
 * @param {Object} item
 * @param {Function} clearJobOnError
 */
function createActionValidator(
    error, 
    topic, 
    handle, 
    action, 
    args, 
    item, 
    clearJobOnError
) {
    if (!error) {
        /**
         * Check if args are present before checking if the flag args.provision 
         * is set
         */
        if (args) {
            if (args.provision) {
                /**
                 * It is mandatory to provide the unid in a create request
                 * which also contains the provision flag set to true
                 */
                if (!args.hasOwnProperty("unid") && !args.unid) {
                    error = new Error(
                        "Invalid create request." + 
                        "Must include unid if provision is set to true"
                    );
                    clearJobOnError();
                }
            }
    
            if (!ctx.checkIfUnidIsUnique(args.unid, handle)) {
                error = new Error(
                    "Unid is not unique for device with handle " + handle
                );
            }
    
            /**
             * User code goes here for verification of a truly 
             * duplicate create request
             */
        }
    }

    if (error) {
        clearJobOnError();
    }
    return error;
}

/**
 * This function is called after the createActionExecutor is called. The create
 * action executor inserts the created object in the sqlite database
 * and returns the newly created object in the error parameter of the
 * createActionCompletor function. If there is an error in processing the create
 * action either because the handle was not unique or the unid was not unique 
 * or due to any such reason, a javascript error object is passed in the error
 * parameter of the createActionCompletor function.
 * 
 * This function is responsible for maintaining a map of unid against the device
 * handle, device handle against the status and initiating the provisioning 
 * action if the provision flag was set to true in the create args.
 * This function also publishes the status object and the config object on the
 * feedback channel
 * @param {Object} error: If a new create 
 * request is sent, the parameter contains the newly created config object
 * @param {String} topic: Do topic on which the create args are sent
 * @param {String} handle: Device handle
 * @param {String} action: "create" in this case
 * @param {Object} args: args sent with the create request
 * @param {Object} item: If it is a duplicate create request, the old 
 * config object is sent else this param contains null
 */

function createActionCompletor(error, topic, handle, action, args, item) {
    let pendingAction = null, duplicate_create = false;
    let unid, type;
    if (!(error instanceof Error)) {
        if (!item) {
            if (args) {
                if (args.hasOwnProperty("unid")) {
                    ctx.mapUnidToDeviceHandle[args.unid] = handle;
                    ctx.mapDeviceHandleToStatus[handle] = glp.spec.STATE_UNPROVISIONED;
                }
            }
        } else {
            if (ctx.mapDeviceHandleToStatus[handle] !== glp.spec.STATE_UNPROVISIONED) {
                duplicate_create = true;
            }
        }

        if (!item && args && args.hasOwnProperty("provision") && args.provision) {
            pendingAction = glp.spec.ACTION_PROVISION;
        } else if (item && ctx.mapDeviceHandleToStatus[handle] === glp.spec.STATE_UNPROVISIONED) {
            pendingAction = glp.spec.ACTION_PROVISION;
        }  

        if (args) {
            unid = args.unid;
            type = args.type;
        }
       
        ctx.publishStatusObject(
            topic,
            handle,
            ctx.mapDeviceHandleToStatus[handle],
            unid,
            type,
            glp.spec.DEVICE_HEALTH_NORMAL,
            pendingAction,
            duplicate_create,
            function (error) {
                if (!error) {
                    if (
                        args && 
                        args.hasOwnProperty(glp.spec.ACTION_PROVISION) && 
                        args.provision
                    ) {
                        ctx.provisionAction(topic, handle, args);
                    }
                } else {
                    glp.log.error(topic, error);
                }
            }
        );

        let configTopic = glp.mqtt.transform(
            topic,
            glp.spec.FEEDBACK_CHANNEL,
            glp.spec.CONFIG_OBJECT
        );

        let configObject = glp.spec.Device_Config_Template;
        configObject.mru = moment().utc().format(ctx.TIME_FORMAT) + "UTC";
        glp.mqtt.publish(
            configTopic,
            JSON.stringify(configObject),
            true,
            1,
            function (error, topic, message) {
                if (error) {
                    glp.log.error(topic, error);
                }
            }
        );

    } else {
        glp.log.error(topic, error);
    }
}

/**
 * This function is called from index.js when all the maps and modules are 
 * initialised
 * @param {Object} context 
 */
function windup(context) {
    glp = context.glp;
    ctx = context;
}

exports.windup = windup;
exports.createActionValidator = createActionValidator;
exports.createActionCompletor = createActionCompletor;