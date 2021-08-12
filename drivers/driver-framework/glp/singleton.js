/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */

const fs = require("fs-ext");
const path = require("path");
const execSync = require("child_process").execSync;
const moment = require("moment-timezone");
const syslog = require("modern-syslog");
const env = require("env-var");

/**
 * Global constant
 * apollo_lockdir specifies the location where the exclusive lockfile needs to be created
 */
const apollo_lockdir = env.get("APOLLO_LOCKDIR", "/run/lock/apollo-services").required().asString();

function init(name) {
    ensureSingleton(name);
}

/**
 * This function accepts a service name which is used to create a file which has a name <service_name>.lock
 * This file is created in the directory specified by apollo_lockdir
 * This function returns an error object if the lock cannot be acquired
 * @param {String} service_name 
 */
function flock(service_name) {
    let error;
    const lockfile = path.join(apollo_lockdir, service_name + ".lock");
    const fd = fs.openSync(lockfile, "a");
    try {
        fs.flockSync(fd, "exnb");
    } catch (err) {
        error = new Error("Another instance of process " + service_name + " is already running");
    }
    return error;
}

/**
 * This function is used to enforce singleton. It accepts an input parameter which is the service name
 * This service name is provided to the flock function to create a lock file and to exclusively lock the file 
 * while the process is in use. 
 * This function logs a fatal error if the lock cannot be acquired. 
 * @param {String} service_name 
 */
function ensureSingleton(service_name) {
    const error = flock(service_name);
    if (error) {
        const cmd = "sudo shutdown -r +1 " + error;
        const timestamp = moment(new Date()).format("YYYY-MM-DD HH:mm:ss.SSS ZZ");

        execSync(cmd);
        console.error(error);
        syslog.log(
            "fatal",
            timestamp + " " +
            service_name + " " +
            error,
            function () {}
        );
        process.exit(-1);
    }
}

exports.v0 = {
    init: init,
    ensureSingleton: ensureSingleton,
    flock: flock
};
