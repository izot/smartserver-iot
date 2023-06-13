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
const monitor = require("./monitor");
const control = require("./value_control");
const connection = require("./connection");
const _ = require("lodash");
let ctx, glp;
// const deviceInterface = lit.deviceInterface;
const MONITORING_TOPIC = "glp/0/./=monitoring/service";
const VALUE_PROPERTY = "value";

/**
 * This function sets the global context 
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
}

/**
 * This function returns true if the parameter passed is an object 
 * @param {Any} a 
 */
function isObject(a) {
    return (!!a) && (a.constructor === Object);
}

/**
 * This function publishes the monitoring object and also publishes the 
 * interface object on the feedback channel if the inFeedback is set to True
 * 
 * @param {String} topic: request topic of the form 
 * glp/0/SID/rq/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE
 */
function publishMonitoringRequest(topic, interfaceTopic) {
    glp.log.debug(
        topic,
        "Publishing monitoring object: ",
        JSON.stringify(ctx.mapDatapointTopicToMonitoringObject[topic])
    );

    glp.mqtt.publish(
        MONITORING_TOPIC,
        JSON.stringify(ctx.mapDatapointTopicToMonitoringObject[topic]),
        false,
        1,
        function (error, monitoringTopic) {
            if (error) {
                glp.log.error(monitoringTopic, error);
            } else {
                if (
                    ctx.mapDatapointTopicToMonitoringObject[topic].monitor.inFeedback
                ) {
                    publishInterfaceBlock(
                        interfaceTopic,
                        ctx.mapDatapointTopicToDatapointObject[interfaceTopic]
                    );
                }
            }
        }
    );
}

/**
 * This function publishes the interface block with retain true and qos: 1 on 
 * the feedback channel where the topic is 
 * glp/0/SID/fb/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE 
 * @param {String} interfaceTopic: Request channel topic of the type 
 * glp/0/SID/rq/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE
 * @param {Object} interfaceBlock: The entire interface block which needs to 
 * be published on the interfaceTopic 
 * 
 */
function publishInterfaceBlock(interfaceTopic, interfaceBlock) {
    const mru = ctx.moment().utc().format(ctx.TIME_FORMAT) + "UTC";
    interfaceBlock.mru = mru;
    interfaceTopic = glp.mqtt.transform(
        interfaceTopic,
        glp.spec.FEEDBACK_CHANNEL
    );

    connection.checkForConnections(interfaceTopic, interfaceBlock);
    
    glp.mqtt.publish(
        interfaceTopic,
        JSON.stringify(interfaceBlock),
        true,
        1,
        function (error, topic, message) {
            if (error) {
                glp.log.error(topic, error);
            } else {
                glp.log.debug(topic, "Published ", message);
            }
        }
    );
}

/**
 * This function traverses through all the datapoint objects and checks for
 * monitoring objects. If the datapoint objects have a monitor object, 
 * the monitor objects are restored
 * @param {String} topic: request topic of the form 
 * glp/0/SID/rq/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE
 */
function restoreMonitoringForAllInterfaceBlocks(topic) {
    /**
     * Parse through all the datapoint objects and then set monitor
     * timers
     */
    _.forEach(
        ctx.mapDatapointTopicToDatapointObject,
        function (parsedInterfaceBlock, key) {
            _.forEach(
                parsedInterfaceBlock,
                function (value, key) {
                    if (isObject(value)) {
                        /**
                         * Check if value is an object & if it has a key 
                         * called monitor
                         */
                        if (
                            value.hasOwnProperty(
                                glp.spec.OBJECT_TYPE_MONITOR
                            )
                        ) {
                            /**
                             * Handle monitoring if the key 
                             * exists
                             */
                            const datapointTopic = glp.tools.topic_builder(
                                topic,
                                key
                            );
                            monitor.handleMonitoringEvent(
                                topic,
                                datapointTopic,
                                key,
                                parsedInterfaceBlock[key]
                            );
                        }
                    }
                }
            );
        }
    );
}

/**
 * This function restores all the intervals for datapoints whose monitoring 
 * rate is greater than 0 or not null or not none
 * @param {Error object or undefined} error 
 * @param {String} subscription: Feedback topic glp/0/SID/fb/dev/P/H/if/# 
 * @param {String} topic: Feedback interface topic without wildcards 
 * glp/0/SID/fb/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE 
 * @param {Buffer} message: Message buffer which contains the interface block 
 */
function restoreMonitoring(error, subscription, topic, message) {
    if (!error) {
        let parsedInterfaceBlock;
        try {
            parsedInterfaceBlock = JSON.parse(message.toString());
            const interfaceTopic = glp.mqtt.transform(
                topic,
                glp.spec.REQUEST_CHANNEL
            );
            const extractedInterface = glp.mqtt.extract(subscription, topic)[0];
            const splitExtractedInterface = extractedInterface.split("/");

            // The first element in the wildcard elements is always the block name 
            const blockName = splitExtractedInterface[0];
            // The second element in the wildcard elements is always the block handle
            const blockHandle = splitExtractedInterface[1];

            const datapoint = {};
            datapoint[blockName] = {};
            datapoint[blockName][blockHandle] = parsedInterfaceBlock;
            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic] = datapoint;
        } catch (err) {
            error = err;
            glp.log.error(topic, error);
        }

        if (!error) {
            delete parsedInterfaceBlock.mru;
            topic = glp.mqtt.transform(
                topic,
                glp.spec.REQUEST_CHANNEL
            );
            ctx.mapDatapointTopicToDatapointObject[topic] = parsedInterfaceBlock;

            /**
             * Wait for 5 seconds to restore all the interface blocks and then
             * start restoring monitoring
             */
            setTimeout(
                function () {
                    glp.mqtt.deregister(
                        subscription,
                        true,
                        function (error) {
                            if (!error) {
                                restoreMonitoringForAllInterfaceBlocks(topic);
                            }
                        }
                    );
                },
                5000
            );
        }

    } else {
        glp.log.error(topic, error);
    }
}

/**
 * This function registers to the interface topic with wildcards to restore
 * interface objects and restart monitoring
 * @param {String} rqTopic: Request channel which is of the  
 */
function registerToInterfaceFeedbackObjects(rqTopic) {
    const interfaceTopic = glp.tools.topic_builder(
        glp.mqtt.transform(
            rqTopic,
            glp.spec.FEEDBACK_CHANNEL
        ),
        "#"
    );
    glp.mqtt.register(interfaceTopic, null, restoreMonitoring, true);

}

/**
 * 
 * @param {Number} actualValue: The value calculated for the datapoint after the
 * DVC service evaluates the values according to the priority 
 * @param {Object} values : The values object returned by the DVC service 
 * which contains a list of values mapped to their priorities
 * @param {String} interfaceTopic: Request channel interface topic of the form
 * glp/0/SID/rq/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE
 * @param {String} datapointTopic: Request channel with datapoint in the topic
 * of the form glp/0/SID/rq/dev/P/H/BLOCK_NAME/BLOCK_HANDLE/DATAPOINT_NAME 
 * @param {String} blockName: Name of the interface block 
 * @param {String} blockHandle: Interface block handle 
 * @param {Object} datapoint: Object or value of the datapoint 
 */

function updateValuesAndMonitoringObjects(
    actualValue, 
    values, 
    interfaceTopic, 
    datapointTopic, 
    blockName, 
    blockHandle, 
    datapoint
) {
    /**
     * Set the actual value and values in the map after DVC computes the correct
     * value
     */
    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint].value = 
        actualValue;
    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint].values = 
        values;
    ctx.mapDatapointTopicToDatapointObject[interfaceTopic] = 
        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle];
    
    /**
     * Publish the updated interface block to the feedback channel
     */
    publishInterfaceBlock(
        interfaceTopic,
        ctx.mapDatapointTopicToDatapointObject[interfaceTopic]
    );

    /**
     * If the monitoring of this point is enabled, update the value reported
     * in the monitor map
     */
    if (ctx.mapDatapointTopicToMonitoringObject[datapointTopic]) {
        ctx.mapDatapointTopicToMonitoringObject[datapointTopic].value = actualValue;
    }
}

/**
 * This function is a callback handler which listens to the topic 
 * glp/0/SID/rq/dev/PROTOCOL/HANDLE/if/#
 * @param {Error object or null} error 
 * @param {String} subscription 
 * @param {String} topic 
 * @param {Buffer} message 
 */
function handleDeepTopicAssignments(error, subscription, topic, message) {
    /**
     * returns an ordered list of topic values for the wildcards in the 
     * subscription
     */
    let value;
    if (!error) {
        try {
            value = JSON.parse(message.toString());
        } catch (err) {
            error = err;
        }
    }

    let property, valueProperty = false;
    if (!error) {
        // Returns all the wildcard elements after glp/0/SID/rq/dev/P/H/if/#
        const extractedInterface = glp.mqtt.extract(subscription, topic)[0];
        // Splits all the wildcard elements by / and creates an array
        const splitExtractedInterface = extractedInterface.split("/");
        // Forms the interface topic with block name and block handle
        // interfaceTopic is of the form glp/0/SID/rq/dev/P/H/if/BLOCK_NAME/BLOCK_HANDLE
        const interfaceTopic = glp.tools.topic_builder(
            subscription.split("/").slice(0, -1).join("/"),
            extractedInterface.split("/").slice(0, 2).join("/")
        );
        // The first element in the wildcard elements is always the block name 
        const blockName = splitExtractedInterface[0];
        // The second element in the wildcard elements is always the block handle
        const blockHandle = splitExtractedInterface[1];
        /**
         * Check if the assignment is done to a valid blockname which exists in
         * the device interfaces
         */
        if (
            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic].hasOwnProperty(
                blockName
            )
        ) {
            /* There is no deep topic assignment */
            if (interfaceTopic === topic) {
                /**
                 * Since there is no deep topic assignment, the value must be
                 * an object and the key will be the datapoint
                 */
                const datapoint = Object.keys(value)[0];
                let datapointTopic;
                if (datapoint) {
                    datapointTopic = glp.tools.topic_builder(
                        topic,
                        datapoint
                    );
                }
                /**
                 * Check if the datapoint exists in the block
                 */
                if (
                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle].hasOwnProperty(
                        datapoint
                    )
                ) {
                    const property = Object.keys(value[datapoint])[0];
    
                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint] = _.merge(
                        {},
                        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                        value[datapoint]
                    );

                    if (property === glp.spec.OBJECT_TYPE_MONITOR) {

                        monitor.handleMonitoringEvent(
                            topic,
                            datapointTopic,
                            datapoint,
                            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint]
                        );
                    } else if (property === VALUE_PROPERTY) {
                        valueProperty = true;
                        /**
                         * Send to DVC
                         */
                        control.handleValueRequest(
                            topic,
                            datapointTopic,
                            datapoint,
                            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                            function (actualValue, values) {
                                updateValuesAndMonitoringObjects(
                                    actualValue, 
                                    values, 
                                    interfaceTopic, 
                                    datapointTopic, 
                                    blockName, 
                                    blockHandle, 
                                    datapoint
                                );
                            }
                        );
                    }
                } else {
                    glp.log.error(
                        topic,
                        "Datapoint ",
                        datapoint,
                        " does not exist in the device"
                    );
                    error = true;
                }
            } else {
                const deepTopics = splitExtractedInterface.splice(2);
                if (deepTopics.length > 0) {
                    const datapoint = deepTopics[0];
                    let datapointTopic;
                    if (datapoint) {
                        datapointTopic = glp.tools.topic_builder(
                            interfaceTopic,
                            datapoint
                        );
                    }
                    if (
                        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle].hasOwnProperty(
                            datapoint
                        )
                    ) {
                        const property = deepTopics.splice(1).join(".");
                        if (property) {
                            if (!isObject(value)) {
                                if (
                                    _.get(
                                        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                                        property,
                                        null
                                    ) !== null
                                ) {
                                    _.set(
                                        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                                        property,
                                        value
                                    );
                                    if (property.split(".").includes("monitor")) {
                                        monitor.handleMonitoringEvent(
                                            interfaceTopic,
                                            datapointTopic,
                                            datapoint,
                                            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint]
                                        );
                                    } else if (property.split(".").includes("value")) {
                                        valueProperty = true;
                                        control.handleValueRequest(
                                            interfaceTopic,
                                            datapointTopic,
                                            datapoint,
                                            ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                                            function (actualValue, values) {
                                                updateValuesAndMonitoringObjects(
                                                    actualValue,
                                                    values,
                                                    interfaceTopic,
                                                    datapointTopic,
                                                    blockName,
                                                    blockHandle,
                                                    datapoint
                                                );
                                            }
                                        );
                                    }
                                } else {
                                    glp.log.error(
                                        topic,
                                        "Property ",
                                        property,
                                        " does not exist in datapoint ",
                                        datapoint
                                    );
                                    error = true;
                                }
                            } else {
                                _.merge(
                                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint][property],
                                    value
                                );
                                if (value.hasOwnProperty(glp.spec.OBJECT_TYPE_MONITOR)) {
                                    monitor.handleMonitoringEvent(
                                        interfaceTopic,
                                        datapointTopic,
                                        datapoint,
                                        ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint]
                                    );
                                }
                            }
                        } else {
                            _.merge(
                                ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint], value
                            );
                            if (value.hasOwnProperty(glp.spec.OBJECT_TYPE_MONITOR)) {
                                monitor.handleMonitoringEvent(
                                    interfaceTopic,
                                    datapointTopic,
                                    datapoint,
                                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint]
                                );
                            } else if (value.hasOwnProperty("value")) {
                                valueProperty = true;
                                control.handleValueRequest(
                                    interfaceTopic,
                                    datapointTopic,
                                    datapoint,
                                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle][datapoint],
                                    function (actualValue, values) {
                                        updateValuesAndMonitoringObjects(
                                            actualValue, 
                                            values, 
                                            interfaceTopic, 
                                            datapointTopic, 
                                            blockName, 
                                            blockHandle, 
                                            datapoint
                                        );
                                    }
                                );
                            }
                        }

                    } else {
                        glp.log.error(
                            topic,
                            "Datapoint ",
                            datapoint,
                            " does not exist in the device"
                        );
                    }
                }
            }

            if (!error && !valueProperty) {
                ctx.mapDatapointTopicToDatapointObject[interfaceTopic] =
                    ctx.mapInterfaceTopicToInterfaceObject[interfaceTopic][blockName][blockHandle];
                publishInterfaceBlock(
                    interfaceTopic,
                    ctx.mapDatapointTopicToDatapointObject[interfaceTopic]
                );
            }

        } else {
            glp.log.error(
                topic,
                "Block name ",
                blockName,
                " does not exist in the device"
            );
        }

    } else {
        glp.log.error(topic, error);
    }


}

/**
 * This function registers to the request channel with wildcard topics to 
 * handle deep topic assignments
 * @param {String} rqTopic 
 * @param {String} register: true or false 
 */
function registerToInterfaceObjects(rqTopic, register) {
    glp.mqtt.register(
        glp.tools.topic_builder(
            rqTopic,
            "#"
        ),
        null,
        handleDeepTopicAssignments,
        register,
        function (error) {
            if (error) {
                glp.log.error(rqTopic, error);
            }
        }
    );
}

/**
 * This function is used to delete datapoint objects from maps and deregister
 * from the interface topic
 * @param {String} rqTopic 
 */
function deregisterFromInterfaceTopics(rqTopic, delObject) {
    const wildcardInterfaceTopic = glp.tools.topic_builder(
        rqTopic,
        "#"
    );

    for (let each in ctx.mapDatapointTopicToTimers) {
        if (glp.mqtt.match(wildcardInterfaceTopic, each)) {
            if (ctx.mapDatapointTopicToTimers[each]) {
                clearInterval(ctx.mapDatapointTopicToTimers[each]);

                if (delObject) {
                    delete ctx.mapDatapointTopicToTimers[each];
                    delete ctx.mapDatapointTopicToDatapointObject[each];
                    delete ctx.mapDatapointTopicToMonitoringObject[each];
                    delete ctx.mapInterfaceTopicToInterfaceObject[each];
                }
                
                glp.log.debug(each, "Cleared monitoring interval");
            }

        }
    }
    glp.mqtt.deregister(
        wildcardInterfaceTopic,
        true,
        function (error) {
            if (error) {
                glp.log.error(rqTopic, error);
            }
        }
    );
}

exports.windup = windup;
exports.registerToInterfaceObjects = registerToInterfaceObjects;
exports.deregisterFromInterfaceTopics = deregisterFromInterfaceTopics;
exports.registerToInterfaceFeedbackObjects = registerToInterfaceFeedbackObjects;
exports.publishInterfaceBlock = publishInterfaceBlock;
exports.publishMonitoringRequest = publishMonitoringRequest;