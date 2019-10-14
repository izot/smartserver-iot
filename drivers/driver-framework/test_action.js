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

let ctx, glp;
/**
 * This function is used to set the global context
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
}

/**
 * This function validates the test action request and generates an error if the
 * test action is requested for a device which does not exist.
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} clearJobOnError 
 */
function testActionValidator(error,
    topic,
    handle,
    action,
    args,
    item,
    clearJobOnError) {
    if (!error) {
        if (!item) {
            error = new Error(
                "Device with handle " + handle + " does not exist"
            );
        }
    }

    if (error) {
        clearJobOnError();
    }
    return error;
}

/**
 * This function is responsible for publishing the status object of the device
 * for which the test action is requested. 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 * @param {Function} onDone 
 */
function testActionExecutor(topic, handle, action, args, item, onDone) {
    const statusTopic = glp.tools.topic_builder(
        glp.mqtt.transform(
            topic,
            glp.spec.FEEDBACK_CHANNEL
        ),
        glp.spec.STATUS_OBJECT
    );

    ctx.mapDeviceHandleToStatusObject[handle].mru = ctx.moment().utc().format(
        ctx.TIME_FORMAT
    ) + "UTC";

    glp.mqtt.publish(
        statusTopic,
        JSON.stringify(ctx.mapDeviceHandleToStatusObject[handle]),
        true,
        1,
        function (error, topic) {
            if (error) {
                glp.log.error(topic, error);
            }
            onDone();
        }
    );
}

/**
 * This function is responsible for generating an error when the test action
 * is not completed.
 * @param {Object} error 
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} action 
 * @param {Object} args 
 * @param {Object} item 
 */
function testActionCompletor(error, topic, handle, action, args, item) {
    if (error) {
        glp.log.error(topic, error);
    }
}

exports.windup = windup;
exports.testActionValidator = testActionValidator;
exports.testActionExecutor = testActionExecutor;
exports.testActionCompletor = testActionCompletor;