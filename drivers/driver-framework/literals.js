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
/**
 * Global constants
 * SERVICE_NAME: Defines the name which will be registered with the GLP Toolkit. 
 * This name will be used to create a persistent folder for this protocol engine. 
 * The name of the process will be SERVICE_NAME prefixed with "ech"
 */
const SERVICE_NAME = "driver";
const PROTOCOL = "xyz";
const COMPONENT_NAME = PROTOCOL + " Protocol Engine";
const MANUFACTURER = "Adesto Technologies Corporation";

/**
 * The runlevel topic is a local topic to which the protocol engine 
 * subscribes to.This topic will determine the current state of the system and
 * if the system is ready to accept about messages 
 * which describe protocol specific information
 */
const RUNLEVEL_TOPIC = "glp/0/././runlevel";
/**
 * The local topic to which the protocol engine 's about object defined in 
 * Chapter 4 of IAP / MQ specs is published
 */
const ENGINE_ABOUT_TOPIC = "glp/0/./=engine/about";
/**  
 * Protocol engine's about object that needs to be published on the above topic 
 */
const ABOUT_OBJECT = {
    "components": [{
        "name": COMPONENT_NAME,
        "desc": "", // user description for the component name
        "license": "", // some copyright for the protocol engine
        "manufacturer": MANUFACTURER,
        "version": null
    }],
    "limitations": {
        "devices": 20,
        "protocols": [PROTOCOL]
    },
    "protocol": {}
};

// Protocol specific limitations, how many devices it can support
ABOUT_OBJECT.protocol[PROTOCOL] = {
    "devices": 20
};
/**
 * This is the standard format used for logging time where 
 * YYYY stands for a 4 digit year, 
 * MM stands for a 2 digit month, 
 * DD stands for two digit day, 
 * HH stands for 2 digit hour, 
 * mm stands for 2 digit minute, 
 * ss stands for two digit seconds and 
 * SSS stands for a 3 digit millisecond interval
 */
const TIME_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS ";

/*
 * This example driver assumes that all devices are of the same type, 
 * each supporting a physical light output and a physical switch input. 
 */

const deviceInterface = {
    /*
     * The light is presented as an implementation of the standard
     * open loop actuator profile with a standard SNVT_switch principal
     * input datapoint to control the physical output. 
     */
    light: {
        0: { // Block index, always zero if not a block array.
            type: "SFPTopenLoopActuator",
            nviValue: { // Principal input datapoint.
                cat: "in",
                property: false,
                type: "SNVT_switch",
                value: { // Actual (current) value.
                    value: 0,
                    state: 0
                },
                values: { // Value array for overrides.
                    level: 17, // Currently active level.
                    levels: { // All known levels.
                        "17": {
                            value: 0,
                            state: 0
                        }
                    }
                },
                monitor: { // Monitoring defaults.
                    rate: 0,
                    inFeedback: false,
                    report: "change",
                    throttle: 0.5
                }
            }
        }
    },
    /*
     * The switch is presented as an implementation of the standard
     * open loop sensor with a standard SNVT_switch principal output
     * datapoint to present the current state of the physical switch.
     */
    switch: {
        0: {
            type: "SFPTopenLoopSensor",
            nviValue: {
                cat: "out",
                property: false,
                type: "SNVT_switch",
                value: {
                    value: 0,
                    state: 0
                },
                values: {
                    level: 17,
                    levels: {
                        "17": {
                            value: 0,
                            state: 0
                        }
                    }
                },
                monitor: {
                    rate: 0,
                    inFeedback: false,
                    report: "change",
                    throttle: 0.5
                }
            }
        }
    }
};

exports.SERVICE_NAME = SERVICE_NAME;
exports.PROTOCOL = PROTOCOL;
exports.COMPONENT_NAME = COMPONENT_NAME;
exports.MANUFACTURER = MANUFACTURER;
exports.RUNLEVEL_TOPIC = RUNLEVEL_TOPIC;
exports.ENGINE_ABOUT_TOPIC = ENGINE_ABOUT_TOPIC;
exports.ABOUT_OBJECT = ABOUT_OBJECT;
exports.TIME_FORMAT = TIME_FORMAT;
exports.deviceInterface = deviceInterface;
