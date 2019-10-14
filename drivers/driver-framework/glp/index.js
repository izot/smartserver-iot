/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (C) 2018 Echelon Corporation
 *
 * This is the top-level index module, which integrates all
 * modules within the toolkit.
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */
"use strict";

const PRODUCT = "Echelon GLP Toolkit for Node.js";
const COPYRIGHT = "Copyright (c) 2018 Echelon Corporation";

const async = require("async");
const modules = {
    config: require("./config"),
    log: require("./log"),
    singleton: require("./singleton"),
    mqtt: require("./mqtt"),
    object: require("./object"),
    spec: require("./spec"),
    tools: require("./tools")
};

/*
 * init()
 * Initializes the toolkit, returns Error or nothing.
 * name: a single-word name for the toolkit client, unique by agreement
 */
function init(name) {
    let error;
	// Setting process title to match Echelon coding standards e.g. echlogger, echhousekeeper etc. 
    process.title = "ech" + name;
    async.series(
        [
            function spec_init(spec_init_cb) {
                error = modules.spec.v0.init(name);
                spec_init_cb(error, "\n\tDone with spec init");
            },

            function config_init(config_init_cb) {
                error = modules.config.v0.init(name);
                if (!error) {
                    error = modules.config.v0.parse();
                }
                config_init_cb(error, "\n\tDone with config init");
            },

            function mqtt_init(mqtt_init_cb) {
                error = modules.mqtt.v0.init(
                    name,
                    modules.config.v0.get);
                mqtt_init_cb(error, "\n\tDone with mqtt init");
            },

            function log_init(log_init_cb) {
                error = modules.log.v0.init(
                    name,
                    modules.config.v0.get,
                    modules.mqtt.v0.publish
                );
                log_init_cb(error, "\n\tDone with log init");
            },
            function object_init(object_init_cb) {
                error = modules.object.v0.init(
                    name,
                    modules.config.v0.get,
                    modules.mqtt.v0.register,
                    modules.mqtt.v0.extract
                );
                object_init_cb(error, "\n\tDone with object init");
            },
            function singleton_init(lock_init_cb) {
                error = modules.singleton.v0.init(
                    name
                );
                lock_init_cb(error, "\n\tDone with lock init");
            }
        ],
        function(err, result) {
            error = err;
            if (error) {
                console.error(error);
                process.exit(1);
            }
        }
    );
}
/*
 * report_version()
 * Should be called once the MQTT client is connected. The function reports the
 * product name, copyright note and version numbers in MQTT and on the console.
 *
 * name: the same name as used to initialize the toolkit or portions thereof.
 * getter: the glp.v0.config.get function or an equivalent function.
 * publisher: the glp.v0.mqtt.publish or equivalent function.
 */
function report_version(name, getter, publisher) {
    let debug = getter(".debug");
    let verbosity = getter(".verbosity");

    if (debug || verbosity) {
        console.log(PRODUCT);
        console.log(COPYRIGHT);
    }

    for (let module in modules) {
        let base = "glp/0/./toolkit." + module + "/";
        publisher(
            base + "name", PRODUCT, 1, 1, null
        );
        publisher(
            base + "copyright", COPYRIGHT, 1, 1, null
        );
        publisher(
            base + "version", modules[module].v0.VERSION
        );
        if (debug || verbosity) {
            console.log(
                "toolkit." + module,
                modules[module].v0.VERSION
            );
        }
    }
}

exports.v0 = {
    // functions:
    init: init,
    report_version: report_version,

    // modules:
    config: modules.config.v0,
    log: modules.log.v0,
    singleton: modules.singleton.v0,
    mqtt: modules.mqtt.v0,
    object: modules.object.v0,
    spec: modules.spec.v0,
    tools: modules.tools.v0
};
