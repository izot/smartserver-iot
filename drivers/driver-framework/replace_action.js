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
let glp, ctx;

function windup(context) {
    ctx = context;
    glp = context.glp;
}

/**
 * This function validates the replace action request. It retuns an error
 * if the replace action is requested for a device which does not exist or 
 * if the unid is not provided in the replace action or if the unid is mapped 
 * to some other device.
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} clearJobOnError 
 */
function replaceActionValidator(
    error,
    topic,
    handle,
    action,
    args,
    item,
    clearJobOnError
) {
    if (!error) {
        // There is no device with this handle to be replaced
        if (!item) {
            error = new Error("Device with handle " +
                handle +
                " does not exist for replacement");
        }

        if (!error) {
            // Check if unid is provided to replace with
            if (!args) {
                error = new Error("Unid is mandatory for replace requests " +
                    "for device with handle " + handle);
            } else if (!args.unid) {
                error = new Error("Unid is mandatory for replace requests " +
                    "for device with handle " + handle);
            }

            // Check if unid already exists with another device
            if (!error) {
                if (ctx.mapUnidToDeviceHandle[args.unid]) {
                    error = new Error("Unid " + args.unid +
                        " already exists for a different device");
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
 * This function replaces the unid provided by the replace action request 
 * and assigns it to the old device.
 * This function returns undefined
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} onDone 
 */
function replaceActionExecutor(topic, handle, action, args, item, onDone) {
    for (const each in ctx.mapUnidToDeviceHandle) {
        if (ctx.mapUnidToDeviceHandle[each] === handle) {
            delete ctx.mapUnidToDeviceHandle[each];
            ctx.mapUnidToDeviceHandle[args.unid] = handle;
            break;
        }
    }
    onDone();
}

/**
 * This function publishes the status object to the sts endpoint on the feedback
 * channel to notify the recently updated unid.
 * This function returns undefined.
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 */
function replaceActionCompletor(error, topic, handle, action, args, item) {
    if (!error) {
        ctx.publishStatusObject(
            topic,
            handle,
            ctx.mapDeviceHandleToStatus[handle],
            args.unid,
            null,
            ctx.mapDeviceHandleToStatusObject[handle].health,
            null,
            false,
            function(error, topic, message) {
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

exports.windup = windup;
exports.replaceActionValidator = replaceActionValidator;
exports.replaceActionExecutor = replaceActionExecutor;
exports.replaceActionCompletor = replaceActionCompletor;