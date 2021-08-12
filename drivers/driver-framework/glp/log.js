/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (c) 2018 Echelon Corporation
 * This module is used for logging errors, warnings, debug
 * from other modules
 */

/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

"use strict";
const columnify = require("columnify");
const syslog = require("modern-syslog");
const moment = require("moment-timezone");
const config = require("./config").v0;
let self = require("./package.json");
const tools = require("./tools").v0;

const version = tools.get_version(self.version);
const PERIOD = ".";
const LOG_LANGUAGE = "en";

const LOG_TOPIC = "glp/0/./=logger/event";
const LOG_SEVERITY_DEBUG = "debug";
const LOG_SEVERITY_INFO = "info";
const LOG_SEVERITY_WARNING = "warning";
const LOG_SEVERITY_MQTT = "mqtt";
const LOG_SEVERITY_ERROR = "error";
const LOG_SEVERITY_FATAL = "fatal";

/* Maps a severity level to a Linux syslog log level */
const LOG_SYSLOG_MAP = {

    LOG_SEVERITY_DEBUG: syslog.level.LOG_DEBUG,
    LOG_SEVERITY_INFO: syslog.level.LOG_INFO,
    LOG_SEVERITY_WARNING: syslog.level.LOG_WARNING,
    LOG_SEVERITY_MQTT: syslog.level.LOG_ERROR,
    LOG_SEVERITY_ERROR: syslog.level.LOG_ERROR,
    LOG_SEVERITY_FATAL: syslog.level.LOG_ALERT

};

/*
 * Variables for use within this module, initialized by init()
 */
let debug_mode = false;
let verbosity;
let publisher = null;
let service_name, get;
let columns;
/*
 * init
 * initializes the module for a client with the given name, yields Error or
 * undefined for success.
 * initializes the publish function and syslog
 * The function accepts a getter of config.v0.get, and a
 * publisher of mqtt.v0.publish
 */
function init(name, getter, publish) {
    // We assume that name, getter and publish are valid. The onus of
    // correctness is upon the caller, in this case.
    debug_mode = getter(PERIOD + config.LOG_DEBUG) === "1";
    publisher = publish;
    service_name = name;
    get = getter;
    verbosity = getter(PERIOD + config.LOG_VERBOSITY);
    columns = columnify(
        [{
            Timestamp: null,
            Cat: null,
            Service: null,
            Topic: null,
            Message: null
        }],

        {
            minWidth: 30,
            config: {
                Timestamp: {
                    maxWidth: 30
                },
                Cat: {
                    maxWidth: 5
                },
                Service: {
                    maxWidth: 10
                },
                Topic: {
                    maxWidth: 30
                },
                Message: {
                    maxWidth: 50
                }
            }
        }
    );

    console.log(columns);
}

/*
 * generate_event_object:
 * This function returns a GLP event object to be published on the topic
 * glp/0/./=logger/event where the Generic Logger Service is subscribed.
 */
function generate_event_object(event_topic, severity, message) {
    
    const FORMAT = "YYYY-MM-DD HH:mm:ss.SSS ";
    const timezone = moment().tz(moment.tz.guess()).zoneAbbr();
    let event_object = {
        "id": new Date().getTime(),
        "cat": severity,
        "utc": moment().utc().format(FORMAT) + "UTC",
        "language": LOG_LANGUAGE,
        "local": moment().format(FORMAT) + timezone,
        "message": message,
        "localization": null,
        "data": null,
        "topic": event_topic,
        "urgent": severity === LOG_SEVERITY_FATAL,
        "active": null,
        "acknowledged": null,
        "acknowledge": null,
        "source": service_name,
        "severity": null
    };

    return event_object;
}

/*
 * diagnostics
 * An internal variadic utility used to implement the debug, info, warning,
 * error, mqtt and fatal functions.
 * severity indicates the severity of the log message.
 * publish is a boolean to control whether an attempt is made to publish the
 * diagnostic to the MQTT message broker.
 * print is a boolean to control whether the diagnostics is shown on the
 * console.
 * do_sys_log is a boolean to control whether the diagnostics is to be logged
 * in the system
 * fatal() and debug() show Error object's stacktrace, if  available.
 */
function diagnostics(severity, publish, print, do_sys_log, topic, e, ...args) {

    if (publish || print || do_sys_log) {
        let err_stack = "";
        let err_message = "";
        const timestamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss.SSS ZZ");

        if (e instanceof Error) {
            err_message = e.message;
            err_stack = e.stack;
            let stack = err_stack.split("\n");
            if (stack[1]) {
                stack = stack[1].replace(/^\s*/, "");
            }
            err_message = err_message + " " + stack;
        } else {
            err_message = format(e, ...args);
        }

        // mqtt related errors should not be published via mqtt
        if (publish && publisher) {
            const glp_event_obj = generate_event_object(
                topic,
                severity,
                err_message
            );
            publisher(
                LOG_TOPIC,
                JSON.stringify(glp_event_obj),
                false,
                0,
                function(error, topic, msg) {
                    if (error && severity != LOG_SEVERITY_FATAL) {
                        mqtt(null, error); //this also prints to the console.
                    }
                }
            );
        }

        if (print) {
            if (!topic) {
                topic = "null";
            }


        
            columns = columnify(
                [{
                    Timestamp: timestamp,
                    Cat: severity,
                    Service: service_name,
                    Topic: topic,
                    Message: err_message
                }], {
                    showHeaders: false,
                    minWidth: 30,
                    config: {
                        Timestamp: {
                            maxWidth: 30
                        },
                        Cat: {
                            maxWidth: 5
                        },
                        Service: {
                            maxWidth: 10
                        },
                        Topic: {
                            maxWidth: 30
                        },
                        Message: {
                            maxWidth: 50
                        }
                    }
                }
            );
            console.log(columns);

            if (severity === LOG_SEVERITY_FATAL ||
                severity === LOG_SEVERITY_DEBUG) {
                if (err_stack.length > 0) {
                    console.error("\n" + err_stack + "\n");
                }
            }
        }

        if (do_sys_log) {
            syslog.log(
                LOG_SYSLOG_MAP.severity,
                timestamp + " " +
                service_name + " " +
                topic + " " +
                err_message + "\n" +
                err_stack,
                function() {}
            );
        }
    }
}

/*
 * Format function is used by the fatal, error, mqtt, warning, info and debug
 * API to construct the diagnostic message, but toolkit clients may also use
 * the same format() API directly.
 * The function accepts an argument e. If e is an instanceof Error, the resulting
 * string is the error object and all other arguments are ignored.
 * If e is not an instance of Error, e and all other
 * arguments to this function are concatenated to form the result string.
 * Arguments must be strings or convertible to strings.
 * format() does not insert space or other characters between the arguments.
 * and does not append a newline character
 */

function format(e, ...args) {

    let err_str = e;
    if (!(e instanceof Error)) {
        for (let each of args) {
            err_str += each;
        }
    } 
    return err_str;
}

/*
 * debug
 * See diagnostics().
 */
function debug(topic, e, ...args) {

    diagnostics(
        LOG_SEVERITY_DEBUG,
        debug_mode,
        verbosity > 3,
        false,
        topic,
        e,
        ...args
    );
}

/*
 * info
 * See diagnostics().
 */
function info(topic, e, ...args) {

    diagnostics(
        LOG_SEVERITY_INFO,
        true,
        verbosity > 2,
        false,
        topic,
        e,
        ...args
    );
}

/*
 * warning
 * See diagnostics().
 */
function warning(topic, e, ...args) {

    diagnostics(
        LOG_SEVERITY_WARNING,
        true,
        verbosity > 1,
        false,
        topic,
        e,
        ...args
    );
}

/*
 * error
 * See diagnostics().
 */
function error(topic, e, ...args) {

    diagnostics(
        LOG_SEVERITY_ERROR,
        true,
        verbosity > 0,
        false,
        topic,
        e,
        ...args
    );
}

/*
 * mqtt
 * See diagnostics().
 * Use this for errors in relation to MQTT connectivity.
 */
function mqtt(topic, e, ...args) {
    diagnostics(
        LOG_SEVERITY_MQTT,
        false,
        true,
        true,
        topic,
        e,
        ...args
    );
}

/*
 * fatal
 * See diagnostics().
 * Note this function terminates the process.
 */
function fatal(topic, e, ...args) {

    diagnostics(
        LOG_SEVERITY_FATAL,
        true,
        true,
        true,
        topic,
        e,
        ...args
    );
    process.exit(-1);
}

exports.v0 = {
    VERSION: version,
    init: init,
    debug: debug,
    info: info,
    warning: warning,
    error: error,
    mqtt: mqtt,
    fatal: fatal
};
