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
 * This module provides stubs which can be used to build a custom driver 
 * for any protocol using the IAP/MQ protocol.
 * This framework utilizes the GLP Toolkit for easy handling of IAP/MQ actions
 * This framework is based on an assumption which is as follows:
 * While creating a device, the device type must be already known, 
 * for example from interface files or other sources 
 * (such as built-in knowledge with the protocol engine) 
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

"use strict";
const toolkit = require("glp-toolkit").v0;
const moment = require("moment-timezone");
const _ = require("lodash");
const self = require("./package.json");
const sidEmitter = toolkit.mqtt.SID;
const version = toolkit.tools.get_version(self.version);
const createAction = require("./create_action");
const updateAction = require("./update_action");
const provisionAction = require("./provision_action");
const deprovisionAction = require("./deprovision_action");
const deleteAction = require("./delete_action");
const testAction = require("./test_action");
const replaceAction = require("./replace_action");
const handleIfObjects = require("./handle_interface_objects");
const monitor = require("./monitor");
const control = require("./value_control");
const connection = require("./connection");
const loadAction = require("./load");
const get = require("./get");
const lit = require("./literals");
let sid;
/**
 * This is an in-memory map which maps 
 * the unid to the device handle
 * This map ensures the uniqueness of the
 * unid
 * */
const mapUnidToDeviceHandle = {};

/** This is an in-memory map which 
 * maps the status of each device against the handle 
 */
const mapDeviceHandleToStatus = {};

const mapDeviceHandleToStatusObject = {};

/**
 * This context is a global context which is shared across all source files 
 * during windup. It includes constants, maps and the toolkit which needs 
 * to be shared across all source files in the driver framework
 */
let context = {
    glp: toolkit,
    moment: moment,
    protocol: lit.PROTOCOL,
    sid: sid,
    mapDeviceHandleToStatus: mapDeviceHandleToStatus,
    mapUnidToDeviceHandle: mapUnidToDeviceHandle,
    mapDeviceHandleToStatusObject: mapDeviceHandleToStatusObject,
    mapInterfaceTopicToInterfaceObject: {},
    mapDatapointTopicToDatapointObject: {},
    mapDatapointTopicToMonitoringObject: {},
    mapDatapointTopicToTimers: {},
    publishStatusObject: publishStatusObject,
    checkIfUnidIsUnique: checkIfUnidIsUnique,
    provisionAction: provisionAction.provisionDevice,
    TIME_FORMAT: lit.TIME_FORMAT
};


/**
 * This function checks if the unid is already in use by another device and 
 * checks for uniqueness of the unid
 * @param {String} unid 
 */
function checkIfUnidIsUnique(unid, handle) {
    let isUnique = true;
    if (
        mapUnidToDeviceHandle.hasOwnProperty(unid) &&
        mapUnidToDeviceHandle[unid] !== handle
    ) {
        isUnique = !isUnique;
    }
    return isUnique;
}

/**
 * registerForDeviceActions:
 * This function is responsible for registering validators, executors and 
 * completors for each device action
 * This function returns an error object or null
 */
function registerForDeviceActions() {
    /**
     * This creates an object of the Actions class defined in the toolkit 
     * for the specific protocol
     */
    let driverActionsObject = toolkit.object.actions(lit.PROTOCOL);
    // Register action create with a custom validator and completor function
    /**
     * While registering for a create action, the assumption here for a generic 
     * framework is to assume that the driver already knows about the device 
     * type. To know how to use custom driver specific types refer to 
     * Chapter 12: Device Types from IAP/MQ spec
     */
    driverActionsObject.register(
        toolkit.spec.ACTION_CREATE,
        createAction.createActionValidator,
        null,
        createAction.createActionCompletor
    );

    driverActionsObject.register(
        toolkit.spec.ACTION_UPDATE,
        null,
        null,
        updateAction.updateActionCompletor
    );

    /**
     * Register action provision with a custom validator, executor and 
     * completor functions
     */
    driverActionsObject.register(
        toolkit.spec.ACTION_PROVISION,
        provisionAction.provisionActionValidator,
        provisionAction.provisionActionExecutor,
        provisionAction.provisionActionCompletor
    );

    driverActionsObject.register(
        toolkit.spec.ACTION_DEPROVISION,
        deprovisionAction.deprovisionActionValidator,
        deprovisionAction.deprovisionActionExecutor,
        deprovisionAction.deprovisionActionCompletor
    );

    driverActionsObject.register(
        toolkit.spec.ACTION_TEST,
        testAction.testActionValidator,
        testAction.testActionExecutor,
        testAction.testActionCompletor
    );

    // Register action delete with a custom validator and completor function
    driverActionsObject.register(
        toolkit.spec.ACTION_DELETE,
        deleteAction.deleteActionValidator,
        null,
        deleteAction.deleteActionCompletor
    );

    driverActionsObject.register(
        toolkit.spec.ACTION_REPLACE,
        replaceAction.replaceActionValidator,
        replaceAction.replaceActionExecutor,
        replaceAction.replaceActionCompletor
    );

    driverActionsObject.register(
        toolkit.spec.ACTION_LOAD,
        loadAction.loadActionValidator,
        loadAction.loadActionExecutor,
        loadAction.loadActionCompletor
    );

    /**
     * Register all actions and provide the default config object and 
     * status object template with constraints to mandate properties in 
     * both the objects.
     */
    let error = toolkit.object.register(
        toolkit.spec.OBJECT_TYPE_DEVICE,
        driverActionsObject,
        toolkit.spec.Device_Config_Template,
        toolkit.spec.Device_Config_Constraints,
        toolkit.spec.Device_Status_Template,
        toolkit.spec.DEVICE_STATES,
        false
    );

    return error;
}

/**
 * This function publishes the components, limitations and protocol of the 
 * driver to a local engine topic which is then merged into the segment's main 
 * about topic.
 * Refer Chapter 4: About IAP/MQ for more details regarding the about object
 */
function publishAboutObject() {
    lit.ABOUT_OBJECT.components[0].version = version;
    toolkit.mqtt.publish(
        lit.ENGINE_ABOUT_TOPIC,
        JSON.stringify(lit.ABOUT_OBJECT),
        false,
        1,
        function (error, topic, message) {
            if (error) {
                toolkit.log.error(topic, error);
            } else {
                toolkit.log.debug(topic, "Published about object ", message);
                toolkit.mqtt.deregister(
                    lit.RUNLEVEL_TOPIC,
                    true,
                    function (error) {
                        if (error) {
                            toolkit.log.error(lit.RUNLEVEL_TOPIC, error);
                        }
                    }
                );
            }
        }
    );
}

/**
 * This function is a callback function registered to handle the messages 
 * published on the runlevel topic. When the runlevel value reaches 100, 
 * the segment is ready to accept about messages from the driver
 * @param {Object} error
 * @param {String} topic
 * @param {String} subscription
 * @param {Buffer} message
 */

function handleRunlevelMessage(error, topic, subscription, message) {
    if (!error) {
        let stringifiedMessage = message.toString();
        if (stringifiedMessage) {
            let parsedMessage = JSON.parse(stringifiedMessage);
            if (parsedMessage.value === 100) {
                publishAboutObject();
            }
        }
    } else {
        toolkit.log.error(topic, error);
    }
}

/**
 * This function is a callback function used to handle retained status objects. 
 * This function populates the internal map 
 * of unid to handle and the state of the created device.
 * @param {Object} error 
 * @param {String} subscription 
 * @param {String} topic 
 * @param {Buffer} message 
 */
function handleStatusObjects(error, subscription, topic, message) {
    if (!error) {
        let handle = toolkit.mqtt.extract(subscription, topic)[0];
        let statusObject = JSON.parse(message.toString());
        if (statusObject.state !== toolkit.spec.STATE_DELETED) {
            if (statusObject.unid) {
                mapUnidToDeviceHandle[statusObject.unid] = handle;
                toolkit.log.debug(
                    topic,
                    "Populated unid map ",
                    JSON.stringify(mapUnidToDeviceHandle)
                );
            }
            mapDeviceHandleToStatus[handle] = statusObject.state;
            mapDeviceHandleToStatusObject[handle] = statusObject;

            toolkit.log.debug(
                topic,
                "Populated sts map ",
                JSON.stringify(mapDeviceHandleToStatus)
            );
            if (statusObject.state === toolkit.spec.STATE_PROVISIONED) {
                let rqTopic = toolkit.mqtt.transform(
                    topic,
                    toolkit.spec.REQUEST_CHANNEL,
                    "if",
                    1
                );
                handleIfObjects.registerToInterfaceObjects(rqTopic, false);
                handleIfObjects.registerToInterfaceFeedbackObjects(rqTopic);
            }
        }
    }
}

/**
 * This function is called immediately after an MQTT connect, which populates 
 * the internal map of created devices. 
 */
function restoreDevices(sid) {
    toolkit.log.debug(null, "Restoring devices");
    let feedbackStatusTopic = toolkit.tools.topic_builder(
        toolkit.spec.GLP,
        "0",
        sid,
        toolkit.spec.FEEDBACK_CHANNEL,
        toolkit.spec.OBJECT_TYPE_DEVICE,
        lit.PROTOCOL,
        "+",
        toolkit.spec.STATUS_OBJECT
    );

    toolkit.mqtt.register(
        feedbackStatusTopic,
        null,
        handleStatusObjects,
        true,
        function (error) {
            if (error) {
                toolkit.log.error(feedbackStatusTopic, error);
            }
        }
    );

    connection.restoreConnections();
    
    setTimeout(function () {
        toolkit.mqtt.deregister(
            feedbackStatusTopic,
            true,
            function (error) {
                if (error) {
                    toolkit.log.error(feedbackStatusTopic, error);
                }
            }
        );
    }, 3000);
}

sidEmitter.on(
    "provisioned",
    function (oldSid, newSid) {
        if (!oldSid) {
            restoreDevices(newSid);
        }
        sid = newSid;
        context.sid = newSid;
        // Assuming restoring devices and registering to interface topics will 
        // be done in 3 seconds for now
        setTimeout(
            function () {
                toolkit.log.debug(null, "Registering for device actions");
                let error = registerForDeviceActions();
                get.registerForDatapointGetRequests();
                if (error) {
                    // There's no point in running the engine if it cannot 
                    // support actions
                    toolkit.log.fatal(null, error);
                }
            },
            3000
        );
    }
);


/**
 * connectEventHandler:
 * This is a callback function which is called when the MQTT connection is 
 * successful
 * @param {Boolean} sessionPresent: This flag indicates if a persistent session 
 * for this client was already present with the broker
 */
function connectEventHandler(error, sessionPresent) {
    if (!error) {
        // Subscribe to the runlevel topic which indicates the system's 
        // readiness to accept the driver's about object
        toolkit.mqtt.register(
            lit.RUNLEVEL_TOPIC,
            null,
            handleRunlevelMessage,
            true,
            function (error) {
                if (error) {
                    toolkit.log.error(lit.RUNLEVEL_TOPIC, error);
                }
            }
        );

        connection.registerForConnectionRequests();

    } else {
        toolkit.log.mqtt(null, error);
    }
}

/**
 * init:
 * This function is the starting point where all the database constructs and 
 * mqtt connections are initialised. It also ensures that the protocol engine 
 * process is a singleton
 */
function init() {
    toolkit.tools.banner(self, version);
    let error = toolkit.init(lit.SERVICE_NAME);
    if (!error) {
        // This call ensures that the process is a singleton, if the service 
        // fails to acquire a lock, the system is rebooted.
        createAction.windup(context);
        updateAction.windup(context);
        provisionAction.windup(context);
        deprovisionAction.windup(context);
        deleteAction.windup(context);
        replaceAction.windup(context);
        testAction.windup(context);
        handleIfObjects.windup(context);
        monitor.windup(context);
        control.windup(context);
        connection.windup(context);
        get.windup(context);
        loadAction.windup(context);

        /**
         * Connect to MQTT with a persistent session by setting clean session 
         * to false
         */
        const connectionOptions = {
            clean: false
        };
        toolkit.mqtt.connect(connectionOptions, connectEventHandler);
    } else {
        console.error(error);
        process.exit(1);
    }
}

/**
 * 
 * publishStatusObject:
 * Publishes a status object on the feedback channel with reatin true and QoS 1
 * @param {String} topic: rq channel topic on which the status has to be 
 * published 
 * @param {String} state: one of 'created', 'provisioned', 'deleted' 
 * @param {String} unid: unique identifier for this device 
 * @param {String} type: device type  
 * @param {String} health: one of 'normal', 'down' 
 * @param {String} pendingAction: one of 'provision', 'deprovision', 'delete' 
 * @param {String} duplicateCreate: true if its a duplicate create request, else 
 * false
 * @param {Function} callback: function which returns error or null 
 */
function publishStatusObject(
    topic,
    handle,
    state,
    unid,
    type,
    health,
    pendingAction,
    duplicateCreate,
    callback
) {
    let statusTopic = toolkit.mqtt.transform(
        topic,
        toolkit.spec.FEEDBACK_CHANNEL,
        toolkit.spec.STATUS_OBJECT
    );
    
    let statusObject;
    if (!duplicateCreate) {
        statusObject = Object.assign({}, toolkit.spec.Device_Status_Template);
        mapDeviceHandleToStatusObject[handle] = statusObject;
    } else {
        statusObject = mapDeviceHandleToStatusObject[handle];
    }

    if (unid) {
        statusObject.unid = unid;
    } else if (state === toolkit.spec.STATE_DELETED) {
        statusObject.unid = unid;
    }

    if (type) {
        statusObject.type = type;
    }

    statusObject.health = health;
    statusObject.action = pendingAction;
    statusObject.state = state;
    statusObject.mru = moment().utc().format(lit.TIME_FORMAT) + "UTC";

    toolkit.mqtt.publish(
        statusTopic,
        JSON.stringify(statusObject),
        true,
        1,
        function (error, topic, message) {
            callback(error, topic, message);
        }
    );
}

/**
 * This is where everything starts
 */
init();