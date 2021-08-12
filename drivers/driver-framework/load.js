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
const execSync = require("child_process").execSync;
const mapCorrToLoadRequest = {};
const loadResponseObject = {
    url: "",
    method: "",
    protocol: "",
    type: "",
    flags: "",
    error: ""
};
let glp, ctx;

function windup(context) {
    ctx = context;
    glp = ctx.glp;
}

function loadActionValidator(
    error,
    topic,
    handle,
    action,
    args,
    item,
    clearJobOnError
) {
    if (!error) {
        if (!args) {
            error = new Error(
                "No args provided for the load action for device handle " + 
                handle
            );
        }

        if (!error) {
            if (!args.url) {
                error = new Error(
                    "url is missing for the load action:"
                );
            }
        }

        if (!error) {
            if (!item) {
                error = new Error(
                    "No device with handle " + handle + 
                    " is present to perform action load"
                );
            }
        }
    }

    if (error) {
        clearJobOnError();
    }
    return error;
}

function handleLoadResponse(error, subscription, topic, message) {
    if (!error) {
        try {
            const loaderResponse = JSON.parse(message.toString());
            const loadObject = mapCorrToLoadRequest[loaderResponse.corr];
            const loadResponse = Object.assign({}, loadResponseObject);
            loadResponse.url = loadObject.args.url;
            loadResponse.method = loadObject.args.method;
            loadResponse.protocol = loadObject.args.protocol;
            loadResponse.type = loadObject.args.type;
            loadResponse.flags = loadObject.args.flags;
            loadResponse.error = loaderResponse.error;

            glp.mqtt.deregister(
                topic,
                true,
                function (error) {
                    if (error) {
                        glp.log.error(topic, error);
                    }
                }
            );

            /**
             * User code goes here to handle the load image the way it should be
             */

            if (loaderResponse.error) {
                let logObj = {
                    "cat": "error",
                    "ts": new Date().toISOString(),
                    "language": "en",
                    "message": loaderResponse.error,
                    "source": ctx.protocol,
                    "topic": topic
                };
                glp.mqtt.publish(
                    "glp/0/./=logger/event",
                    JSON.stringify(logObj),
                    false,
                    0,
                    function (error, topic, message) {
                        if (error) {
                            glp.log.error(topic, error);
                        }
                    }
                );
            } else {
                glp.log.info(topic, "Load request handled successfully");
            }

            if (loaderResponse.cleanup) {
                try {
                    execSync(loaderResponse.cleanup);
                } catch (error) {
                    glp.log.error(null, error);
                }
            }

        } catch (error) {
            glp.log.error(topic, error);
        }
    }
}

function loadActionExecutor(topic, handle, action, args, item, onDone) {
    const loaderTopic = glp.tools.topic_builder(
        glp.spec.GLP,
        glp.spec.GLP_PROTOCOL_VERSION,
        ctx.sid,
        glp.spec.REQUEST_CHANNEL,
        "=loader",
        "request"
    );

    const loadObject = {
        args: args, 
        meta: null,
        apply: false, 
        corr: topic, 
        respond: "glp/0/./ev/response/" + handle
    };

    glp.mqtt.register(loadObject.respond, null, handleLoadResponse, true);
    mapCorrToLoadRequest[topic] = loadObject;
    glp.mqtt.publish(
        loaderTopic, 
        JSON.stringify(loadObject), 
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
    onDone();
}

function loadActionCompletor(error, topic, handle, action, args, item) {
    if (!error) {
        glp.log.info(topic, "Load action completed successfully");
    } else {
        glp.log.error(topic, "Load action failed");
    }
}

exports.windup = windup;
exports.loadActionValidator = loadActionValidator;
exports.loadActionExecutor = loadActionExecutor;
exports.loadActionCompletor = loadActionCompletor;