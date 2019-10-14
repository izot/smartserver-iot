/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (c) 2018 Echelon Corporation
 * Config module: Initializes standard configuration options for other modules
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */
"use strict";
const env = require("env-var");
const fs = require("fs");
const getopt = require("node-getopt");
const path = require("path");
let self = require("./package.json");
const tools = require("./tools").v0;

const version = tools.get_version(self.version);

const config_lit = {

    CONFIG_FILE: "config_file",
    LOG_DEBUG: "debug",
    MACID: "macid",
    MQTT_BROKER: "mqtt_broker",
    MQTT_PORT: "mqtt_port",
    MQTT_PROTOCOL: "mqtt_protocol",
    MQTT_USERNAME: "mqtt_username",
    MQTT_PASSWORD: "mqtt_password",
    MQTT_VERSION: "mqtt_version",
    MQTT_CLIENTID: "mqtt_clientid",
    MQTT_CONNECT_TIMEOUT: "connect_timeout",
    MQTT_RECONNECT_PERIOD: "reconnect_period",
    LOG_VERBOSITY: "verbosity",
    PERSISTENCE_PATH: "persistence_path",
    MQTT_CLIENT: "mqtt_client",
    GLP_DB_PATH: "glp_db_path",
    SQL_PCRE_PATH: "sql_pcre_path",
    LOCKDIR: "APOLLO_LOCKDIR",
    APOLLO_LOCKDIR: "apollo_lockdir",
    GLP_CONFD: "GLP_CONFD",
    GLP_BIN: "GLP_BIN",
    GLP_DATA: "GLP_DATA",
    GLP_LIC: "GLP_LIC"
};

const ID = "id";
const LONG = "long";
const HELP = "help";
const SHORT = "short";
const DEFAULT = "default";
const CURRENT_VALUE = "current_value";
const REGEX = "regex";

const SHORT_POS = 0;
const LONG_POS = 1;
const HELP_POS = 2;
const DEFAULT_POS = 3;
const ID_POS = 4;
const REGEX_POS = 5;

// regex for standard configuration
const MACID_REGEX =
    /^(?:[0-9A-F]{2}([-:]))((?:[0-9A-F]{2}\1){4}|((?:[0-9A-F]{2}\1){6})|((?:[0-9A-F]{2}\1){14}))[0-9A-F]{2}$/i;
const DEBUG_REGEX = /^(0|1)$/i;
const VERBOSITY_REGEX = /^([0-4])$/i;
const MQTT_PORT_REGEX = /^\d{0,5}$/i;
const MQTT_PROTOCOL_REGEX = /^(mqtt|mqtts)$/i;
const MQTT_VERSION_REGEX = /^\d{0,1}$/i;
const DEFAULT_SQLITE_PCRE_EXTENSION = "/usr/lib/sqlite3/pcre.so";

const PERIOD = ".";
let SERVICE_NAME = "";
const CONF_EXT = ".conf";
let parse_count = 0;
// Stores standard configuration options. This object has short options, long
// options, help options, default values and id values for each configuration
// option.
let default_registered_options = [];
let config_obj = {};

let env_options = {
    GLP_CONFD: "/data/apollo/conf.d",
    GLP_BIN: "/var/apollo/bin",
    GLP_DATA: "/data/apollo/data",
    GLP_LIC: "/data/apollo/.licenses",
    APOLLO_LOCKDIR: "/run/lock/apollo-services",
};


// This is similar to config_obj but will be used as input to node-getopt
let client_option = [];

// standard configuration options(short, long, description, default, id)
// Below is the description for the each entry
// index 0 - is a short option
// index 1 - is a long option
// index 2 - is a help content for the given option
// index 3 - is an initial value or default value
// index 4 - is an identifier for the option
// index 5 - is a REGEX to validate config options
// These indices are defined as opt_index which works like an enum
let default_cli_options = [

    ["a", "glp_db_path", "Database path for glp-toolkit",
        env.get(
            config_lit.GLP_DATA,
            env_options[config_lit.GLP_DATA]
        ).required().asString(),
        PERIOD + config_lit.GLP_DB_PATH, null
    ],

    ["b", "mqtt_broker", "mqtt broker", "localhost",
        PERIOD + config_lit.MQTT_BROKER, null
    ],

    ["c", null, "Config file path", env.get(
            config_lit.GLP_CONFD,
            env_options[config_lit.GLP_CONFD]
        ).required().asString(),
        PERIOD + config_lit.CONFIG_FILE, null
    ],

    ["C", "mqtt_clientid", "mqtt clientid", "0",
        PERIOD + config_lit.MQTT_CLIENTID, null
    ],

    ["d", null, "debug level", 0,
        PERIOD + config_lit.LOG_DEBUG, DEBUG_REGEX
    ],

    ["H", "mqtt_protocol", "mqtt protocol", "mqtt",
        PERIOD + config_lit.MQTT_PROTOCOL, MQTT_PROTOCOL_REGEX
    ],

    ["l", "apollo_lockdir", "apollo_lockdir", env.get(
            config_lit.APOLLO_LOCKDIR,
            env_options[
                config_lit.LOCKDIR
            ]
        ).required().asString(),
        PERIOD + config_lit.APOLLO_LOCKDIR, null
    ],

    ["m", "macid", "Designated macid", null,
        PERIOD + config_lit.MACID, MACID_REGEX
    ],

    ["p", "mqtt_port", "mqtt port", 1883,
        PERIOD + config_lit.MQTT_PORT, MQTT_PORT_REGEX
    ],

    ["P", "mqtt_password", "password", null,
        PERIOD + config_lit.MQTT_PASSWORD, null
    ],

    ["u", "mqtt_username", "username", null,
        PERIOD + config_lit.MQTT_USERNAME, null
    ],

    ["U", "mqtt_version", "mqtt version", 4,
        PERIOD + config_lit.MQTT_VERSION, MQTT_VERSION_REGEX
    ],

    ["t", "connect_timeout", "connect timeout", 30000,
        PERIOD + config_lit.MQTT_CONNECT_TIMEOUT, null
    ],

    ["r", "reconnect_period", "time between two reconnections", 30000,
        PERIOD + config_lit.MQTT_RECONNECT_PERIOD, null
    ],

    ["v", "verbosity", "verbosity", 0,
        PERIOD + config_lit.LOG_VERBOSITY, VERBOSITY_REGEX
    ],

    [null, "persistence_path", "path to persistent data",
        env.get(
            config_lit.GLP_DATA,
            env_options[config_lit.GLP_DATA]
        ).required().asString(),
        PERIOD + config_lit.PERSISTENCE_PATH, null
    ],

    [null, "sql_pcre_path", "Path for sqlite regular expression extension",
        DEFAULT_SQLITE_PCRE_EXTENSION,
        PERIOD + config_lit.SQL_PCRE_PATH, null
    ],

];


/*
 * init
 * initializes the module for a client with the given name, yields Error or
 * undefined for success.
 * Clients supply a name, which is used to construct default values for the
 * configuration file path, MQTT client and so on. This API does not verify
 * the uniqueness of the name provided.
 */
function init(name) {
    let error = populate_default_options(name);
    return error;
}

/*
 * populate_default_options
 * populates common command line options in the config_obj object
 * returns an error object if it fails to register any standard options
 * else returns undefined
 */
function populate_default_options(name) {

    let error, cli_obj, default_value;
    SERVICE_NAME = name;
    for (cli_obj of default_cli_options) {
        //getting the id of the option
        const id = cli_obj[ID_POS];
        default_value = cli_obj[DEFAULT_POS];
        error = register(
            id,
            cli_obj[SHORT_POS],
            cli_obj[LONG_POS],
            default_value,
            cli_obj[HELP_POS],
            cli_obj[REGEX_POS]
        );

        if (cli_obj[SHORT_POS]) {
            default_registered_options.push(cli_obj[SHORT_POS]);
        }

        if (cli_obj[LONG_POS]) {
            default_registered_options.push(cli_obj[LONG_POS]);
        }

        if (error) {
            break;
        }
    }

    return error;
}

/*
 * validate_options
 * This function validates the following constraints for short and long options
 * 1) short and long options can not be null at the same time
 * 2) short and long options can not be undefined at the same time
 * 3) short or long options can not have same values as previously registered options
 * This function returns an error object if any of the above fails
 */
function validate_options_and_id(id, short_opt, long_opt) {

    let error, err_msg;
    // validate for null values of short and long options
    if (!short_opt && !long_opt) {
        err_msg = "Short and long options are not defined.";
        error = new Error(err_msg);
    }

    // For Non standard option, id can not start with a period
    if (!error) {
        if (id[0] === PERIOD) {
            let flag = 0;
            for (let cli_obj of default_cli_options) {
                if (cli_obj[ID_POS] === id) {
                    flag = 1;
                    break;
                }
            }
            if (flag === 0) {
                err_msg = "For non-standard option," +
                    " id can not start with a period.";
                error = new Error(err_msg);
            }
        }
    }

    // validate for duplicate values of long or short options
    if (!error) {
        for (let index in config_obj) {
            const cfg = config_obj[index];
            if (short_opt && cfg[SHORT] === short_opt) {
                err_msg = "Duplicate value for short option.";
                error = new Error(err_msg);
                break;
            }
            if (long_opt && cfg[LONG] === long_opt) {
                err_msg = "Duplicate value for long option.";
                error = new Error(err_msg);
                break;
            }
        }
    }

    return error;
}


/*
 * register
 * registers a configuration option with optional short form (command line),
 * long form (config file) and initial value. Returns Error or undefined.
 * id: an identifier used by the client to retrieve the value with the get API
 * short_opt: a single-character option identifier for use with the command line parser
 * long_opt: a single word option identifier for use with the configuration file parser
 * default_value: default value for the identifier
 * help: help text for the identifier
 */
function register(id, short_opt, long_opt, default_value, help, regex) {
    let opt = [];
    let values = {};
    let error = validate_options_and_id(id, short_opt, long_opt);

    if (!error) {
        if (id === PERIOD + config_lit.PERSISTENCE_PATH) {
            if (!fs.existsSync(default_value)) {
                error = new Error(
                    "Persistence path " + default_value + " does not exist"
                );
            }
        }
    }

    if (!error) {
        // populate config_obj object
        values[SHORT] = short_opt;
        values[LONG] = long_opt;
        values[DEFAULT] = default_value;
        values[HELP] = help;
        values[CURRENT_VALUE] = default_value;
        values[ID] = id;
        values[REGEX] = regex;
        config_obj[id] = values;

        // Arguments are required for all the options
        if (long_opt) {
            long_opt = long_opt + "=ARG";
        } else {
            long_opt = "=";
        }

        // populate client_options object
        opt.push(short_opt);
        opt.push(long_opt);
        opt.push(help);
        opt.push(default_value);
        client_option.push(opt);
    }
    return error;
}


/*
 * read_config_file
 * Parses the configuration file and populates config_obj object
 * returns error in the case of invalid options and undefined in case of success
 */
function read_config_file(path) {
    let ret = 0;
    let lines = null;
    let error, err_msg;

    try {
        lines = fs.readFileSync(path).toString().split("\n");
    } catch (e) {
        error = e;
    }

    if (!error) {
        for (let each of lines) {
            if (each.startsWith(";") === true) {
                continue;
            }
            // handles empty lines
            if (each === "") {
                continue;
            }

            let option = each.substr(0, each.indexOf("="));
            let value = each.substr(each.indexOf("=") + 1);
            // raises an error in case of incomplete assignments
            if (value === "") {
                error = new Error("Value missing for options ");
            }
            // raises an error if the option is not present in config_obj
            if (!config_obj.hasOwnProperty(option)) {
                if (parse_count > 1) {
                    console.warn(
                        option +
                        " option is not registered with the client"
                    );
                }

            } else {
                config_obj[option][CURRENT_VALUE] = value;
            }
        }
    }
    return error;
}

/*
 * check_options
 * This function validates configuration parameters and its default values
 * returns error object if it fails to match the regular expression else
 * returns undefined
 */
function check_options() {
    let error, cfg, regex, current_value;

    for (let opt in config_obj) {
        cfg = config_obj[opt];
        regex = cfg[REGEX];
        current_value = cfg[CURRENT_VALUE];
        // We do not validate an option if it does not have any value. In other
        // words, if an option is niether provided at the command line, nor in
        // any of the config files, nor can have a default value, then regex
        // validation is skipped. MAC id is an example.
        if (current_value && regex) {
            if (!regex.test(current_value)) {
                error = new Error(
                    "Regular expression: " +
                    regex +
                    " failing for option: " +
                    opt +
                    " with value: " +
                    current_value
                );
                break;
            }
        }
    }
    return error;
}


/*
 * process_parsed_output
 * This function processes all the short and long options and creates
 * a dictionary for the same. This is necessary as for short arguments we
 * don't get the key value pair in options directory which is returned
 * after getopt.parse() function
 */
function process_parsed_output(output, process_args) {
    let opt_dict = {};
    let option, obj, key, id;
    const opt = Object.keys(output.options);
    for (key of opt) {
        for (const each in process_args) {
            if (each % 2 === 0) {
                const parsedOption = process_args[each].slice(1);
                if (key === parsedOption) {
                    if (!output.options[key]) {
                        const error = new Error(
                            "Option '" + key + "' does not have a value supplied"
                        );
                        console.error(error);
                        process.exit(-1);
                    } else {
                        // For all the options in the config object
                        for (option in config_obj) {
                            obj = config_obj[option];
                            // If the short option matches the key
                            if (obj[SHORT] === key) {
                                id = obj[ID];
                                opt_dict[id] = output.options[key];
                            } else if (obj[LONG] === key) {
                                id = obj[ID];
                                opt_dict[id] = output.options[key];
                            }
                        }
                    }
                }
            }
        }
    }

    return opt_dict;
}

/*
 * parse
 * Parses the command line, ignoring all except for the .config_file option.
 * Then, the toolkit configuration file is read, if it exists, and parsed.
 * The toolkit configuration file is in the location specified by the
 * -c command line option is named toolkit.conf.
 * Finally, the client's configuration file is read, with the location and name
 * provided with the -c command line option.
 * Returns an error object in case of failure and undefined in case of success.
 */
function parse(callback) {
    parse_count += 1;
    let error, err_msg, toolkit_conf, client_conf, opt_dict_keys, key;
    let index, conf_dir;
    // starting index is the index in system's argv array
    const STARTING_INDEX = 2;
    const TOOLKIT_CONF = "toolkit.conf";

    // Workaround for AP-796
    // The node-getopt package does not parse the default options provided from 
    // command line once it comes across an invalid option when the parse() is 
    // called the first time. To overcome this the non default options provided 
    // from command line are shifted towards the end of the array used for 
    // parsing command line options so that atleast the default options such as 
    // the port number whose value is provided from th command line are 
    // compiled in the first parse().
    let non_default_options = [];
    let process_args = process.argv.slice(STARTING_INDEX);
    let OPTION_REGEX = /^[-]{1,2}([^-]+)/;
    if (parse_count === 1) {
        let final_process_args = [];
        for (let each in process_args) {
            if ((each % 2) === 0) {
                let next_index = Number(each) + 1;
                let option = process_args[each].match(OPTION_REGEX)[1];
                if (!default_registered_options.includes(option)) {
                    non_default_options.push(process_args[each]);
                    non_default_options.push(process_args[next_index]);
                } else {
                    final_process_args.push(process_args[each]);
                    final_process_args.push(process_args[next_index]);
                }
            }
        }
        process_args = final_process_args.concat(non_default_options);
    }

    const result = getopt.create(client_option).bindHelp()
        .error(
            function (error) {
                if (parse_count > 1 && error instanceof Error) {
                    if (callback) {
                        callback(error);
                    } else {
                        console.error(error);
                        process.exit(1);
                    }
                }
            }
        );

    const output = result.parse(process_args);
    const opt_dict = process_parsed_output(output, process_args);
    const id = PERIOD + config_lit.CONFIG_FILE;

    // -c option is specified
    if (opt_dict[id]) {
        // check if specified option value is directory or file.
        // if file, extract directory to generate name for config file
        if (fs.statSync(opt_dict[id]).isFile()) {
            conf_dir = path.dirname(opt_dict[id]);
            client_conf = opt_dict[id];
        } else {
            conf_dir = opt_dict[id].replace(/\/$/, "");
            client_conf = path.join(conf_dir, SERVICE_NAME + CONF_EXT);
        }
        toolkit_conf = path.join(conf_dir, TOOLKIT_CONF);

    } else {
        // -c option is absent
        toolkit_conf = path.join(
            config_obj[id][CURRENT_VALUE],
            TOOLKIT_CONF
        );
        client_conf = path.join(
            config_obj[id][CURRENT_VALUE],
            SERVICE_NAME + CONF_EXT
        );
    }

    if (fs.existsSync(toolkit_conf)) {
        error = read_config_file(toolkit_conf);
    }

    if (!error) {
        let ret = fs.existsSync(client_conf);
        if (ret) {
            error = read_config_file(client_conf);
        } else {
            if (opt_dict[id]) {
                err_msg = "Client configuration file " + client_conf +
                    " does not exist.";
                error = new Error(err_msg);
            }
        }
    }
    // Read command line parameters
    if (!error) {
        // get keys of opt_dict
        opt_dict_keys = Object.keys(opt_dict);
        for (key of opt_dict_keys) {
            config_obj[key][CURRENT_VALUE] = opt_dict[key];
        }
    }

    if (!error) {
        error = check_options();
    }

    if (callback) {
        callback(error);
    } else if (error instanceof Error) {
        console.error(error);
        process.exit(1);
    }
}

/*
 * get
 * returns the value of the requested configuration property, or undefined.
 * The id must match the id used during registration.
 */
function get(id) {
    if (config_obj[id]) {
        return config_obj[id][CURRENT_VALUE];
    }
}

exports.v0 = config_lit;
exports.v0.VERSION = version;
exports.v0.init = init;
exports.v0.get = get;
exports.v0.parse = parse;
exports.v0.register = register;