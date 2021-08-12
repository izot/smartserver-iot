/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (c) 2018 Echelon Corporation
 * MQTT module: provides a resilient client which automatically re-connects
 * when the connection drops, and re-subscribes when a connection is
 * (re-) established. Runtime errors, such as a dropped and re-established
 * connection to the broker, are reported through the GLP Generic Logger
 * Service and the syslog.
 * The module also provides a dispatcher service for incoming messages and
 * useful  utilities and monitors and preserves the segment identifier
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

"use strict";
const exec = require("child_process").execSync;
const EventEmitter = require("events").EventEmitter;
const level = require("level");
const _ = require("lodash");
const mqtt = require("mqtt");
const path = require("path");
const Qlobber = require("qlobber").Qlobber;
const sqlite3 = require("sqlite3").verbose();
const format_template = require("string-template");
const util = require("util");
const config = require("./config").v0;
const log = require("./log").v0;
let self = require("./package.json");
const lit = require("./spec").v0;
const tools = require("./tools").v0;

const version = tools.get_version(self.version);
const PERIOD = ".";
const GLP_DB = "glp.db";
const ADMIN_TABLE = "GLPAdminTable";
EventEmitter.defaultMaxListeners = Infinity;
// mqtt object which contains information required for connection and topics
let mqtt_cfg = {};

let macro_map = {};
const SID_TOPIC = "glp/0/././sid";
let global_sid = null,
    old_global_sid = null;
let mqtt_client, mqtt_connect_timeout;
let event_emitter = new SID();
/*
 * SID:
 * This function is used to call the methods of SID with 'this' context
 * This function extends two methods, provision and deprovision.
 * Provision method emits an event "provisioned" if there exists an SID value
 * which is either in the database or if an SID value is published on the topic
 * glp/0/././sid.
 * Deprovision method emits an event "deprovisioned" if an SID value does not
 * exist or if the segment is deprovisioned by publishing an empty string on
 * the topic glp/0/././sid
 */

function SID() {
    EventEmitter.call(this);
}
// SID class inherits all events of the EventEmitter class i.e. methods 'on'
// and 'emit'.
util.inherits(SID, EventEmitter);

SID.prototype.provision = function(old_sid, sid) {
    const that = this;
    /*
     * This interval is set to make sure that there are listeners to the
     * "provisioned" event before emitting the event with the old and new SID
     */
    let timer = setInterval(function() {
        if (mqtt_cfg[config.MQTT_CLIENT]) {
            if (that.listenerCount("provisioned") > 0) {
                that.emit("provisioned", old_sid, sid);
                log.debug(null, "Provisioning event emitted");
                clearInterval(timer);
            }
        }
    }, 3000);
};

SID.prototype.deprovision = function(old_sid) {
    const that = this;
    /*
     * This interval is set to make sure that there are listeners to the
     * "deprovisioned" event before emitting the event with the old SID
     */
    let timer = setInterval(function() {
        if (mqtt_cfg[config.MQTT_CLIENT]) {
            if (that.listenerCount("deprovisioned") > 0) {
                that.emit("deprovisioned", old_sid);
                log.debug(null, "De-provisioning event emitted");

                clearInterval(timer);
            }
        }
    }, 3000);
};

/*
 * populate_macro_map
 * This function will populate the map when the sid value changes
 * It also calls the provision method of SID() if the current_sid value exists
 * and calls the deprovision method of SID() if the current value of sid is
 * empty.
 */

function populate_macro_map(cur_sid) {
    if (cur_sid !== "" && cur_sid) {
        event_emitter.provision(old_global_sid, cur_sid);
    } else {
        if (old_global_sid) {
            event_emitter.deprovision(old_global_sid);
        }
    }

    const GLP = "glp/";

    macro_map[0] = GLP + "0/" + cur_sid;
    macro_map[1] = GLP + "1/" + cur_sid;
    macro_map[2] = GLP + "2/" + cur_sid;
    macro_map[3] = GLP + "3/" + cur_sid;
    macro_map[SID] = cur_sid;
}

/*
 * populate_mqtt_obj
 * This function will copy MQTT related data from config object
 * This function returns undefined.
 */
function populate_mqtt_obj(getter) {

    //Need to add period in the started for standard configuration options
    const opt = [
        config.MQTT_PORT,
        config.MQTT_BROKER,
        config.MQTT_USERNAME,
        config.MQTT_PASSWORD,
        config.MQTT_PROTOCOL,
        config.MQTT_VERSION,
        config.MQTT_CLIENTID,
        config.MQTT_CONNECT_TIMEOUT,
        config.MQTT_RECONNECT_PERIOD,
        config.GLP_DB_PATH
    ];

    for (let entry of opt) {
        mqtt_cfg[entry] = getter(PERIOD + entry);
    }
    mqtt_cfg[config.TOPICS] = {};
}

/*
 * read_sid_information:
 * This function opens the persistent database, creates a directory to the
 * database if the path does not exist.
 * This function returns a callback of the signature callback(db) where db is
 * the database handle.
 */
function read_sid_information(dbpath, callback) {
    let db = new sqlite3.Database(
                dbpath,
                sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
                function (error) {
                    if (!error) {
                        db.loadExtension(
                        mqtt_cfg.getter(
                            PERIOD + config.SQL_PCRE_PATH
                        )
                    );
                    callback(db);
                }
            }
    );

    db.on("error", function(error) {
        log.fatal(null, error);
    });
}


/*
 * get_sid_from_db:
 * This function reads the SID value from the persistent database and populates
 * the macro map with the current SID value.
 * This function returns undefined.
 */
function get_sid_from_db(err, db) {

    let cmd = "select * from " + ADMIN_TABLE + " where name = 'sid'";
    db.all(
        cmd,
        function(err, row) {
            if (!err) {
                if (row.length > 0) {
                    for (let entry of row) {
                        if (
                            typeof(entry.value) === typeof("") && 
                            entry.value !== "null" && entry.value !== "undefined" 
                        ) {
                            populate_macro_map(entry.value);
                            global_sid = entry.value;
                        }
                    }
                } else {
                    update_sid_in_admin_table(global_sid, false);
                }
            } else {
                log.mqtt(null, err);
            }
            db.close();
        }
    );

    db.on("error", function(error) {
        log.error(null, error);
    });
}

/*
 * read_glp_admin_tables:
 * This function creates an ADMIN table if it does not exist and calls the
 * get_sid_from_db function to get the SID value from the database.
 */
function read_glp_admin_tables(db) {

    let query;
    let params = "";

    const create_table_cmd = "CREATE TABLE if not exists ";
    params = "(name TEXT PRIMARY KEY, value TEXT)";
    query = create_table_cmd + ADMIN_TABLE + params;
    db.run(
        query,
        function(err) {
            if (err) {
                log.error(null, err);
            } else {
                get_sid_from_db(null, db);
            }
        }
    );

    db.on("error", function(error) {
        log.error(null, error);
    });
}

/*
 * init
 * initializes the module for a client with the given name, yields Error or
 * undefined for success.
 * The function accepts a getter with the signature of config.v0.get.
 */
function init(name, getter) {
    let error, err_msg;
    mqtt_cfg.getter = getter;
    mqtt_cfg.name = name;
    // Check if getter is supplied and not null
    if (!getter) {
        err_msg = "MQTT.init(): the 'getter' is missing";
        error = new Error(err_msg);
    }

    if (!error) {
        populate_mqtt_obj(mqtt_cfg.getter);

        //populate macro_map for sid independent topics
        const GLP = "glp/";
        const MACID = mqtt_cfg.getter("." + config.MACID);
        const LOG = "=logger/event";

        macro_map = {
            P0: GLP + "0/" + ":" + MACID,
            P1: GLP + "1/" + ":" + MACID,
            P2: GLP + "2/" + ":" + MACID,
            P3: GLP + "3/" + ":" + MACID,
            L0: GLP + "0/./" + LOG,
            MAC: ":" + MACID
        };

        read_sid_information(
            path.join(
                getter(PERIOD + config.GLP_DB_PATH),
                GLP_DB
            ),
            read_glp_admin_tables
        );
    }

    return error;
}

/*
 * This function publishes the name to glp/0/./=system/<service>/name,
 * copyright to glp/0/./=system/<service>/copyright and
 * version to glp/0/./=system/<service>/version.
 * These items are published with retain=1, QoS=1, whenever the service starts.
 * This function returns undefined
 */
function publish_service_details(name, copyright, version) {
    const NAME_TOPIC = "glp/0/./=system/" + name + "/name";
    const COPYRIGHT_TOPIC = "glp/0/./=system/" + name + "/copyright";
    const VERSION_TOPIC = "glp/0/./=system/" + name + "/version"; 
    name = "Echelon Generic " + name + " Service";
    
    publish(
        NAME_TOPIC,
        JSON.stringify(name),
        true,
        1,
        function (error, topic, message) {
            if (!error) {
                log.debug(topic, "Published ", message);

                publish(
                    COPYRIGHT_TOPIC,
                    JSON.stringify(copyright),
                    true,
                    1,
                    function (error, topic, message) {
                        if (!error) {
                            log.debug(topic, "Published ", message);
                            publish(
                                VERSION_TOPIC,
                                JSON.stringify(version),
                                true,
                                1,
                                function (error, topic, message) {
                                    if (!error) {
                                        log.debug(topic, "Published ", message);
                                    } else {
                                        log.error(topic, error);
                                    }
                                }
                            );
                        } else {
                            log.error(topic, error);
                        }
                    }
                );
            } else {
                log.error(topic, error);
            }
        }
    );
}

/*
 * merge_mqtt_options:
 * This function is used to return MQTT options after merging them with options
 * mentioned in the config file and the options mentioned in the code.
 * This function returns an object which contains the merged MQTT options.
 */
function merge_mqtt_options(required_options, user_options) {
    const mqtt_options_map = {
        username: required_options[config.MQTT_USERNAME],
        password: required_options[config.MQTT_PASSWORD],
        clientId: required_options[config.MQTT_CLIENTID],
        connectTimeout: required_options[config.MQTT_CONNECT_TIMEOUT],
        reconnectPeriod: required_options[config.MQTT_RECONNECT_PERIOD],
        protocolId: "MQTT",
        protocolVersion: required_options[config.MQTT_VERSION]
    };

    if (!user_options) {
        user_options = {};
    }

    for (let key in mqtt_options_map) {
        if (mqtt_options_map[key]) {
            user_options[key] = mqtt_options_map[key];
        }
    }
    return user_options;
}

/*
 * start_mqtt_timeout:
 * This function is used to start the connection timeout 
 */ 
function start_mqtt_timeout() {
    mqtt_connect_timeout = setTimeout(function() {
        log.mqtt(
            null, 
            mqtt_cfg.name, 
            ": could not connect to the message broker at ", 
            mqtt_cfg[config.MQTT_BROKER], 
            ":", 
            mqtt_cfg[config.MQTT_PORT]
        );
    }, 120000);
}

/*
 * connect
 * connects to the MQTT broker, yields Error in case of failure or undefined in
 * case of success.
 * The function re-connects when the connection drops and re-subscribes all
 * previously subscribed topics whenever a connection is established.
 */
function connect(options, connectEventsHandler) {
    let conn_options = {};
    let handler;
    // Create MQTT clientId
    mqtt_cfg[config.MQTT_CLIENTID] = mqtt_cfg.name + PERIOD +
        mqtt_cfg[config.MQTT_CLIENTID];

    // Creates an MQTT URL for connection
    const url = mqtt_cfg[config.MQTT_PROTOCOL] + "://" +
        mqtt_cfg[config.MQTT_BROKER] + ":" +
        mqtt_cfg[config.MQTT_PORT];
    // Sets MQTT options for connection
    // Connection option indices cannot be replaced by literals since
    // the indices are keywords
    conn_options = merge_mqtt_options(mqtt_cfg, options);
    mqtt_client = mqtt.connect(url, conn_options);
    start_mqtt_timeout(conn_options);

    /*
     * Event 'error': Emitted when there is an error in connection with
     * the broker.
     * This event returns a callback with the signature
     * callback(err, msg) where err is the error object if an error occurs and
     * msg is a string value which states "Error in connection" in case of
     * error.
     * It yields error diagnostics which are reported through log.
     */
    mqtt_client.on("error", function(error) {
        connectEventsHandler(error, null);
        log.fatal(null, error.message);
    });

    /*
     * Event 'offline': Emitted when the broker is unavailable or if the
     * client tries to connect with a duplicate client-id i.e. the client-id
     * is already in use by another client.
     * This event yields MQTT diagnostics which are reported through log.
     */
    mqtt_client.on("offline", function(error) {
        let err_msg = new Error("Client is offline");
        log.warning(null, err_msg);
        
        if (!mqtt_connect_timeout) {
            start_mqtt_timeout(conn_options);
        }
        
    });


    /*
     * Event 'reconnect': Emitted when the client tries to reconnect to the
     * broker in case of connection drops.
     * This event yields warning diagnostics which are reported through log.
     */
    mqtt_client.on("reconnect", function() {
        let err_msg = new Error("Reconnecting to MQTT broker");
        log.info(null, err_msg);
    });

    /*
     * Event 'connect': Emitted when the client tries to connect to the broker.
     * Username and password verification and validation is done by this
     * event before it connects to the MQTT broker successfully.
     * This event sends a callback after the client is successfully connected
     * with the following signature callback(err,msg) where err is an error
     * object in case of error and msg is a string.
     */
    mqtt_client.on("connect", function(connack) {
        mqtt_cfg[config.MQTT_CLIENT] = mqtt_client;
        if (mqtt_connect_timeout) {
            clearTimeout(mqtt_connect_timeout);
            mqtt_connect_timeout = null;
        }
        register(SID_TOPIC, {qos: 1}, process_sid_message, true);
        log.info(
            null,
            "Connected to broker ",
            mqtt_cfg[config.MQTT_BROKER],
            " at port ",
            mqtt_cfg[config.MQTT_PORT]
        );
        connectEventsHandler(null, connack.sessionPresent);
    });

    /*
     * Event 'message': Emitted when a message arrives for a subscribed topic.
     * In this function, the topic is matched with the registered topics in
     * mqtt_cfg object, when a match is found, the message is dispatched to the
     * registered handler.
     */
    mqtt_client.on("message", (topic, message) => {

        // Searches for the handler registered for the topic
        for (let each in mqtt_cfg[config.TOPICS]) {
            // If there is a match with the topic received and the topic subscribed,
            // the topic's corresponding handler is assigned from the config object
            // The handler function is then called with the signature
            // handler(err, subscription, topic, message) where err is null
            // because no error occurred
            if (match(each, topic)) {
                handler = mqtt_cfg[config.TOPICS][each];
                if (handler !== undefined) {
                    handler(null, each, topic, message);
                } else {
                    // no handler found calling default handler
                    handler = mqtt_cfg[config.TOPICS][null];
                    if (handler) {
                        let info_msg =
                            "Calling default handler, no handler found";
                        log.info(topic, info_msg);
                        handler(null, each, topic, message);
                    } else {
                        let err_msg = "No default handler found";
                        log.error(topic, err_msg);
                    }
                }
            }
        }
    });
}

/*
 * deregister
 * removes a subscription and the associated handler. This function always
 * succeeds even if there is no subscription
 */
function deregister(subscription, unsubscribe, callback) {
    let error, err_msg;
    let parsed_topic = resolve_mqtt_topic(subscription);
    if (unsubscribe) {
        mqtt_client.unsubscribe(
            parsed_topic,
            function(error) {
                if (!error) {
                    log.debug(parsed_topic, "Deregistering topic ");
                    delete mqtt_cfg[config.TOPICS][parsed_topic];
                    if (callback) {
                        callback(error);
                    }
                } else {
                    if (callback) {
                        callback(error);
                    } else {
                        log.error(subscription, error);
                    }
                }
            }
        );
    } else {
        if (callback) {
            callback(error);
        }
    }
}

/*
 * disconnect
 * disconnects client from the MQTT broker. The function always succeeds,
 * but it may disconnect gracefully or without grace.
 * Disconnecting ungracefully may yield error or warning diagnostics,
 * reported through log, but will not yield an Error result of this API.
 * This function unsubscribes if it is passed as a parameter otherwise the
 * client disconnects the connection gracefully, yields info diagnostics,
 * reported through log.
 */
function disconnect(unsubscribe, callback) {
    let error;
    if (mqtt_cfg[config.TOPICS].length > 0) {
        for (let each in mqtt_cfg[config.TOPICS]) {
            deregister(
                each,
                unsubscribe,
                function(error) {
                    if (!error) {
                        if (mqtt_cfg[config.TOPICS].length === 0) {
                            log.mqtt(null, "Disconnecting MQTT connection");
                            mqtt_cfg[config.MQTT_CLIENT].end();
                        }
                    } else {
                        log.error(each, error);
                    }
                    callback(error);
                }
            );
        }
    } else {
        if (mqtt_cfg[config.MQTT_CLIENT]) {
            log.mqtt(null, "Disconnecting MQTT connection");
            mqtt_cfg[config.MQTT_CLIENT].end();
        }
        callback(error);
    }

}


/*
 * resolve_mqtt_topic
 * This function inspect MQTT topics, looks for macros
 * if any, it replaces them and generate valid MQTT topic
 * in case of error, it returns null
 */

function resolve_mqtt_topic(topic) {
    let resolved_topic;
    if (topic) {
        resolved_topic = format_template(topic, macro_map);
    }
    return resolved_topic;
}

/*
 * This function is used to check whether the parameter passed is an object
 * and returns true or false
 */
function is_object(a) {
    return (!!a) && (a.constructor === Object);
}

/*
 * check_and_resolve_topic:
 * This function checks for nested topics in the object and resolves the topic
 * using resolve_mqtt_topic.
 * This function returns an object with the resolved topics.
 */
function check_and_resolve_topic(msg_object) {
    let result = msg_object;
    _.reduce(msg_object, function(result, value, key) {
        if (is_object(msg_object[key])) {
            check_and_resolve_topic(msg_object[key]);
        } else {
            if (msg_object.hasOwnProperty("topic")) {
                msg_object.topic = resolve_mqtt_topic(msg_object.topic);
            }
        }
    }, result);
    return result;
}

/*
 * publish
 * publishes message to topic, using retain and qos preferences. The
 * function calls a completion handler with this signature, if one was
 * provided: completion(err, topic, message) where topic, message match
 * the arguments to this function, err is an Error object if an error
 * occurred.
 */
function publish(topic, message, retain, qos, completion) {
    
    let options = {};
    let error;
    options.qos = qos;
    options.retain = retain;
    if (!topic) {
        error = new Error("Topic cannot be null or undefined");
    } 
    if (!(error instanceof Error)) {
        if (message) {
            try {
                let msg = JSON.parse(message);
                msg = check_and_resolve_topic(msg);
                message = JSON.stringify(msg);
            } catch (e) {
                log.error(topic, e);
            }
        }
    
        let parsed_topic = resolve_mqtt_topic(topic);
        if (parsed_topic instanceof Error) {
            error = parsed_topic;
        } else {
            if (mqtt_client) {
                mqtt_client.publish(
                    parsed_topic,
                    message,
                    options,
                    function(error) {
                        if (completion) {
                            completion(error, parsed_topic, message);
                        } else {
                            if (error instanceof Error) {
                                log.mqtt(parsed_topic, error);
                            }
                        }
                    }
                );
            }
        }
    } else {
        if (completion) {
            completion(error, topic, message);
        } else {
            log.mqtt(topic, error);
        }
    }
}

/*
 * register
 * subscribes to an MQTT topic (MQTT wildcards may be used), then invokes the
 * handler when a message on a matching topic is received. The handler has
 * this signature: handler(error, subscription, topic, message), where topic,
 * message are the topic and message actually received. Subscription is the
 * topic specified with the registration, and error is an Error object if an
 * error occurred.
 */
function register(topic, options, handler, subscribe, on_sub_done) {
    let parsed_topic = resolve_mqtt_topic(topic);
    let error, err_msg;
    if (!handler) {
        err_msg = "Handler can not be null";
        error = new Error(err_msg);
    }
    if (!error) {
        mqtt_cfg[config.TOPICS][parsed_topic] = handler;

        if (subscribe) {
            log.debug(parsed_topic, "Registering topic");
            mqtt_client.subscribe(
                parsed_topic, 
                options,
                function (err, granted) {
                    if (granted && granted.length && granted[0].qos === 128) {
                        let err_msg = "Subscription to topic "+ granted[0].topic + " failed" ;
                        if (on_sub_done) {
                            on_sub_done(err_msg);
                        } else {
                            log.mqtt(granted[0].topic, err_msg);
                        }
                    } else {
                        if (on_sub_done) {
                            on_sub_done();
                        }
                    }
                }
            );
        } else {
            if (on_sub_done) {
                on_sub_done();
            }
        }
    } else {
        if (on_sub_done) {
            on_sub_done(error);
        }
    }
}


/*
 * extract
 * takes a matching subscription, topic pair and returns an ordered list of
 * topic values for the wildcards in the subscription. For example,
 * extract('glp/0/+/rq/job/+/#', 'glp/0/seg.23/rq/job/1234/do')
 * yields [ 'seg.23', '1234', 'do' ].
 * The function always returns an array of strings, which might be empty if
 * no extractions are found.
 */
function extract(subscription, topic) {
    const subscriptionFields = subscription.split("/");
    const topicFields = topic.split("/");
    let result = [];

    for (let index in subscriptionFields) {
        const element = subscriptionFields[index];
        if (element === "+") {
            result.push(
                topicFields[index]
            );
        } else if (element === "#") {
            if (topicFields.slice(index).join("/") !== "") {
                result.push(
                    topicFields.slice(index).join("/")
                );
            }
            break;            
        }
    }
    return result;
}

/*
 * match
 * returns a boolean to indicate whether the topic matches the subscription.
 * For example, match('glp/0/#', 'glp/0/test') yields true, but
 * match('glp/1/#', 'glp/0/test') yields false.
 */
function match(sub, topic) {
    let matched = false;
    let options = {
        separator: "/",
        wildcard_one: "+",
        wildcard_some: "#"
    };
    let matcher = new Qlobber(options);
    matcher.add(sub, true);
    let result = matcher.match(topic);
    if (result[0]) {
        matched = result[0];
    }
    return matched;
}

/*
 * transform
 * The transform function transforms one topic into an other: if ch is not null,
 * the function changes the given topic's GLP channel to the value of ch.
 * If tail is not null, the function replaces the given topic's tail end with
 * n elements with the value of tail:
 * v0.transform(topic, ch, tail, n) => string
 * For example, transform('glp/0/seg.23/rq/dev/lt/3/do',
                          glp.v0.spec.FEEDBACK_CHANNEL,
                          glp.v0.spec.CONFIG_OBJECT, 1)
 * yields 'glp/0/seg.23/fb/dev/lt/3/cfg'.
 */
function transform(topic, ch, tail, n) {
    let transformed_topic = topic;
    let split_topic = topic.split("/");
    if (ch) {
        split_topic[3] = ch;
    }
    if (tail) {
        split_topic.splice(-1, n);
        split_topic.push(tail);
    }
    transformed_topic = split_topic.join("/");
    return transformed_topic;
}

/*
 * update_sid_in_admin_table:
 * This function updates the sid in the admin table. It also accepts a flag
 * update which may be set to false if the SID needs to be inserted.
 * If the update flag is set, the SID value is updated in the database.
 */
function update_sid_in_admin_table(sid, update) {
    let db = new sqlite3.Database(
        path.join(mqtt_cfg[config.GLP_DB_PATH], GLP_DB),
        sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
        function(error) {
            if (error) {
                log.fatal(null, error);
            } else {
                let query = "";
                db.loadExtension(
                    config.get(PERIOD + config.SQL_PCRE_PATH)
                );
                db.configure("busyTimeout", 15000);
                if (sid === null) {
                    sid = "";
                }
                query = "INSERT OR REPLACE INTO " + ADMIN_TABLE +
                        "(name, value) VALUES('sid','" + sid + "');";
            
                db.run(query, function(error) {
                    if (error) {
                        log.error(null, error);
                    } 
                });
                db.close();
            }
        }
    );
}

/*
 * process_sid_message:
 * This function receives messages for the SID topic glp/0/././sid
 * This function checks if the global sid matches the sid value received in the
 * message and updates the SID in the macro map and the database table.
 */
function process_sid_message(error, subscription, topic, msg) {
    let sid, err;
    if (!error) {
        try {
            sid = JSON.parse(msg.toString());
        } catch (e) {
            error = e;
        }

        if (sid !== null) {
            if (
                typeof(sid) !== typeof("") || 
                (typeof(sid) === typeof("") && 
                (sid === "null" || sid === "undefined")) 
            ) {
                let err_msg = "Invalid type for SID, expected type for SID is " + 
                typeof("") + " got type: " + typeof(sid);
                error = new Error(err_msg);
            }
        }

        if (!error) {
            if (global_sid !== sid) {
                update_sid_in_admin_table(sid, true);
                old_global_sid = global_sid;
                global_sid = sid;
                populate_macro_map(sid);
            }
        }
    }
    if (error) {
        log.error(topic, error);
    }
}

exports.v0 = {
    VERSION: version,
    init: init,
    connect: connect,
    disconnect: disconnect,
    publish: publish,
    register: register,
    deregister: deregister,
    extract: extract,
    match: match,
    transform: transform,
    resolve_mqtt_topic: resolve_mqtt_topic,
    publish_service_details: publish_service_details,
    SID: event_emitter
};
