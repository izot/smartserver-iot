/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (c) 2018 Echelon Corporation
 */

/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

"use strict";
const deep_merge = require("deepmerge");
const fs = require("fs");
const json_file = require("json-file");
const exec = require("child_process").execSync;
const level = require("level");
const Jobs = require("level-jobs");
const _ = require("lodash");
const moment = require("moment-timezone");
const mqtt_regex = require("mqtt-regex");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const config = require("./config").v0;
const log = require("./log").v0;
const mqtt = require("./mqtt").v0;
let self = require("./package.json");
const lit = require("./spec").v0;
const tools = require("./tools").v0;

const version = tools.get_version(self.version);
const eventEmitter = mqtt.SID;
const TIME_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS ";
const PERIOD = ".";
const GLP_DB = "glp.db";
const JOB_DBNAME = "mqttjobs";

let client_name;
let mqtt_subscriber, mqtt_extracter, config_getter;
let db, action_db, action_queue;
let service_obj = {};
let list_of_objects = false;
let registered_topics = [];
let current_service_name = "";
let global_sid;

/*
 * init
 * initializes the module for a client with the given name, yields Error or
 * nothing for success.
 * The function accepts a getter with the signature of config.v0.get,
 * a subscriber with a signature or mqtt.v0.register, and an extracter with a
 * signature of mqtt.v0.extract.
 */
function init(name, getter, subscriber, extracter) {
    let err, err_msg;
    client_name = name;
    if (!getter) {
        err_msg = "Getter function is undefined or null";
        err = new Error(err_msg);
    }
    config_getter = getter;

    if (!err) {
        if (!subscriber) {
            err_msg = "Subscriber function is undefined or null";
            err = new Error(err_msg);
        }
    }
    mqtt_subscriber = subscriber;

    if (!err) {
        if (!extracter) {
            err_msg = "Extracter function is undefined or null";
            err = new Error(err_msg);
        }
    }
    mqtt_extracter = extracter;

    if (!err) {
        const maxConcurrency = 1;
        const dbname = getter(
            PERIOD + config.GLP_DB_PATH
        );

        create_database(dbname);


        let db_folder = name;

        if (name === lit.OBJECT_TYPE_CONNECTION) {
            db_folder = "connection";
        }
        // Create a service directory path in the persistence database.
        const service_db_path = path.join(
            config_getter(
                PERIOD + config.PERSISTENCE_PATH
            ),
            db_folder
        );

        if (!fs.existsSync(service_db_path)) {
            try {
                fs.mkdirSync(service_db_path);
            } catch (error) {
                err = error;
            }
        }

        if (!err) {
            // Create a level database for mqtt jobs to process one job at a time

            const level_db_path = path.join(
                config_getter(PERIOD + config.PERSISTENCE_PATH),
                db_folder,
                JOB_DBNAME
            );

            action_db = level(
                level_db_path,
                function (error) {
                    if (error) {
                        log.error(null, error);
                    }
                }
            );

            action_queue = Jobs(
                action_db,
                action_worker,
                maxConcurrency
            );

            action_queue.on(
                "error",
                function (error) {
                    log.fatal(null, error);
                }
            );


        } else {
            log.fatal(null, err);
        }
    }

    // This listens for the event provisioned which is only called when the
    // SID is not null, i.e. the segment is provisioned.
    eventEmitter.on(
        "provisioned",
        function (old_sid, sid) {
            // This checks if an object is registered before registering to the
            // do and cfg topics.
            global_sid = sid;
            if (!_.isEmpty(service_obj)) {
                if (registered_topics.length > 0) {
                    for (let topic of registered_topics) {
                        deregister_topic(topic);
                    }
                }
                register_topics(sid);
            }
        }
    );

    eventEmitter.on(
        "deprovisioned",
        function (old_sid) {
            if (!_.isEmpty(service_obj)) {
                if (registered_topics.length > 0) {
                    for (let topic of registered_topics) {
                        deregister_topic(topic);
                    }
                    registered_topics = [];
                }
                clean_db(
                    function (error) {
                        if (!(error instanceof Error)) {
                            log.info(
                                null,
                                "Cleaned database for object"
                            );
                        } else {
                            log.error(null, error);
                        }
                    }
                );
            }
        }
    );

    return err;
}

/*
 * This function picks jobs from the persistent job queue and executes them
 * one at a time.
 * This function calls the do object handler with the current job's error,
 * handle, args, action and topic.
 */
function action_worker(id, event, callback) {
    do_object_handler(
        event.error,
        event.handle,
        event.args,
        event.action,
        event.topic,
        callback
    );
}

/*
 * This function deregisters old SID related topics and removes them from the
 * global list of registered topics.
 * This function returns undefined
 */
function deregister_topic(topic) {
    mqtt.deregister(
        topic,
        true,
        function (error) {
            if (error) {
                log.error(topic, error);
            } else {
                log.info(topic, "Deregistering topic");
            }
        }
    );
}

/*
 * register_topics:
 * This function is used to register to do and cfg topics when the
 * segment controller is provisioned.
 */
function register_topics(sid) {
    let do_topic, cfg_topic, err, wildcard_topic;
    for (let each in service_obj) {
        if (each === lit.OBJECT_TYPE_GROUP) {
            wildcard_topic = topic_builder(
                lit.GLP,
                lit.GLP_PROTOCOL_VERSION,
                sid,
                lit.REQUEST_CHANNEL,
                each,
                "#"
            );
            err = mqtt_subscriber(wildcard_topic, {
                qos: 1
            }, wildcard_topic_handler, true);
            if (!err) {
                registered_topics.push(wildcard_topic);
            } else {
                log.error(null, err);
            }
        } else if (each === lit.OBJECT_TYPE_DEVICE) {
            do_topic = topic_builder(
                lit.GLP,
                lit.GLP_PROTOCOL_VERSION,
                sid,
                lit.REQUEST_CHANNEL,
                each,
                "+",
                "+",
                "do"
            );

            err = mqtt_subscriber(do_topic, {
                qos: 1
            }, do_topic_handler, true);
            if (!err) {
                registered_topics.push(do_topic);
            } else {
                log.error(null, err);
            }

            cfg_topic = topic_builder(
                lit.GLP,
                lit.GLP_PROTOCOL_VERSION,
                sid,
                lit.REQUEST_CHANNEL,
                each,
                "+",
                "+",
                lit.CONFIG_OBJECT,
                "#"
            );

            err = mqtt_subscriber(cfg_topic, {
                qos: 1
            }, cfg_device_topic_handler, true);
            if (!err) {
                registered_topics.push(cfg_topic);
            } else {
                log.error(null, err);
            }
        } else {
            do_topic = topic_builder(
                lit.GLP,
                lit.GLP_PROTOCOL_VERSION,
                sid,
                lit.REQUEST_CHANNEL,
                each,
                "+",
                "do"
            );
            err = mqtt_subscriber(do_topic, {
                qos: 1
            }, do_topic_handler, true);
            if (!err) {
                registered_topics.push(do_topic);
            } else {
                log.error(null, err);
            }

            cfg_topic = topic_builder(
                lit.GLP,
                lit.GLP_PROTOCOL_VERSION,
                sid,
                lit.REQUEST_CHANNEL,
                each,
                "+",
                lit.CONFIG_OBJECT,
                "#"
            );

            err = mqtt_subscriber(cfg_topic, {
                qos: 1
            }, cfg_topic_handler, true);
            if (!err) {
                registered_topics.push(cfg_topic);
            } else {
                log.error(null, err);
            }
        }

    }
}

function wildcard_topic_handler(error, subscription, topic, message) {
    let cfg_topic_regex = /^glp\/0\/[^/]+\/rq\/[^/]+\/[^/]+\/cfg/;
    let do_topic_regex = /^glp\/0\/[^/]+\/rq\/[^/]+\/[^/]+\/do$/;
    if (do_topic_regex.test(topic)) {
        do_topic_handler(error, subscription, topic, message);
    } else if (cfg_topic_regex.test(topic)) {
        cfg_topic_handler(error, subscription, topic, message);
    } else {
        let current_service_name = mqtt.extract("glp/0/+/rq/+/+", topic);
        current_service_name = current_service_name[1];
        service_obj[current_service_name].wildcard_handler(error, subscription, topic, message);
    }
}

/*
 * register
 * registers an object type, returns Error unless successful.
 * name is the name of the object type, use spec.v0.OBJECT_TYPE_*
 * actions is an instance of the Actions class, see actions() in this modules
 * obj_template, obj_constraints, status_template are template and status
 * objects. Prefer using templates and constraints from spec.v0.*
 */
function register(
    name,
    actions,
    obj_template,
    obj_constraints,
    sts_template,
    states,
    publishToFeedback,
    wildcard_handler
) {
    let err, err_msg;
    if (!name) {
        err_msg = "name is undefined or null";
        err = new Error(err_msg);
    }

    if (!err) {
        if (!actions) {
            err_msg = "actions is undefined or null";
            err = new Error(err_msg);
        }
    }

    if (!err) {
        if (!obj_template) {
            err_msg = "obj_template is undefined or null";
            err = new Error(err_msg);
        }
    }

    if (!err) {
        if (!sts_template) {
            err_msg = "sts_template is undefined or null";
            err = new Error(err_msg);
        }
    }

    if (!err) {
        if (publishToFeedback === undefined || publishToFeedback === null) {
            publishToFeedback = true;
        }
    }

    current_service_name = name;

    service_obj[name] = {};
    service_obj[name].action = actions;
    service_obj[name].obj_template = obj_template;
    service_obj[name].obj_constraints = obj_constraints;
    service_obj[name].sts_template = sts_template;
    service_obj[name].table_name = name.replace("/", "_") + "_tbl";
    if (states) {
        states = states.split("|");
    }
    service_obj[name].states = states;
    service_obj[name].publish = publishToFeedback;
    if (wildcard_handler) {
        service_obj[name].wildcard_handler = wildcard_handler;
    }

    if (!err) {
        err = create_table();
    }
    return err;
}

/** 
 * cfg_device_topic_handler:
 * This function is a handler to the topic glp/0/SID/rq/<service_name>/dev/+/+/cfg/#
 */
function cfg_device_topic_handler(error, subscription, topic, message) {
    //returns an ordered list of topic values for the wildcards in the subscription
    let args = mqtt_extracter(subscription, topic);
    let stringified_message = message.toString();
    let partial_cfg_object = {},
        action, temp;
    let regex = /^glp\/0\/[^/]+\/rq\/dev\/[^/]+\/[^/]+\/cfg\//;
    let parsed_message_object;
    if (stringified_message) {
        try {
            parsed_message_object = JSON.parse(stringified_message);
        } catch (e) {
            error = e;
            log.error(topic, error);
        }
    }
    if (parsed_message_object === undefined) {
        parsed_message_object = null;
    }

    if (!error) {
        let handle = args[0];
        if (args.length > 2) {
            // Removes the handle from the ordered list of topic values.
            args.splice(0, 2);
            args = args[0].split("/");
            for (let property = args.length - 1; property >= 0; property--) {
                // For each property in the ordered list of arguments, a partial
                // cfg object is formed and the object is reassigned to the args
                // variable.
                if (property === args.length - 1) {
                    partial_cfg_object[args[property]] = parsed_message_object;
                } else {
                    temp = {};
                    temp[args[property]] = partial_cfg_object;
                    partial_cfg_object = temp;
                }
            }
        } else {
            // If there are no deep topics found i.e.
            // there is nothing found in after cfg in
            // glp/0/SID/rq/<SERVICE_NAME>/+/cfg/#
            partial_cfg_object = {};
            // Logs a warning if the message published is null on the cfg topic
            // and considers it as a normal update action with an empty object.
            if (!stringified_message) {
                log.warning(topic, "Object published on cfg is null");
            } else {
                partial_cfg_object = JSON.parse(stringified_message);
            }
        }
        action = "update";
        if (!(/cfg$/).test(topic)) {
            // Topic is extracted without cfg to query the database, since the
            // database stores the topic without the "do" and the "cfg" suffix
            topic = topic.match(regex)[0];
            topic = topic.replace(/\/cfg\//, "");
        } else {
            topic = topic.replace(/\/cfg/, "");
        }
        let obj = {
            error: null,
            handle: handle,
            args: partial_cfg_object,
            action: action,
            topic: topic
        };
        action_queue.push(obj);
    }
}

/*
 * cfg_topic_handler:
 * This function is a handler to the topic glp/0/SID/rq/<service_name>/+/cfg/#
 * This function is used to handle deep topic assignments on the cfg request
 * channel and update or delete the created object.
 */
function cfg_topic_handler(error, subscription, topic, message) {
    //returns an ordered list of topic values for the wildcards in the subscription
    let args = mqtt_extracter(subscription, topic);
    let stringified_message = message.toString();
    let partial_cfg_object = {},
        action, temp;
    let regex = /^glp\/0\/[^/]+\/rq\/[^/]+\/[^/]+\/cfg\//;
    let parsed_message_object;
    if (stringified_message) {
        try {
            parsed_message_object = JSON.parse(stringified_message);
        } catch (e) {
            error = e;
            log.error(topic, error);
        }
    }
    if (parsed_message_object === undefined) {
        parsed_message_object = null;
    }

    if (!error) {
        let handle = args[0];
        if (args.length > 1) {
            // Removes the handle from the ordered list of topic values.
            args = args.splice(1);
            args = args[0].split("/");
            for (let property = args.length - 1; property >= 0; property--) {
                // For each property in the ordered list of arguments, a partial
                // cfg object is formed and the object is reassigned to the args
                // variable.
                if (property === args.length - 1) {
                    partial_cfg_object[args[property]] = parsed_message_object;
                } else {
                    temp = {};
                    temp[args[property]] = partial_cfg_object;
                    partial_cfg_object = temp;
                }
            }
        } else {
            // If there are no deep topics found i.e.
            // there is nothing found in after cfg in
            // glp/0/SID/rq/<SERVICE_NAME>/+/cfg/#
            partial_cfg_object = {};
            // Logs a warning if the message published is null on the cfg topic
            // and considers it as a normal update action with an empty object.
            if (!stringified_message) {
                log.warning(topic, "Object published on cfg is null");
            } else {
                partial_cfg_object = JSON.parse(stringified_message);
            }
        }
        action = "update";
        if (!(/cfg$/).test(topic)) {
            // Topic is extracted without cfg to query the database, since the
            // database stores the topic without the "do" and the "cfg" suffix
            topic = topic.match(regex)[0];
            topic = topic.replace(/\/cfg\//, "");
        } else {
            topic = topic.replace(/\/cfg/, "");
        }
        let obj = {
            error: null,
            handle: handle,
            args: partial_cfg_object,
            action: action,
            topic: topic
        };
        action_queue.push(obj);
    }
}

/*
 * topic_builder:
 * This function is used to return an mqtt topic by concatenating the arguments
 * passed with a "/" separator.
 */
function topic_builder( /* ... */ ) {
    return Array.prototype.slice.call(arguments).join("/");
}

/*
 * create_database
 * This function opens the persistent database initialises the database handle.
 */
function create_database(dbname) {
    db = new sqlite3.Database(
        path.join(dbname, GLP_DB),
        sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
        function (error) {
            if (error instanceof Error) {
                log.fatal(null, error);
            } else {
                db.run("PRAGMA journal_mode = MEMORY");
                db.run("PRAGMA synchronous = OFF");
                db.run("PRAGMA temp_store = MEMORY");
                db.run("PRAGMA cache_size = -1024");
                db.loadExtension(config.get(PERIOD + config.SQL_PCRE_PATH));
                db.configure("busyTimeout", 5000);
            }
        }
    );
}

/*
 * clean_database:
 * This function is used to drop the object table when the segment is
 * deprovisioned
 * This function returns a callback after cleaning the table with an error or
 * null.
 */
function clean_db(callback) {
    for (let each in service_obj) {
        let cmd = "DELETE FROM " + service_obj[each].table_name;
        db.run(
            cmd,
            function (error) {
                callback(error);
            }
        );
    }
}


/*
 * create_table:
 * This function creates an object table. The table name is derived from the
 * service name e.g. for a job service the table name will be job_tbl.
 * This function returns undefined.
 */
function create_table() {
    let obj_template_keys = Object.keys(service_obj[current_service_name].obj_template);
    let query = "CREATE TABLE if not exists ";
    let tbl_params = " (topic TEXT PRIMARY KEY, " + " handle TEXT," +
        " object TEXT)";
    let sub_query = service_obj[current_service_name].table_name + tbl_params;
    query = query + sub_query;
    db.run(query, function (error) {
        if (error) {
            log.fatal(null, error);
        } else {
            if (global_sid) {
                register_topics(global_sid);
            }
        }
    });
}

/*
 * insert_into_db:
 * This function inserts an object in the database
 * This function has a callback with a signature callback(error) where error
 * will be an error object or undefined.
 */
function insert_into_db(table_name, obj_str, topic, handle, callback) {
    let query;
    obj_str = "'" + obj_str + "'";
    query = "INSERT INTO " + table_name +
        " VALUES(" + "\'" + topic + "\'" + ", " +
        "\'" + handle + "\' ," + obj_str + ")";
    db.run(query, function (err, row) {
        callback(err);
    });
}

/*
 * update_in_db:
 * This function updates the object in the database.
 * This function has a callback with a signature callback(error) where error
 * will be an error object or undefined.
 */
function update_in_db(table_name, updated_object, topic, handle, callback) {
    let query, ret;
    let my_obj = {};
    updated_object = "'" + updated_object + "'";
    query = "UPDATE " + table_name + " SET object = " + updated_object +
        "where topic = \'" + topic + "\'";
    db.run(query, function (err, row) {
        callback(err);
    });
}

/*
 * delete_from_db:
 * This function is used for deleting an object from the database
 * This function has a callback of the signature callback(error) where
 * error is either an error object or undefined
 */

function delete_from_db(table_name, topic, handle, callback) {
    let query, ret;
    query = "DELETE FROM " + table_name +
        " where topic = \'" + topic + "\'";
    db.run(query, function (err, row) {
        callback(err);
    });
}

/*
 * publish_cfg_object:
 * This function publishes the config object on the feedback channel.
 * This function returns undefined.
 */
function publish_cfg_object(topic, cfg_obj) {
    let timestamp_utc = moment().utc().format(TIME_FORMAT) +
        "UTC";
    if (cfg_obj) {

        let d = new Date();

        let timestamp_utc = moment(d).utc().format(TIME_FORMAT) +
            "UTC";

        cfg_obj.mru = timestamp_utc;
        cfg_obj = JSON.stringify(cfg_obj);
    }

    topic = mqtt.transform(topic, lit.FEEDBACK_CHANNEL, "cfg", 0);
    mqtt.publish(
        topic,
        cfg_obj,
        true,
        1,
        function (err, topic, msg) {
            if (err) {
                log.error(topic, err);
            } else {
                log.debug(topic, "Published ", msg);
            }
        }
    );
}

/*
 * publish_sts_object:
 * This function publishes a status object on the feedback channel if the state
 * exists in the service states template. This function also dequeues the job
 * queue by calling the global callback.
 * This function returns undefined.
 */

function publish_sts_object(topic, state) {
    let timestamp_utc = moment().utc().format(TIME_FORMAT) + "UTC";
    topic = mqtt.transform(topic, lit.FEEDBACK_CHANNEL, "sts", 0);
    let status_template = JSON.parse(
        JSON.stringify(
            service_obj[current_service_name].sts_template
        )
    );

    if (service_obj[current_service_name].states.includes(state)) {
        status_template.state = state;
        status_template.mru = timestamp_utc;
        mqtt.publish(
            topic,
            JSON.stringify(status_template),
            true,
            1,
            function (err, topic, msg) {
                if (err) {
                    log.error(topic, err);
                } else {
                    log.debug(topic, "Published ", msg);
                }
            }
        );
    }
}

/*
 * do_object_handler:
 * This function is used to process the action received on the do topic.
 * This function returns undefined
 */
function do_object_handler(error, handle, args, action, topic, on_job_done) {
    if (!error) {
        current_service_name = Object.keys(service_obj)[0];
        // current_service_name = mqtt.extract("glp/0/+/rq/+/+", topic);
        // current_service_name = current_service_name[1];
        get(
            current_service_name,
            topic,
            function (it) {
                let item = null;
                let entry = it.next();
                if (entry.value) {
                    item = JSON.parse(entry.value.object);
                }
                if (service_obj[current_service_name].action[action]) {
                    error = service_obj[current_service_name].action[action].validate(
                        error,
                        topic,
                        handle,
                        action,
                        args,
                        item,
                        on_job_done
                    );
                    if (!error) {
                        error = service_obj[current_service_name].action[action].execute(
                            topic,
                            handle,
                            action,
                            args,
                            item,
                            on_job_done
                        );
                        service_obj[current_service_name].action[action].complete(
                            error,
                            topic,
                            handle,
                            action,
                            args,
                            item
                        );
                    } else {
                        log.error(topic, error);
                    }
                } else {
                    if (service_obj[current_service_name].action["."]) {
                        error = service_obj[current_service_name].action["."].validate(
                            error,
                            topic,
                            handle,
                            action,
                            args,
                            item,
                            on_job_done
                        );
                        if (!error) {
                            error = service_obj[current_service_name].action["."].execute(
                                topic,
                                handle,
                                action,
                                args,
                                item,
                                on_job_done
                            );
                            service_obj[current_service_name].action["."].complete(
                                error,
                                topic,
                                handle,
                                action,
                                args,
                                item
                            );
                        } else {
                            log.error(topic, error);
                        }
                    } else {
                        error = "Unknown action " + action;
                        log.error(topic, error);
                        on_job_done();
                    }

                }
            }
        );
    } else {
        log.error(topic, error);
        on_job_done();
    }
}

/*
 * do_topic_handler:
 * This function is a callback function which receives messages from the do 
 * topic. This function parses the message received and calls a callback 
 * function which further executes the action received in the message.
 * This function returns undefined
 */
function do_topic_handler(error, subscription, topic, message) {
    if (!error) {
        try {
            let parsed_message_object = JSON.parse(message.toString());
            parse_do_topic(topic, parsed_message_object);
        } catch (error) {
            log.error(topic, error);
        }
    }
}

/*
 * Action
 * Object for validator, executer and completer methods for each action
 * like "create" will have object type Action
 */
function Action(validator, executer, completer) {

    if (validator) {
        this.validate = validator;
    }

    if (executer) {
        this.execute = executer;
    }

    if (completer) {
        this.complete = completer;
    }
}

/*
 * default_validate_action:
 * When	null is passed for the validator, the object module	considers	the
 * request valid.
 * This function returns an error or undefined.
 */
function default_validate_action(
    error,
    topic,
    handle,
    action,
    args,
    item,
    on_job_done
) {
    if (error) {
        on_job_done(null);
    }
    return error;
}

/*
 * validate_and_merge_object:
 * This function creates a new object from the object template, then overrides
 * any of its members which were provided with the create arguments, if any.
 * Arguments which do not correspond to a known property are ignored.
 * This is subject to validation and constraints.
 * This function returns the new object after overriding the object template.
 */
function validate_and_merge_object(
    proposed_object,
    current_object,
    constraints
) {
    let property, ret, validated_object;

    // In order to avoid changes to object_template in validate_and_merge a new
    // memory location needs to be allocated to the variable 'validated_object'.
    // So the JSON.parse(JSON.stringify(object_template)) is used to allocate
    // a new memory location.
    validated_object = JSON.parse(JSON.stringify(current_object));
    for (property in proposed_object) {
        if (property in validated_object) {
            if (constraints) {
                ret = approve(
                    property,
                    current_object[property],
                    proposed_object[property],
                    constraints[property]
                );

            } else {
                ret = approve(
                    property,
                    current_object[property],
                    proposed_object[property],
                    null
                );

            }
            if (ret instanceof Error) {
                validated_object = ret;
                break;
            } else {
                let return_type = get_type(ret);
                if (
                    return_type === lit.TYPE_LIST + lit.TYPE_OBJECT ||
                    return_type === lit.TYPE_LIST ||
                    return_type === lit.TYPE_OBJECT
                ) {
                    if (!current_object[property]) {
                        validated_object[property] = _.merge({},
                            ret
                        );
                    } else {
                        validated_object[property] = _.merge(
                            validated_object[property],
                            current_object[property],
                            ret
                        );
                    }
                } else {
                    validated_object[property] = ret;
                }
            }
        }
    }
    return validated_object;
}

/*
 * dafault_execute_action:
 * This function creates a new object from the object template, then overrides
 * any of its members which were provided with the create arguments, if any.
 * Arguments which do not correspond to a known property are ignored.
 * This is subject to validation and constraints.
 * The complete object is stored in the database and published as the
 * cfg object in the feedback channel.
 * This function can create an object with the
 * same handle as one which already exists provided that the new object is the
 * same as the existing object.
 * In the event of a duplicate create(), cfg and sts objects are published in 
 * the feedback channel.
 * If a different object already exists with the same handle,
 * this function fails with error.
 * After the function is executed, a final callback on_job_done() is called.
 * This function returns error or object.
 */
function default_execute_create_action(
    topic,
    handle,
    action,
    args,
    item,
    on_job_done
) {
    try {
        let transformed_obj, error, duplicate_create = false;
        let proposed_value = {};
        Object.assign(
            proposed_value,
            service_obj[current_service_name].obj_template,
            args
        );
        if (!item) {
            transformed_obj = validate_and_merge_object(
                proposed_value,
                service_obj[current_service_name].obj_template,
                service_obj[current_service_name].obj_constraints
            );
            error = transformed_obj;

        } else {
            transformed_obj = validate_and_merge_object(
                proposed_value,
                item,
                service_obj[current_service_name].obj_constraints
            );
            error = transformed_obj;
        }

        if (item) {
            delete item.mru;
        }

        if (transformed_obj) {
            delete transformed_obj.mru;
        }

        if (!(error instanceof Error)) {
            // if obj is null or undefined, it means its not present in
            // the database
            if (item) {
                //check if args have the same values as item
                if (!(_.isEqual(item, transformed_obj))) {
                    error = "Handle already exists with a " +
                        "different object: " + JSON.stringify(item);
                    error = new Error(error);
                    if (action === lit.ACTION_CREATE && service_obj[current_service_name].publish) {
                        publish_sts_object(topic, lit.STATE_FAILED);
                    }
                } else {
                    // Publish duplicate create cfg and sts on fb channel
                    if (action === lit.ACTION_CREATE && service_obj[current_service_name].publish) {
                        publish_cfg_object(topic, transformed_obj);
                        publish_sts_object(topic, lit.STATE_CREATED);
                    }
                }
                duplicate_create = true;
            }

            if (!(error instanceof Error) && !duplicate_create) {
                insert_into_db(
                    service_obj[current_service_name].table_name,
                    JSON.stringify(transformed_obj),
                    topic,
                    handle,
                    function (err) {
                        if (!err) {
                            log.debug(topic, "Created object in database");
                            if (action === lit.ACTION_CREATE && service_obj[current_service_name].publish) {
                                publish_cfg_object(topic, transformed_obj);
                                publish_sts_object(topic, lit.STATE_CREATED);
                            }
                        } else {
                            log.error(topic, err);
                        }
                    }
                );
            }
        }
        return error;
    } catch (error) {
        log.error(topic, error);
    } finally {
        on_job_done(null);
    }
}

/*
 * default_execute_update_action:
 * This function fetches the existing object, aborts with error if not found.
 * This function overrides any of the members in the existing object
 * which were provided with the update arguments, if any.
 * Arguments which do not correspond to a known property are ignored.
 * All overriding is subject to validation and constraints.
 * The updated object in the database is stored.
 * Current cfg and sts objects are published in the feedback channel.
 * After the function is executed, a final callback on_job_done() is called.
 * This function returns error or the object.
 */
function default_execute_update_action(
    topic,
    handle,
    action,
    args,
    item,
    on_job_done
) {
    try {
        let updated_object, error;
        if (!item) {
            error = "Object for topic " + topic +
                " was not found in the database";
            error = new Error(error);
            if (service_obj[current_service_name].publish) {
                publish_sts_object(topic, lit.STATE_FAILED);
            }
        }
        if (!(error instanceof Error)) {
            let proposed_value = {};
            Object.assign(
                proposed_value,
                item,
                args
            );

            updated_object = validate_and_merge_object(
                proposed_value,
                item,
                service_obj[current_service_name].obj_constraints
            );

            if (!(updated_object instanceof Error)) {
                update_in_db(
                    service_obj[current_service_name].table_name,
                    JSON.stringify(updated_object),
                    topic, handle,
                    function (err) {
                        if (!err && service_obj[current_service_name].publish) {
                            publish_cfg_object(topic, updated_object);
                            publish_sts_object(topic, lit.STATE_UPDATED);
                        } else if (err) {
                            log.error(topic, err);
                        }
                    }
                );
            }
            error = updated_object;
        }
        return error;
    } catch (error) {
        log.error(topic, error);
    } finally {
        on_job_done(null);
    }
}

/*
 * default_execute_delete_action
 * Fetches the existing object, aborts without error if not found.
 * Deletes it from the database.
 * Publishes null to the cfg topic in the feedback channel,
 * updates the sts object in the feedback channel, state='deleted'.
 * After the function is executed, a final callback on_job_done() is called.
 */
function default_execute_delete_action(
    topic,
    handle,
    action,
    args,
    item,
    on_job_done
) {
    let error;
    try {
        // If the item exists within the database
        if (item) {
            delete_from_db(
                service_obj[current_service_name].table_name,
                topic,
                handle,
                function (err) {
                    if (!err) {
                        if (action === lit.ACTION_DELETE && service_obj[current_service_name].publish) {
                            publish_cfg_object(topic, null);
                            publish_sts_object(topic, lit.STATE_DELETED);
                        }
                    } else {
                        log.error(topic, err);
                    }
                }
            );
        }
        return error;
    } catch (err) {
        log.error(topic, err);
    } finally {
        on_job_done(null);
    }
}

/*
 * default_execute_action:
 * This function returns create, update and delete action functions based on
 * the action received
 */
function default_execute_action(topic, handle, action, args, item, callback) {
    switch (action) {
        case lit.ACTION_CREATE:
            return default_execute_create_action(topic, handle, action, args,
                item, callback);

        case lit.ACTION_UPDATE:
            return default_execute_update_action(topic, handle, action, args,
                item, callback);

        case lit.ACTION_DELETE:
            return default_execute_delete_action(topic, handle, action, args,
                item, callback);
        default:
            return callback(null);
    }
}

/*
 * default_complete_action:
 * This function logs an error diagnostics if an error occurs or publishes
 * info diagnostics to report completion.
 */
function default_complete_action(err, topic, handle, action, args, items) {
    if (!(err instanceof Error)) {
        let info_msg = "Completed action " + action;
        log.info(topic, info_msg);
    } else {
        log.error(topic, err);
    }
}


Action.prototype = {
    validate: default_validate_action,
    execute: default_execute_action,
    complete: default_complete_action
};

/*
 * here operation is a dictionary which has supported actions
 * for each action we will have
 */
function Actions(obj_type) {
    this.obj_type = obj_type;
}

Actions.prototype = {
    /*
     * register
     * an action by name, supplying optional validator, extracter and completer
     * callbacks with the following signatures:
     * validator(error, topic, handle, action, args, item) => Error | undefined
     * extracter(topic, handle, action, args, item) => Error | Object
     * completor(error, topic, handle, action, args, item) => undefined
     */
    register: function (name, validator, extracter, completer) {
        this[name] = new Action(validator, extracter, completer);
    }
};

/*
 * This is a constructor function for the Actions class
 */
function actions(obj_type) {
    return new Actions(obj_type);
}


/*
 * merge
 * This function merges a partial source object into an existing destination
 * object, and returns the resulting merged object or an Error:
 * It yields an error if source contains a property with is not already in
 * destination.
 * Every property assignment from source to destination must be acceptable
 * according to the approve() API, unacceptable assignments yield an error.
 * This function returns an error or merged value.
 */
function merge(source, destination, constraints) {
    let property, ret;

    for (property in source) {
        if (property in destination) {
            if (constraints) {
                ret = approve(
                    property,
                    destination[property],
                    source[property],
                    constraints[property]
                );
            } else {
                ret = approve(
                    property,
                    destination[property],
                    source[property],
                    null
                );
            }

            if (ret instanceof Error) {
                destination = ret;
                break;
            } else {
                let return_type = get_type(ret);
                if (
                    return_type === lit.TYPE_LIST + lit.TYPE_OBJECT ||
                    return_type === lit.TYPE_LIST ||
                    return_type === lit.TYPE_OBJECT
                ) {
                    destination[property] = deep_merge(
                        destination[property],
                        ret
                    );

                    if (return_type === lit.TYPE_LIST) {
                        destination[property] = new Set(destination[property]);
                        destination[property] = Array.from(destination[property]);
                    }

                } else {
                    destination[property] = ret;
                }
            }
        } else {
            destination = new Error(
                "Property " + property + " does not exist" +
                " in the object " + destination
            );
        }
    }
    return destination;
}

/*
 * parse:
 * This function is called to parse the message received on the
 * do topic. This function provides a callback with the signature
 * callback(error, handle, args, action, topic) where
 * error is null or an instance of an Error object.
 * topic is the GLP topic on which the message was received,
 * not including 'do', such as 'glp/0/seg.23/rq/job/5'.
 * handle is the GLP object handle, extracted from the topic.
 * In this example, handle would be '5'.
 * action is the name of the action requested.
 * args is an object of property name, value pairs as received with the
 * action request. args can be an empty object.
 */
function parse_do_topic(topic, msg) {
    let err, err_msg;
    let mytopic, handle, action, args, item;

    if (!msg.action) {
        err_msg = "Action is required";
        err = new Error(err_msg);
    } else {
        action = msg.action;
    }

    if (!err) {
        args = msg.args;
        // remove 'do' from the topic
        mytopic = topic.replace(/\/([^\/]*)$/, '');
        // extract handle from the topic
        let regex = '[^\/]*$';
        handle = mytopic.match(regex)[0];
    }

    if (err) {
        err = err.toString();
    }
    // Pushes the job in the persistent job queue
    let obj = {
        error: err,
        handle: handle,
        args: args,
        action: action,
        topic: mytopic
    };
    action_queue.push(obj);
}

/*
 * map:
 * This function is used to map the literal specified in the spec module to the
 * type of the parameter passed to the function.
 */

function map(value) {
    let type;
    switch (typeof (value)) {
        case "string":
            type = lit.TYPE_STRING;
            break;

        case "number":
            if (Number.isInteger(value)) {
                type = lit.TYPE_INT;
            } else {
                type = lit.TYPE_FLOAT;
            }
            break;

        case "boolean":
            type = lit.TYPE_BOOL;
            break;
    }
    return type;
}

/*
 * is_object:
 * This function returns true in case the value passed is an object else it
 * returns false.
 */
function is_object(a) {
    return (!!a) && (a.constructor === Object);
}

/*
 * get_type:
 * This function returns the type of the value as array, object, null,
 * integer, float or string in terms of the literals specified in the spec module
 */
function get_type(value) {
    let type;
    if (Array.isArray(value)) {
        type = lit.TYPE_LIST;
    } else if (is_object(value)) {
        type = lit.TYPE_OBJECT;
    } else if (value === null || value === undefined) {
        type = null;
    } else {
        type = map(value);
    }
    return type;
}

/*
 * check_and_convert_type:
 * This function implements the type conversion specified in 10.005 GLPmqReference
 * This function returns an error or the value after type conversion.
 */
function check_and_convert_type(
    current_type, proposed_type, proposed_value, property
) {
    if (current_type === lit.TYPE_BOOL) {
        // Convert string to boolean
        if (proposed_type === lit.TYPE_STRING) {
            proposed_value = proposed_value.toLowerCase();
            if (
                proposed_value === "" ||
                proposed_value === "0" ||
                proposed_value === "off" ||
                proposed_value === "false"
            ) {
                proposed_value = false;
            } else if (
                proposed_value === "1" ||
                proposed_value === "on" ||
                proposed_value === "true"
            ) {
                proposed_value = true;
            } else {
                proposed_value = new Error("Type conversion failed for " +
                    " proposed_value " + proposed_value +
                    " from string to boolean of property '" + property + "'");
            }
        } else if (
            proposed_type === lit.TYPE_INT ||
            proposed_type === lit.TYPE_FLOAT
        ) {
            // Convert number to boolean
            if (proposed_value === 0 || proposed_value === 0.0) {
                proposed_value = false;
            } else {
                proposed_value = true;
            }
        }
    } else if (current_type === lit.TYPE_STRING) {
        // Convert boolean to string
        if (proposed_type === lit.TYPE_BOOL) {
            if (proposed_value === false) {
                proposed_value = "false";
            } else {
                proposed_value = "true";
            }
        } else if (
            proposed_type === lit.TYPE_INT ||
            proposed_type === lit.TYPE_FLOAT
        ) {
            // Convert number to string
            proposed_value = proposed_value.toString();
        }
    } else if (
        current_type === lit.TYPE_INT ||
        current_type === lit.TYPE_FLOAT
    ) {
        // Convert string to number
        if (proposed_type === lit.TYPE_STRING) {
            proposed_value = Number(proposed_value);
            if (isNaN(proposed_value)) {
                proposed_value = new Error(
                    "Type conversion failed for " +
                    "proposed_value " + proposed_value +
                    " from string to number of property '" + property + "'"
                );
            }
        } else if (proposed_type === lit.TYPE_BOOL) {
            // Convert boolean to number
            if (proposed_value === false) {
                proposed_value = 0;
            } else if (proposed_value === true) {
                proposed_value = 1;
            }
        }
    } else if (current_type === lit.TYPE_LIST) {
        if (proposed_type !== lit.TYPE_LIST) {
            proposed_value = new Error(
                "Type conversion failed for proposed value " +
                proposed_value + " into list of property '" + property + "'"
            );

        }
    } else if (current_type === lit.TYPE_OBJECT) {
        if (proposed_type !== lit.TYPE_OBJECT) {
            proposed_value = new Error(
                "Type conversion failed for proposed value " +
                proposed_value + " into object of property '" + property + "'"
            );
        }
    }
    return proposed_value;
}

/*
 * is_number:
 * This function checks if value parameter passed is a number.
 * It returns true or false
 */
function is_number(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}


/*
 * check_type_list:
 * This function is used to check the type of every element in the list.
 * If the type of the element is different as opposed to the expected type,
 * an error is raised.
 * This function returns an error or undefined
 */
function check_type_list(proposed_value, type, property) {
    let check_list_type, error;
    let list_type = type - lit.TYPE_LIST;
    if (list_type === lit.TYPE_STRING) {
        check_list_type = proposed_value.every(_.isString);
    } else if (list_type === lit.TYPE_OBJECT) {
        check_list_type = proposed_value.every(is_object);
        list_of_objects = true;
    } else if (list_type === lit.TYPE_INT || list_type === lit.TYPE_FLOAT) {
        check_list_type = proposed_value.every(is_number);
    } else if (list_type === lit.TYPE_STRING + lit.TYPE_OBJECT) {
        for (let value of proposed_value) {
            if (_.isString(value)) {
                check_list_type = true;
            } else if (is_object(value)) {
                check_list_type = true;
            } else {
                check_list_type = false;
                break;
            }
        }
    }
    if (!check_list_type) {
        error = new Error(
            "Type mismatch for proposed value '" + proposed_value +
            "' for property '" + property + "'"
        );
    }
    return error;
}

/*
 * check_min:
 * This function is used to check if the proposed value is above the min
 * constraint specified in the constraint template for a property.
 * This function returns an error or undefined
 */
function check_min(proposed_type, proposed_value, min, property) {
    let error;
    if (
        proposed_type === lit.TYPE_INT ||
        proposed_type === lit.TYPE_FLOAT
    ) {
        if (proposed_value < min) {
            error = new Error(
                "Proposed value " + proposed_value +
                " is lesser than minimum constraint value " +
                min
            );
        }
    } else if (
        proposed_type === lit.TYPE_STRING ||
        proposed_type === lit.TYPE_LIST
    ) {
        if (proposed_value.length < min) {
            error = new Error(
                "Proposed value " + proposed_value +
                " is lesser than minimum constraint value " +
                min + " of property '" + property + "'"
            );
        }
    }
    return error;
}

/*
 * check_max:
 * This function is used to check if the proposed value is within the max
 * constraint specified by the constraint template for a property.
 * This function returns an error or undefined.
 */
function check_max(proposed_type, proposed_value, max, property) {
    let error;
    if (
        proposed_type === lit.TYPE_INT ||
        proposed_type === lit.TYPE_FLOAT
    ) {
        if (proposed_value > max) {
            error = new Error("Proposed value " + proposed_value +
                " is lesser than minimum constraint value " +
                max + " of property '" + property + "'");
        }
    } else if (
        proposed_type === lit.TYPE_STRING ||
        proposed_type === lit.TYPE_LIST
    ) {
        if (proposed_value.length > max) {
            error = new Error(
                "Proposed value " + proposed_value +
                " is lesser than minimum constraint value " +
                max + " of property '" + property + "'"
            );
        }
    }
    return error;
}

/*
 * check_pattern
 * This function checks the value's pattern with the regular expression provided
 * in the constraint template.
 * This function returns error or undefined
 */
function check_pattern(proposed_value, pattern, property) {
    let ret, error;
    try {
        if (!(pattern instanceof RegExp)) {
            pattern = new RegExp(pattern);
        }
        let pattern_str = pattern.toString();
        if (pattern_str.includes(lit.GLP)) {
            proposed_value = mqtt.resolve_mqtt_topic(proposed_value);
        }
        ret = pattern.test(proposed_value);
    } catch (error) {
        if (error instanceof Error) {
            ret = error;
        }
    }

    if (!(ret instanceof Error)) {
        if (!ret) {
            error = new Error(
                "Pattern match failed for value " + proposed_value +
                ". Expected pattern: " + pattern + " for property '" + property + "'"
            );
        }
    } else {
        error = ret;
    }
    return error;
}


/*
 * approve:
 * determines whether an assignment of a new value to a property is acceptable
 * under the data conversion rules and constraints such as min, max, pattern
 * and type.
 * This function accepts parameters current_value, proposed_value, constraints,
 * type where
 * property: The property for which the constraints are being approved
 * current_value: The value of the property in the database
 * proposed_value: The value to be updated/created in the object
 * constraints: constraints object for each object property
 * isRecursive: This flag is set to true if the approve function is called recursively.
 * This function returns an error object or the proposed value in case of
 * approval.
 */
function approve(
    property,
    current_value,
    proposed_value,
    constraints,
    isRecursive
) {
    let current_type = get_type(current_value);
    let proposed_type = get_type(proposed_value);
    let return_value = proposed_value;
    let validate_constraints = true;
    if (!isRecursive) {
        list_of_objects = false;
    }
    // Check if proposed type is not null when it is mandatory
    if (constraints) {
        if (constraints.mandatory) {
            if (proposed_value === undefined || proposed_value === null) {
                return_value = new Error(
                    "Missing mandatory property '" + property + "'");
            }
        } else {
            if (proposed_value === undefined || proposed_value === null) {
                validate_constraints = false;
            }
        }
    }
    if (validate_constraints) {
        if (!(return_value instanceof Error)) {
            // If type of the current value does not match the proposed value
            if (current_type !== proposed_type) {
                // If current value is null, then fetch the type from the constraints
                if (current_type === null) {
                    if (constraints) {
                        current_type = constraints.type;
                    } else {
                        log.error(null, "No type found for value: ", current_value);
                    }
                }
                // Check and convert type of the proposed value in comparison with
                // current value type. It returns the converted value or an error if
                // conversion is not possible
                return_value = check_and_convert_type(
                    current_type,
                    proposed_type,
                    proposed_value,
                    property
                );
            } else {
                // If current value and proposed value are both lists
                if (current_type === lit.TYPE_LIST) {
                    // Check if the list contains the same datatype of elements as
                    // specified in the constraints.
                    if (constraints) {
                        // If current type is list and if the proposed value is 
                        // empty raise an error if it is mandatory
                        if (constraints.mandatory && proposed_value.length === 0) {
                            return_value = new Error(
                                "Missing mandatory property '" + property + "'"
                            );
                        }

                        if (!(return_value instanceof Error)) {
                            return_value = check_type_list(
                                proposed_value,
                                constraints.type,
                                property
                            );
                        }

                        if (!(return_value instanceof Error)) {
                            // If there is no error, proposed value is all correct 
                            // and can be returned
                            return_value = proposed_value;
                            // If there is no error, check whether each element of 
                            // the list matches the pattern provided in the 
                            // constraints
                            if (constraints.pattern) {
                                if (Array.isArray(constraints.pattern)) {

                                    for (let each of return_value) {

                                        for (
                                            let each_pattern of constraints.pattern
                                        ) {
                                            if (
                                                is_object(each) && is_object(each_pattern)
                                            ) {
                                                // Get the outermost keys of proposed value and
                                                // constraints.pattern
                                                let proposed_keys = Object.keys(each);
                                                let constraint_keys = Object.keys(each_pattern);
                                                for (let key of constraint_keys) {
                                                    // Get the key for which the constraints exists
                                                    // for the proposed value

                                                    // Approve of the given pattern
                                                    let ret = approve(
                                                        key,
                                                        null,
                                                        each[key],
                                                        each_pattern[key], 1
                                                    );
                                                    if (ret instanceof Error) {
                                                        return_value = ret;
                                                        break;
                                                    } else {
                                                        each[key] = ret;
                                                    }
                                                }
                                                break;
                                            } else if (
                                                typeof (each) === "string" && !is_object(each_pattern)
                                            ) {
                                                return_value = check_pattern(
                                                    each,
                                                    each_pattern,
                                                    property
                                                );
                                                break;
                                            }
                                        }

                                        if (return_value instanceof Error) {
                                            break;
                                        }
                                    }

                                } else {
                                    for (let each of return_value) {
                                        return_value = check_pattern(
                                            each,
                                            constraints.pattern,
                                            property
                                        );

                                        if (return_value instanceof Error) {
                                            break;
                                        }
                                    }
                                }


                                if (!(return_value instanceof Error)) {
                                    return_value = proposed_value;
                                }
                            }
                        }
                    } else {
                        return_value = proposed_value;
                    }
                }
            }
        }


        if (!(return_value instanceof Error)) {
            if (constraints) {
                if (constraints.min) {
                    // Check if the proposed value is above the min value mentioned
                    // in the constraints property.
                    return_value = check_min(
                        proposed_type,
                        proposed_value,
                        constraints.min,
                        property
                    );
                    if (!return_value) {
                        // If there is no error, the proposed value can be returned
                        return_value = proposed_value;
                    }
                }
            }
        }

        if (!(return_value instanceof Error)) {
            if (constraints) {
                if (constraints.max) {
                    // Check if the proposed value is above the max value mentioned
                    // in the constraints property.
                    return_value = check_max(
                        proposed_type,
                        proposed_value,
                        constraints.max,
                        property
                    );
                    if (!return_value) {
                        // If no error, the proposed value can be returned
                        return_value = proposed_value;
                    }
                }
            }
        }

        if (!(return_value instanceof Error)) {
            try {
                if (constraints) {
                    // If pattern is an object
                    if (is_object(constraints.pattern)) {
                        // Get property in proposed value
                        for (let property in proposed_value) {
                            // If proposed value is a list of objects
                            if (list_of_objects) {
                                // Get the outermost keys of proposed value and
                                // constraints.pattern
                                let proposed_keys = Object.keys(proposed_value[property]);
                                let constraint_keys = Object.keys(constraints.pattern);
                                // If current value of property does not exist
                                if (!current_value[property]) {
                                    for (let key of proposed_keys) {
                                        // Get the key for which the constraints exists
                                        // for the proposed value
                                        if (constraint_keys.indexOf(key) > -1) {
                                            // Approve of the given pattern
                                            let ret = approve(
                                                property,
                                                null,
                                                proposed_value[property][key],
                                                constraints.pattern[key], 1
                                            );
                                            if (ret instanceof Error) {
                                                return_value = ret;
                                                break;
                                            } else {
                                                proposed_value[property][key] = ret;
                                            }
                                        }
                                    }
                                } else {
                                    // If current value exists for the property
                                    let current_keys = Object.keys(current_value[
                                        property]);
                                    for (let key of proposed_keys) {
                                        // If there is a pattern for the key and there is a
                                        // current value for the key, approve the pattern
                                        // for the proposed value
                                        if (current_keys.indexOf(key) > -1 &&
                                            constraint_keys.indexOf(key) > -1
                                        ) {
                                            let ret = approve(
                                                property,
                                                current_value[property][key],
                                                proposed_value[property][key],
                                                constraints.pattern[key],
                                                1
                                            );
                                            if (ret instanceof Error) {
                                                return_value = ret;
                                                break;
                                            }
                                        } else {
                                            function customizer(objValue, srcValue) {
                                                if (_.isArray(objValue)) {
                                                    let new_arr = objValue.concat(srcValue);
                                                    new_arr = new Set(new_arr);
                                                    return Array.from(new_arr);
                                                }
                                            }

                                            // Else, merge the current value with the
                                            // proposed value
                                            proposed_value[property][key] =
                                                _.mergeWith({},
                                                    current_value[property][key],
                                                    proposed_value[property][key],
                                                    customizer
                                                );
                                        }
                                    }
                                }
                            } else {
                                // If the proposed value is not a list of objects
                                // Get the property from the current value
                                if (current_value) {
                                    if (property in current_value) {
                                        let new_current_value = current_value[property];
                                        let new_proposed_value = proposed_value[
                                            property];
                                        let ret = approve(
                                            property,
                                            new_current_value,
                                            new_proposed_value,
                                            constraints.pattern[property]
                                        );
                                        if (ret instanceof Error) {
                                            return_value = ret;
                                            break;
                                        }
                                    } else {
                                        // If the property does not exist in the current value,
                                        // raise an error that the property does not exist
                                        return_value = new Error(
                                            "Property " + property +
                                            " does not exist" +
                                            " in the object " +
                                            JSON.stringify(current_value)
                                        );
                                    }
                                } else if (constraints.pattern) {
                                    if (property in constraints.pattern) {
                                        let new_proposed_value = proposed_value[
                                            property];
                                        let ret = approve(
                                            property,
                                            null,
                                            new_proposed_value,
                                            constraints.pattern[property]
                                        );
                                        if (ret instanceof Error) {
                                            return_value = ret;
                                            break;
                                        }
                                    } else {
                                        // If the property does not exist in the current value,
                                        // raise an error that the property does not exist
                                        return_value = new Error(
                                            "Property " + property +
                                            " does not exist" +
                                            " in the object " +
                                            JSON.stringify(current_value)
                                        );
                                    }
                                }
                            }
                        }
                    } else {
                        // If constraints is not an object, check the regex with the
                        // proposed value
                        if (constraints.pattern && (current_type !== lit.TYPE_LIST)) {
                            return_value = check_pattern(
                                proposed_value,
                                constraints.pattern,
                                property
                            );
                            if (!(return_value instanceof Error)) {
                                return_value = proposed_value;
                            }
                        }
                    }
                }
            } catch (e) {
                log.error(null, e);
            }
        }
    } // validate_constrains is true

    return return_value;
}

/*
 * storage()
 * This is a quick method to store and retreive data
 */
function Storage() {
    this.name = client_name;
    this.file_name = path.join(config_getter(PERIOD + config.PERSISTENCE_PATH),
        client_name + ".json");
    if (!fs.existsSync(this.file_name)) {
        fs.writeFileSync(this.file_name, "{}");
    }
}

Storage.prototype = {
    register: function (property, type, default_value) {
        let file_handle = json_file.read(this.file_name);
        let storage_object = {};
        storage_object.type = type;
        storage_object.value = default_value;
        file_handle.set(property, storage_object);
        file_handle.writeSync();
    },

    set: function (property, value) {
        let file_handle = json_file.read(this.file_name);
        let storage_object = file_handle.get(property);
        if (storage_object) {
            if (typeof (value) === storage_object.type) {
                storage_object.value = value;
                file_handle.set(property, storage_object);
                file_handle.writeSync();
            } else {
                log.error(
                    null,
                    "Type mismatch for ",
                    property,
                    ", expected type ",
                    storage_object.type,
                    " received type ",
                    typeof (value)
                );
            }
        } else {
            log.error(
                null,
                "Property ",
                property,
                " does not exist ",
                "in the persistent storage"
            );
        }

    },

    get: function (property) {
        let file_handle = json_file.read(this.file_name);
        let storage_object = file_handle.get(property);
        if (storage_object) {
            return storage_object.value;
        } else {
            return new Error(
                "Property " + property +
                " does not exist " +
                "in the persistent storage"
            );
        }
    }
};

function storage() {
    return new Storage();
}

/*
 * get_object_from_database: This function processes a query to obtain topics
 * objects from the database and return the result in a callback. The callback
 * has a signature callback(error, rows) where error is if an error occurs while
 * processing the query and rows is the result returned from the database
 */
function get_object_from_database(query, callback) {
    db.all(
        query,
        function (err, rows) {
            callback(err, rows);
        }
    );
}

/*
 * generate_object: This is a generator function which yields a value with topic
 * and object when the next method of the generator is called
 */
function* generate_object(array) {
    let index = 0;
    while (index < array.length) {
        yield {
            topic: array[index].topic,
            object: array[index].object
        };
        index++;
    }
}

/*
 * get: a function for search operations. It returns an iterator to a callback
 * function to iterate over all applicable items in the database.
 * For an absolute topic such as 'glp/0/fb/job/5/cfg', the function provides a
 * single item, or none. The topic supports MQTT wildcards, however.
 * This can be used to iterate over a range of topics.
 * For example, get('glp/0/+/+/dev/#') iterates over all items under the dev
 * topic, regardless of SID, channel, protocol, and so forth.
 * A null topic is shorthand for "every item."
 */
function get(service_name, topic, callback) {
    try {
        let topic_regex, regex, len, query;
        if (topic) {
            regex = mqtt_regex(topic);
            topic_regex = regex.regex.toString();
            len = topic_regex.length;
            query = "SELECT topic, object from " + service_obj[service_name].table_name +
                " where topic regexp " + "\'" +
                topic_regex.slice(1, len - 1) + "\'";
        } else {
            query = "SELECT topic, object from " + service_obj[current_service_name].table_name;
        }

        get_object_from_database(
            query,
            function (err, res) {
                if (!err) {
                    let it = generate_object(res);
                    callback(it);
                } else {
                    log.error(topic, err);
                }
            }
        );
    } catch (error) {
        log.fatal(null, error);
    }
}

/*
 * Set : A function that updates an item in the database.
 * The operation takes a complete object and replaces the entire object.
 * The item must exist before it can be set.
 * v0.set(topic, object) => Error | undefined
 */
function set(service_name, topic, object) {
    let query = "UPDATE " + service_obj[service_name].table_name + " set object = \'" +
        object + "\'" + " where topic = \'" + topic + "\'";
    db.run(query, function (err) {
        if (err) {
            log.error(topic, err);
        } else {
            log.info(topic, "Object updated for topic");
        }
    });
}

exports.v0 = {
    VERSION: version,
    init: init,
    register: register,
    actions: actions,
    merge: merge,
    storage: storage,
    approve: approve,
    get: get,
    set: set,
    publish_status: publish_sts_object,
    default_execute_create_action: default_execute_create_action,
    default_execute_delete_action: default_execute_delete_action,
    default_execute_update_action: default_execute_update_action,
    publish_config_object: publish_cfg_object
};
