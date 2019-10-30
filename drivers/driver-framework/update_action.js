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
let ctx, glp;
const moment = require("moment-timezone");
/**
 *
 * This function is called when the create action has been inserted in the 
 * database if it has all the properties and if the same device handle is not 
 * being used by another object or if there was an error in processing the 
 * create request.
 * @param {Error object or the newly created object} error: 
 * If a new create request is sent, the parameter contains the newly 
 * created config object
 * @param {String} topic: Do topic on which the create args are sent
 * @param {String} handle: Device handle
 * @param {String} action: "create" in this case
 * @param {Object} args: args sent with the create request
 * @param {Object or null} item: If it is a duplicate create request, 
 * the old config object is sent else this param contains null
 */

function updateActionCompletor(error, topic, handle, action, args, item) {
    if (!(error instanceof Error)) {
        let configObject = error;
        let configTopic = glp.mqtt.transform(
            topic,
            glp.spec.FEEDBACK_CHANNEL,
            glp.spec.CONFIG_OBJECT
        );
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
exports.updateActionCompletor = updateActionCompletor;