/*
 * Echelon GLP Toolkit for Node.js
 * Copyright (c) 2017 Echelon Corporation
 */
 /* jshint esversion: 6 */
 /* jslint node: true, maxerr: 10000 */
"use strict";
let self      = require("./package.json");
const version = get_version(self.version);

/*
 * init
 * initializes the module for a client with the given name, yields Error or
 * nothing for success.
 * The function accepts a getter with the signature of config.v0.get.
 */
function init(name, getter) {

}

/*
 * get_version
 * This function will convert version number into echelon style
 */
function get_version(version) {
    let index = 0, len;
    let arr   = [];
    let version_string;
    version = version.split(".");

    for (let each of version) {
        len = each.length;
        if (len < (index + 1)) {
            let zero = new Array((index + 1) - len  + 1).join('0');
            each = zero + each;
        }
    arr[index] = each;
    version_string = arr.join(".");
    index = index + 1;
    }
    return version_string;
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
 * banner:
 * This function prints the Copyright and version of the service
 */
function banner(self, version) {
    console.log(
        self.description, "Version", version
    );
    console.log(
        self.license
    );
}

exports.v0 = {
    VERSION    : version,
    init       : init,
    get_version: get_version,
    topic_builder: topic_builder,
    banner: banner
};
