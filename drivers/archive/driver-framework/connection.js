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
const _ = require("lodash");

/**
 * Global maps and constants
 */
let ctx, glp, connectionTopic;
let mapSourceToDestination = {};
let mapConnectionTopicToState = {};
let mapConnectionTopicToImplObject = {};

const connectionStatusObject = {
    state: "",
    failureReason: "",
    failureCode: 0
};

let listOfSources = [],
    listOfFeedbackTopics = [];

/**
 * 
 * This function checks the state of the function and populates the map of the
 * connection objects
 * @param {Error object or null} error 
 * @param {String} subscription : Wildcard topic glp/0/./=engine/P/con/+/impl
 * @param {String} topic : Actual topic e.g. glp/0/./=engine/xyz/con/1/impl
 * @param {Buffer} message : String buffer containing the implemenation object
 */
function handleImplObjects(error, subscription, topic, message) {
    if (!error) {
        const doTopic = glp.mqtt.transform(
            topic,
            null,
            "do",
            1
        );

        try {
            const parsedImplObject = JSON.parse(message.toString());
            if (parsedImplObject) {
                topic = glp.mqtt.transform(
                    topic,
                    null,
                    "do",
                    1
                );
                mapConnectionTopicToImplObject[topic] = parsedImplObject;
    
                handleCreateConnectionRequest(
                    doTopic,
                    parsedImplObject.args,
                    parsedImplObject.state,
                    false
                );
                if (parsedImplObject.state === glp.spec.STATE_PROVISIONED) {
                    subscribeToSources(topic);
                }
            }
        } catch (error) {
            glp.log.error(topic, error);
        }
    } else {
        glp.log.error(topic, error);
    }

}

/**
 * This function is called by the main index.js file when the driver is connected
 * to MQTT. This function subscribes to the implementation topic
 * glp/0/./=engine/P/con/+/impl and registers a handler to handle these
 * implementation objects.
 */
function restoreConnections() {
    const implTopic = glp.tools.topic_builder(
        glp.spec.GLP,
        glp.spec.GLP_PROTOCOL_VERSION,
        ".",
        "=engine",
        ctx.protocol,
        glp.spec.OBJECT_TYPE_CONNECTION,
        "+",
        "impl"
    );

    glp.mqtt.register(
        implTopic,
        null,
        handleImplObjects,
        true,
        function (error) {
            if (error) {
                glp.log.error(implTopic, error);
            }
        }
    );

    /**
     * Deregister from the wildcard impl topic after 3 seconds. 3 seconds is the
     * approximate time of restore
     */
    setTimeout(
        function () {
            glp.mqtt.deregister(
                implTopic,
                true,
                function (error) {
                    if (error) {
                        glp.log.error(implTopic, error);
                    }
                }
            );
        },
        3000
    );
}

/**
 * This function publishes the implementation object on the topic 
 * glp/0/./=engine/xyz/con/1/impl with retain true and QoS: 1
 * The object is of the form 
 * {
 *  "args":{
 *     "sources":[
 *         "glp/0/17q3ak7/fb/dev/modbus/amik1/if/block/0/Volts_1/value"
 *     ],
 *     "destinations":[
 *         "glp/0/17q3ak7/rq/dev/modbus/A/if/Lamp/0/nviValue/value"
 *     ],
 *     "monitor":{
 *        "input":"glp/0/./=dcm/con/test_con2/in",
 *        "output":"glp/0/./=dcm/con/test_con2/out"
 *     }
 *   },
 *   "state":"created"
 * }
 * @param {String} topic Topic of the form glp/0/./=engine/xyz/con/1/impl
 * @param {Object} args 
 */
function publishConnectionImpl(topic, args) {
    const implTopic = glp.mqtt.transform(
        topic,
        null,
        "impl",
        1
    );

    glp.mqtt.publish(
        implTopic,
        JSON.stringify(args),
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
 * This function publishes the state of the connection on the feedback channel
 * with retain true and qos 1
 * @param {String} topic 
 * @param {String} state 
 * @param {String} failureCode 
 * @param {String} failureReason 
 */
function publishConnectionStatus(topic, state, failureCode, failureReason) {
    const statusTopic = glp.mqtt.transform(
        topic,
        null,
        glp.spec.STATUS_OBJECT,
        1
    );

    const statusObject = Object.assign({}, connectionStatusObject);
    statusObject.state = state;
    statusObject.failureCode = failureCode;
    statusObject.failureReason = failureReason;

    glp.mqtt.publish(
        statusTopic,
        JSON.stringify(statusObject),
        true,
        1,
        function (error, topic, message) {
            if (error) {
                glp.log.error(topic, error);
            } else {
                glp.log.debug(topic, "Published status object ", message);
            }
        }
    );
}

/**
 * This function publishes the value on the monitor input topic defined by the
 * connection object
 * @param {String} source 
 * @param {String or Object or Number} value 
 */
function publishToConnectionDestination(source, value) {
    for (const destination of mapSourceToDestination[source].destination) {
        glp.mqtt.publish(
            destination,
            JSON.stringify(value),
            false,
            1,
            function (error, topic, message) {
                if (error) {
                    glp.log.error(topic, error);
                } else {
                    glp.log.debug(topic, "Published value ", message);
                }
            }
        );
    }
}

/**
 * This function is used to check if the interface topic is linked to any 
 * of the connection objects created.
 * @param {String} interfaceTopic 
 * @param {Object} interfaceObject 
 */
function checkForConnections(interfaceTopic, interfaceObject) {
    const wildcardInterfaceTopic = glp.tools.topic_builder(interfaceTopic, "#");
    for (const source of listOfFeedbackTopics) {
        if (glp.mqtt.match(wildcardInterfaceTopic, source)) {
            if (mapSourceToDestination[source].state === glp.spec.STATE_PROVISIONED) {
                let datapoint = glp.mqtt.extract(wildcardInterfaceTopic, source)[0];
                datapoint = datapoint.split("/").join(".");
                const value = _.get(interfaceObject, datapoint, null);
                if (value !== null) {
                    publishToConnectionDestination(source, value);
                }
            }
        }
    }
}


/**
 * This function publishes the value received to the appropriate destination
 * @param {Error or null} error 
 * @param {String} subscription Wildcard subscription glp/0/./=dcm/con/+/in 
 * @param {String} topic Actual topic e.g. glp/0/./=dcm/con/1/in
 * @param {Buffer} message 
 */
function handleMessagesFromSource(error, subscription, topic, message) {
    if (!error) {
        try {
            const value = JSON.parse(message.toString());
            publishToConnectionDestination(topic, value);
        } catch (error) {
            glp.log.error(topic, error);
        }
    } else {
        glp.log.error(topic, error);
    }
}

/**
 * This function is responsible for subscribing to all the connection sources 
 * so that when the data is changed or pushed on the source, it can be forwarded
 * to the appropriate destinations
 * @param {String} topic 
 */
function subscribeToSources(topic) {
    const fbRegex = /^glp\/0\/[a-z0-9]+\/fb\/dev/g;
    for (const source of listOfSources) {
        mapSourceToDestination[source].state = glp.spec.STATE_PROVISIONED;
        mapConnectionTopicToState[topic] = glp.spec.STATE_PROVISIONED;
        if (!fbRegex.test(source)) {
            glp.mqtt.register(
                source,
                null,
                handleMessagesFromSource,
                true,
                function (error) {
                    if (error) {
                        glp.log.error(source, error);
                    }
                }
            );
        }
    }
}

/**
 * This function is responsible for checking if the device which is the source 
 * of the connection exists and is provisioned. It also checks if the device
 * has the requested interface block and datapoint. If either of the things
 * don't exist, an error is re
 * @param {String} topic 
 * @param {Object} args 
 */
function handleProvisionConnectionRequest(topic, args) {
    let error;
    if (!mapConnectionTopicToState[topic]) {
        error = "Provisioning failed because connection was not created";
    } else {
        /**
         * Check if device exists and is provisioned
         */
        for (const topic of listOfFeedbackTopics) {
            const handle = topic.split("/")[6];
            /**
             * Check if the device with this handle exists
             */
            if (!ctx.mapDeviceHandleToStatus[handle]) {
                error = "Device does not exist";
                break;
            } else {
                /**
                 * Check if the device with this handle has been provisioned
                 */
                if (ctx.mapDeviceHandleToStatus[handle] !== glp.spec.STATE_PROVISIONED) {
                    error = "Device with handle " + handle + " was not provisioned";
                } else {
                    /**
                     * Check if the datapoint exists
                     */
                    let interfaceTopic = topic.split("/");
                    const datapoint = interfaceTopic.splice(10)[0];
                    interfaceTopic = interfaceTopic.join("/");
                    interfaceTopic = glp.mqtt.transform(
                        interfaceTopic,
                        glp.spec.REQUEST_CHANNEL
                    );

                    if (!ctx.mapDatapointTopicToDatapointObject[interfaceTopic]) {
                        error = "Interface block does not exist";
                    } else {
                        if (
                            _.get(
                                ctx.mapDatapointTopicToDatapointObject[
                                    interfaceTopic
                                ],
                                datapoint,
                                null
                            ) === null
                        ) {
                            error = "Datapoint " + datapoint + " does not exist";
                        }
                    }
                }
            }
        }
    }

    if (!error) {
        /**
         * Then subscribe to the sources and publish status provisioned
         */
        subscribeToSources(topic);
        const implObject = {};
        implObject.args = mapConnectionTopicToImplObject[topic].args;
        implObject.state = glp.spec.STATE_PROVISIONED;
        publishConnectionImpl(topic, implObject);
        publishConnectionStatus(topic, glp.spec.STATE_PROVISIONED, 0, null);
    } else {
        publishConnectionStatus(topic, glp.spec.STATE_CREATED, 5, error);
    }
}

/**
 * This function is responsible for mapping sources to destinations and 
 * maintaining a unique list of sources
 * @param {String} topic 
 * @param {String} source 
 * @param {Object} args 
 * @param {String} state 
 */
function populateMapSourceToDestination(topic, source, args, state) {
    if (!mapSourceToDestination[source]) {
        mapSourceToDestination[source] = {};
        mapSourceToDestination[source].destination = args.destinations;
        mapSourceToDestination[source].state = state;
        mapConnectionTopicToState[topic] = state;
        listOfSources.push(source);
        listOfSources = _.uniq(listOfSources);
    } else {
        mapSourceToDestination[source].destination.push(
            args.destinations
        );
    }
}

/**
 * This function handles the create connection request. 
 * It creates a map of source to destination and maintains the state of the 
 * connection.
 * @param {String} topic 
 * @param {String} handle 
 * @param {String} args 
 */
function handleCreateConnectionRequest(topic, args, state, publish) {
    /**
     * Case 1: Destination is defined and monitor output topic is given
     */
    if (!state) {
        state = glp.spec.STATE_CREATED;
    }
    if (args.destinations && !_.isEmpty(args.destinations)) {
        if (args.monitor && args.monitor.output) {
            const source = args.monitor.output;
            populateMapSourceToDestination(topic, source, args, state);
        }
    }

    /**
     * Case 2: Sources is defined and monitor input topic is given
     */
    if (args.sources && !_.isEmpty(args.sources)) {
        if (args.monitor && args.monitor.input) {
            for (const source of args.sources) {
                args.destinations = [];
                args.destinations.push(args.monitor.input);

                populateMapSourceToDestination(topic, source, args, state);

                listOfFeedbackTopics.push(source);
                listOfFeedbackTopics = _.uniq(listOfFeedbackTopics);
            }
        }
    }

    /**
     * Case 3: Sources and destinations are defined without monitor topics
     */
    if (
        args.sources &&
        !_.isEmpty(args.sources) &&
        !args.monitor &&
        args.destinations &&
        !_.isEmpty(args.destinations)
    ) {
        for (const source of args.sources) {
            populateMapSourceToDestination(topic, source, args, state);
            listOfFeedbackTopics.push(source);
            listOfFeedbackTopics = _.uniq(listOfFeedbackTopics);
        }
    }

    glp.log.debug(
        topic,
        "Map from source to destination ",
        JSON.stringify(mapSourceToDestination)
    );

    if (publish) {
        const implObject = {};
        implObject.args = args;
        implObject.state = glp.spec.STATE_CREATED;
        mapConnectionTopicToImplObject[topic] = implObject;
        publishConnectionImpl(topic, implObject);
        publishConnectionStatus(topic, glp.spec.STATE_CREATED, 0, null);
    }
}

/**
 * 
 * @param {String} topic 
 * @param {Object} args 
 */
function handleDeleteConnectionRequest(topic, args) {
    let error;
    if (!mapConnectionTopicToState[topic]) {
        error = "Cannot delete connection which does not exist";
    } else {
        for (const source of mapConnectionTopicToImplObject[topic].args.sources) {
            glp.mqtt.deregister(
                source, 
                true, 
                function(error) {
                    if (error) {
                        glp.log.error(topic, error);
                    }
                }
            );
            delete mapSourceToDestination[source];
            
            _.remove(
                listOfSources, 
                function (src) {
                    return src === source;
                }
            );
            
            _.remove(
                listOfFeedbackTopics, 
                function(src) {
                    return src === source;
                }
            );
        }
        delete mapConnectionTopicToState[topic];
        delete mapConnectionTopicToImplObject[topic];
        
        publishConnectionImpl(topic, null);
        publishConnectionStatus(topic, glp.spec.STATE_DELETED, 0, null);
    }

    if (error) {
        publishConnectionStatus(topic, mapConnectionTopicToState[topic], 5, error);
    }

}

/**
 * This function is a callback which is called when a message is received on the
 * topic glp/0/./=engine/P/con/+/do. This function dispatches the connection
 * request to the respective handlers based on the connection action requested
 * @param {Error object or null} error  
 * @param {String} subscription Wildcard subscription glp/0/./=engine/P/con/+/do
 * @param {String} topic Actual topic e.g. glp/0/./=engine/xyz/con/1/do
 * @param {Buffer} message String buffer
 */
function handleConnectionRequests(error, subscription, topic, message) {
    if (!error) {
        try {
            const parsedConnectionRequest = JSON.parse(message.toString());
            const args = parsedConnectionRequest.args;
            glp.log.debug(
                topic,
                "Connection request received ",
                message.toString()
            );

            switch (parsedConnectionRequest.action) {
                case glp.spec.ACTION_CREATE:
                    handleCreateConnectionRequest(
                        topic,
                        args,
                        glp.spec.STATE_CREATED,
                        true
                    );
                    break;

                case glp.spec.ACTION_PROVISION:
                    handleProvisionConnectionRequest(topic, args);
                    break;

                case glp.spec.ACTION_DELETE:
                    handleDeleteConnectionRequest(topic, args);
                    break;
            }

        } catch (error) {
            glp.log.error(topic, error);
        }
    } else {
        glp.log.error(topic, error);
    }
}

/**
 * This function subscribes to the connection topic glp/0/./=engine/P/con/H/do
 * and registers a callback function
 */
function registerForConnectionRequests() {
    glp.mqtt.register(
        connectionTopic,
        null,
        handleConnectionRequests,
        true,
        function (error) {
            if (error) {
                glp.log.error(connectionTopic, error);
            }
        }
    );
}

/**
 * This function is called from index.js after all the modules are initialised
 * This function initialises the global context which contains the toolkit and 
 * maps which link to other operations.
 * @param {Object} context 
 */
function windup(context) {
    ctx = context;
    glp = context.glp;
    /**
     * connection topic is of the type glp/0/./=engine/P/con/+/do
     */
    connectionTopic = glp.tools.topic_builder(
        glp.spec.GLP,
        glp.spec.GLP_PROTOCOL_VERSION,
        ".",
        "=engine",
        ctx.protocol,
        glp.spec.OBJECT_TYPE_CONNECTION,
        "+",
        "do"
    );
}

exports.windup = windup;
exports.registerForConnectionRequests = registerForConnectionRequests;
exports.restoreConnections = restoreConnections;
exports.checkForConnections = checkForConnections;