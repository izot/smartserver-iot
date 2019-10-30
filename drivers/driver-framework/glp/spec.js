/*
 * GLP Toolkit for Node.js, specs module
 * Copyright (c) 2017 Echelon Corporation
 */
/* jshint esversion: 6 */
/* jslint node: true, maxerr: 10000 */
"use strict";
const tools = require("./tools").v0;
let self = require("./package.json");
const version = tools.get_version(self.version);

/*
 * 'lit', short for 'literals', is the export v0 object. We construct this
 * object in a multi-step process by adding sime primitives and literals first,
 * then adding more complex definitions which may use these primitives.
 * The entire object is eventually exported as the v0 API.
 */
let lit = {
	GLP: 'glp',

	GLP_PROTOCOL_MIN_VERSION: 0,
	GLP_PROTOCOL_MAX_VERSION: 0,
	GLP_PROTOCOL_VERSION: 0,

	SEP: '/',
	ANY: '[^/]+', // greedy variant: '[^/]+',
	DEPTH: '(?P<DEPTH>(/.+)$',

	REQUEST_CHANNEL: 'rq',
	FEEDBACK_CHANNEL: 'fb',
	EVENT_CHANNEL: 'ev',

	ACTION_ACTIVATE: 'activate',
	ACTION_CREATE: 'create',
	ACTION_DELETE: 'delete',
	ACTION_DEPROVISION: 'deprovision',
	ACTION_IMPORT : "import",
	ACTION_LOAD: 'load',
	ACTION_PROVISION: 'provision',
	ACTION_REPAIR: 'repair',
	ACTION_REPLACE: 'replace',
	ACTION_TEST: 'test',
	ACTION_UPDATE: 'update',
	ACTION_WINK: 'wink',

	CAPABILITY_ARBITRARY_ALARM: 'arbitrary-alarms',
	CAPABILITY_BRIDGED_CONNECTION: 'bridged-connections',
	CAPABILITY_DEVICE_GROUPING: 'device-grouping',
	CAPABILITY_SCHEDULER: 'scheduler',
	CAPABILITY_HISTORY: 'history',
	CAPABILITY_PAGINATION_SNAPSHOTS: 'pagination-snapshots',

	CONFIG_OBJECT: 'cfg',

	DATAPOINT_DIRECTION_IN: 'in',
	DATAPOINT_DIRECTION_OUT: 'out',

	DATAPOINT_MONITOR_NONE: 'none',
	DATAPOINT_MONITOR_SLOW: 'slow',
	DATAPOINT_MONITOR_NORMAL: 'normal',
	DATAPOINT_MONITOR_FAST: 'fast',

	DEVICE_CATEGORY_IO: 'i/o',
	DEVICE_CATEGORY_INFRASTRUCTURE: 'infrastructure',
	DEVICE_CATEGORY_SEGMENT: 'segment',

	DEVICE_HEALTH_NORMAL: 'normal',
	DEVICE_HEALTH_SUSPECT: 'suspect',
	DEVICE_HEALTH_DOWN: 'down',
	DEVICE_HEALTH_NASCENT: 'nascent',

	DISCOVERY_METHOD_AUTO: 'auto',
	DISCOVERY_METHOD_NONE: 'none',
	DISCOVERY_METHOD_SATM: 'satm',

	OBJECT_TYPE_DEVICE: 'dev',
	OBJECT_TYPE_GROUP: 'grp',
	OBJECT_TYPE_JOB: 'job',
	OBJECT_TYPE_SCHEDULE: 'sch',
	OBJECT_TYPE_SCHEDULED_EVENT: 'evnt',
	OBJECT_TYPE_CONNECTION: 'con',
	OBJECT_TYPE_ALARM: 'alarm',
	OBJECT_TYPE_MONITOR: 'monitor',

	POLICY_SMART: 'smart',
	POLICY_STRICT: 'strict',
	PRIORITY_MIN: 1, // numerical value minimum
	PRIORITY_MAX: 16, // numerical value maximum
	PRIORITY_LOWEST: 16,
	PRIORITY_HIGHEST: 1,
	PRIORITY_DEFAULT: 8,

	PROTOCOLS_CONTROLM: 'cm',
	PROTOCOLS_LONTALK: 'lt',
	PROTOCOLS_BLUETOOTH: 'bt',
	PROTOCOLS_MBUS: 'mb',

	STATE_ACTIVE: 'active',
	STATE_CREATED: 'created',
	STATE_DELETED: 'deleted',
	STATE_DISABLED: 'disabled',
	STATE_ENABLED: 'enabled',
	STATE_INACTIVE: 'inactive',
	STATE_PROVISIONED: 'provisioned',
	STATE_PROVISIONING: 'provisioning',
	STATE_UPDATED: 'updated',
	STATE_UNPROVISIONED: 'unprovisioned',
	STATE_FAILED: 'failed',
	
	STATUS_OBJECT: 'sts',

	/*
	 * TYPE_* are used with definitions of constraints, and optionally combined
	 * with LIST: TYPE_LIST + TYPE_STRING describes a list of strings, and so on.
	 */
	TYPE_LIST: 1, // all other TYPE_* values must be even values!
	TYPE_BOOL: 2,
	TYPE_INT: 4,
	TYPE_FLOAT: 6,
	TYPE_STRING: 8,
	TYPE_OBJECT: 10,

	WEEKDAY_MONDAY: 'mon',
	WEEKDAY_TUESDAY: 'tue',
	WEEKDAY_WEDNESDAY: 'wed',
	WEEKDAY_THURSDAY: 'thu',
	WEEKDAY_FRIDAY: 'fri',
	WEEKDAY_SATURDAY: 'sat',
	WEEKDAY_SUNDAY: 'sun',

	INTEGRITY_MD5: 'md5',
	INTEGRITY_SHA256: 'sha256',
	INTEGRITY_SHA512: 'sha512',
	INTEGRITY_NONE: 'none'
};


function alt( /* ... */ ) {
	// Variadic utility, returns regex string of alternatives, e.g. "a|b|c"
	let result = '';
	if (arguments.length) {
		result = arguments[0];
		for (let i = 1; i < arguments.length; ++i) {
			result += '|' + arguments[i];
		}
	}
	return result;
}

function group( /* ... */ ) {
	// Variadic utility, returns a group of alternatives, e.g. "(a|b|c)"
	return '(' + alt(...arguments) + ')';
}

function topic( /* ... */ ) {
	// Variadic utility, returns a regular expression for a GLP topic string
	// made from its arguments.
	// The '^glp' root is always provided and must not be included with the
	// arguments.
	// **Note** this utility produces a regular expression to match a topic,
	// it does not produce a GLP topic.
	let result = "";
	if (arguments[0].indexOf(('^' + lit.GLP)) === -1) {
		result = '^' + lit.GLP + lit.SEP;
	}
	for (let i = 0; i < arguments.length; ++i) {
		if (i < arguments.length - 1) {
			result += arguments[i] + lit.SEP;
		} else {
			result += arguments[i];
		}
	}
	return result;
}

/*
 * A number of regular expressions to match certain topic groups, used with
 * definitions of constraints.
 */
lit.TOPIC_RE_ROOT = topic( // ^glp/VERSION/SID
	String(lit.GLP_PROTOCOL_VERSION),
	lit.ANY
);

lit.TOPIC_RE_REQUEST = topic( // ^glp/VERSION/SID/rq
	lit.TOPIC_RE_ROOT,
	lit.REQUEST_CHANNEL
);

lit.TOPIC_RE_FEEDBACK = topic( // ^glp/VERSION/SID/fb
	lit.TOPIC_RE_ROOT,
	lit.FEEDBACK_CHANNEL
);

lit.TOPIC_RE_ANYCHANNEL = topic( // ^glp/VERSION/SID/(rq|fb|ev)
	lit.TOPIC_RE_ROOT,
	group(
		lit.REQUEST_CHANNEL,
		lit.FEEDBACK_CHANNEL,
		lit.EVENT_CHANNEL
	)
);

lit.DEVICE_ACTIONS = alt(
	lit.ACTION_CREATE,
	lit.ACTION_DELETE,
	lit.ACTION_DEPROVISION,
	lit.ACTION_LOAD,
	lit.ACTION_PROVISION,
	lit.ACTION_TEST,
	lit.ACTION_REPAIR,
	lit.ACTION_REPLACE,
	lit.ACTION_WINK
);

lit.DEVICE_CATEGORIES = alt(
	lit.DEVICE_CATEGORY_IO,
	lit.DEVICE_CATEGORY_INFRASTRUCTURE,
	lit.DEVICE_CATEGORY_SEGMENT
);

lit.DEVICE_HEALTH_STATES = alt(
	lit.DEVICE_HEALTH_NORMAL,
	lit.DEVICE_HEALTH_SUSPECT,
	lit.DEVICE_HEALTH_DOWN,
	lit.DEVICE_HEALTH_NASCENT
);

lit.DEVICE_STATES = alt(
	lit.STATE_CREATED,
	lit.STATE_DELETED,
	lit.STATE_PROVISIONED,
	lit.STATE_UNPROVISIONED
);

lit.GROUP_STATES = lit.DEVICE_STATES;

lit.JOB_STATES = alt(
	lit.STATE_CREATED,
	lit.STATE_ACTIVE,
	lit.STATE_UPDATED,
	lit.STATE_DELETED,
	lit.STATE_FAILED
);

lit.SCHEDULE_STATES = alt(
	lit.STATE_CREATED,
	lit.STATE_ACTIVE,
	lit.STATE_INACTIVE,
	lit.STATE_UPDATED,
	lit.STATE_DELETED
);

lit.SCHEDULEDEVENT_STATES = alt(
	lit.STATE_CREATED,
	lit.STATE_ACTIVE,
	lit.STATE_INACTIVE,
	lit.STATE_UPDATED,
	lit.STATE_DELETED
);


lit.CON_STATES = alt(
	lit.STATE_CREATED,
	lit.STATE_DELETED,
	lit.STATE_PROVISIONING,
	lit.STATE_PROVISIONED,
	lit.STATE_UNPROVISIONED,
	lit.STATE_FAILED
);

lit.ALARM_STATES = alt(
	lit.STATE_ENABLED,
	lit.STATE_DISABLED,
	lit.STATE_DELETED
);

lit.LOAD_STATES = alt();

let CONNECTION_CHANNEL_RE = topic(
	String(lit.GLP_PROTOCOL_VERSION),
	'&' + lit.ANY,
	lit.ANY,
	'data$'
);


let CONNECTION_SRC = topic(
	lit.TOPIC_RE_FEEDBACK,
	"dev",
	lit.ANY,
	lit.ANY, 
	"if",
	lit.ANY,
	lit.ANY,
	lit.ANY,
	"value"
);

let CONNECTION_DEST = topic(
	lit.TOPIC_RE_REQUEST,
	"dev",
	lit.ANY,
	lit.ANY, 
	"if",
	lit.ANY,
	lit.ANY,
	lit.ANY,
	"value"
);

let CONNECTION_DST_RE = alt(
	CONNECTION_CHANNEL_RE,
	CONNECTION_DEST
);

let CONNECTION_SRC_RE = alt(
	CONNECTION_CHANNEL_RE,
	CONNECTION_SRC
);


lit.WEEKDAY_WEEKDAY = alt(
	lit.WEEKDAY_MONDAY,
	lit.WEEKDAY_TUESDAY,
	lit.WEEKDAY_WEDNESDAY,
	lit.WEEKDAY_THURSDAY,
	lit.WEEKDAY_FRIDAY
);

lit.WEEKDAY_WEEKEND = alt(
	lit.WEEKDAY_SATURDAY,
	lit.WEEKDAY_SUNDAY
);

lit.DATAPOINT_DIRECTIONS = alt(
	lit.DATAPOINT_DIRECTION_IN,
	lit.DATAPOINT_DIRECTION_OUT
);

lit.DATAPOINT_MONITORING = alt(
	lit.DATAPOINT_MONITOR_NONE,
	lit.DATAPOINT_MONITOR_SLOW,
	lit.DATAPOINT_MONITOR_NORMAL,
	lit.DATAPOINT_MONITOR_FAST
);

lit.Location_Template = {
	desc: null,
	column: null,
	row: null,
	ele: null,
	lat: null,
	lng: null,
	sunset: -6,
	sunrise: -6
};

lit.Location_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	column: {
		min: 0,
		max: 255,
		type: lit.TYPE_INT,
		mandatory: false
	},
	row: {
		min: 0,
		max: 255,
		type: lit.TYPE_INT,
		mandatory: false
	},
	ele: {
		type: lit.TYPE_FLOAT,
		mandatory: false
	},
	lat: {
		min: -90,
		max: +90,
		type: lit.TYPE_FLOAT,
		mandatory: false
	},
	lng: {
		min: 0,
		max: 360,
		type: lit.TYPE_FLOAT,
		mandatory: false
	},
	sunset: {
		min: -90,
		max: +90,
		type: lit.TYPE_FLOAT,
		mandatory: false
	},
	sunrise: {
		min: -90,
		max: +90,
		type: lit.TYPE_FLOAT,
		mandatory: false
	}
};

lit.Limitations_Template = {
	devices: null, // report numbers possible, or unbound
	'devices-per-group': null,
	groups: null,
	'groups-per-device': null,
	'protocols': [] // see PROTOCOLS_*
};

lit.About_Template = {
	copyright: null,
	discovery: null, // see DISCOVERY_METHOD_*
	manufacturer: null,
	model: null,
	product: null,
	version: "0.00.000", // product version, use x.yy.zzz format
	glpVersion: 0, // GLP protocol version, use GLP_PROTOCOL_*
	capabilities: [], // see CAPABILITY_*
	limitations: {}, // See Limitations_*
	languages: ["en"],
	components: []
};

lit.About_Constraints = {
	copyright: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	discovery: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	manufacturer: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	model: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	product: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	version: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	glpVersion: {
		type: lit.TYPE_INT,
		mandatory: true
	},
	capabilities: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	},
	limitations: {
		type: lit.TYPE_OBJECT,
		mandatory: false
	},
	languages: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	},
	components: {
		type: lit.TYPE_LIST + lit.TYPE_OBJECT,
		mandatory: false
	}
};

lit.Time_Template = {
	day: null,
	hour: null,
	minute: null,
	month: null,
	second: null,
	tz: null,
	wday: null,
	year: null,
	zone: null
};

lit.Time_Constraints = {
	day: {
		min: 0,
		max: 31,
		type: lit.TYPE_INT,
		mandatory: true
	},
	hour: {
		min: 0,
		max: 23,
		type: lit.TYPE_INT,
		mandatory: true

	},
	minute: {
		min: 0,
		max: 59,
		type: lit.TYPE_INT,
		mandatory: true
	},
	second: {
		min: 0,
		max: 59,
		type: lit.TYPE_INT,
		mandatory: true

	},
	tz: {
		type: lit.TYPE_STRING,
		mandatory: true

	},
	wday: {
		pattern: alt(
			lit.WEEKDAY_WEEKDAY,
			lit.WEEKDAY_WEEKEND
		),
		type: lit.TYPE_STRING,
		mandatory: true
	},
	year: {
		min: 0,
		max: 3000,
		type: lit.TYPE_INT,
		mandatory: true

	},
	zone: {
		type: lit.TYPE_STRING,
		mandatory: true
	}
};

lit.InternetServer_Template = {
	address: null,
	port: null,
	protocol: null,
	security: null,
	user: null,
	passwd: null
};

lit.InternetServer_Constraints = {
	address: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	port: {
		min: 0,
		max: 65535,
		type: lit.TYPE_INT,
		mandatory: false

	},
	protocol: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	security: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	user: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	passwd: {
		type: lit.TYPE_STRING,
		mandatory: false
	}
};

lit.Config_Template = {
	desc: null,
	black: null,
	time: null, // See Time_*
	discovery: null,
	events: [],
	key: [],
	loc: null, // See Location_*
	log_days: null,
	smtp: null, // See InternetServer_*
	tracing: null,
	uplinkFreq: null,
	uplinkIdle: null,
	uplinkDrop: null,
	white: null
};

lit.Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	black: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	},
	time: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Time_Constraints,
		mandatory: false
	},
	discovery: {
		pattern: /^(0(\.\d+)?|1(\.0+)?)$/,
		type: lit.TYPE_FLOAT,
		mandatory: false
	},
	events: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	},
	key: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	},
	loc: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Location_Constraints,
		mandatory: false
	},
	log_days: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	},
	smtp: {
		type: lit.TYPE_OBJECT,
		pattern: lit.InternetServer_Constraints,
		mandatory: false
	},
	tracing: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	uplinkFreq: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	},
	uplinkIdle: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	},
	uplinkDrop: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	},
	white: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: false
	}
};

lit.Status_Template = {
	health: null,
	state: null
};

lit.Status_Constraints = {
	health: lit.TYPE_STRING,
	state: lit.TYPE_STRING
};

lit.Datapoint_Template = {
	desc: null,
	cat: null, // DATAPOINT_DIRECTION*
	monitor: null, // DATAPOINT_MONITOR*
	value: null,
	type: null
};

lit.Datapoint_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	cat: {
		pattern: lit.DATAPOINT_DIRECTIONS,
		type: lit.TYPE_STRING,
		mandatory: true
	},
	monitor: {
		pattern: lit.DATAPOINT_MONITORING,
		type: lit.TYPE_STRING,
		mandatory: true
	},
	value: {
		mandatory: true
	},
	type: {
		type: lit.TYPE_STRING,
		mandatory: true
	}
};

lit.Device_Config_Template = {
	name: null,
	desc: null,
	loc: null,
	motion_zone: null,
	motion_radius: null,
	motion_timeout: null
};

lit.Device_Config_Constraints = {
	name: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	loc: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Location_Constraints,
		mandatory: false
	},
	motion_zone: {
		type: lit.TYPE_INT,
		mandatory: false
	},
	motion_radius: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	},
	motion_timeout: {
		min: 0,
		type: lit.TYPE_INT,
		mandatory: false
	}
};

lit.Device_Status_Template = {
	action: null,
	addr: null,
	alert: null,
	amd: null,
	cat: null, // DEVICE_CATEGORIES
	health: null, // DEVICE_HEALTH_STATES
	manufacturer: null,
	product: null,
	routing: null,
	state: null, // DEVICE_STATES
	type: null,
	unid: null,
	usage: null,
	version: null
};

lit.Group_Config_Template = {
	desc: null,
	members: [],
	provision: false,
	implementation: null
};

lit.Group_Status_Template = {
	action: null,
	addr: null,
	alert: null,
	state: null // GROUP_STATES
};

lit.Group_Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	members: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: true
	}, // TODO add pattern
	provision: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	implementation: {
		type: lit.TYPE_OBJECT,
		mandatory: false
	}
};

lit.Job_Member_Constraints = {
	// obj is not constraint
	tgt: {
		type: lit.TYPE_STRING,
		pattern: lit.TOPIC_RE_ANYCHANNEL,
		mandatory: false
	}
};

lit.Job_Config_Template = {
	desc: null,
	usage: "schedule",
	members: []
};

lit.Job_Status_Template = {
	state: null // use JOB_STATES
};

lit.Job_Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	members: {
		type: lit.TYPE_LIST + lit.TYPE_OBJECT,
		pattern: lit.Job_Member_Constraints,
		mandatory: false
	},
	usage: {
		type: lit.TYPE_STRING,
		mandatory: false
	}
};

lit.Schedule_Config_Template = {
	desc: null,
	enabled: false,
	start: null,
	end: null,
	utc: false,
	events: []
};

lit.Schedule_Status_Template = {
	state: null, // use SCHEDULE_STATES
};


lit.Schedule_Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	enabled: {
		type: lit.TYPE_BOOL,
		mandatory: true
	},
	start: {
		type: lit.TYPE_STRING,
		mandatory: false
	}, // TODO: supply RE
	end: {
		type: lit.TYPE_STRING,
		mandatory: false
	}, // TODO: supply RE
	utc: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	events: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		mandatory: true,
		pattern: topic(
			lit.TOPIC_RE_FEEDBACK,
			lit.OBJECT_TYPE_SCHEDULED_EVENT,
			lit.ANY + "$"
		)
	}
};

lit.ScheduledEvent_Config_Template = {
	desc: null,
	date: null,
	day: null,
	period: 1,
	prio: lit.PRIORITY_DEFAULT,
	utc: false,
	events: []
};

lit.ScheduledEvent_Event_Constraints = {
	time: {
		type: lit.TYPE_STRING,
		mandatory: false
	}, // TODO add RE
	job: {
		type: lit.TYPE_STRING,
		pattern: topic(
			lit.TOPIC_RE_REQUEST,
			lit.OBJECT_TYPE_JOB,
			lit.ANY + "$"
		),
		mandatory: false
	}
};

lit.ScheduledEvent_Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	date: {
		type: lit.TYPE_STRING,
		mandatory: false
	}, // TODO add RE
	day: {
		type: lit.TYPE_LIST + lit.TYPE_STRING,
		pattern: alt(
			lit.WEEKDAY_WEEKDAY,
			lit.WEEKDAY_WEEKEND
		),
		mandatory: false
	},
	period: {
		min: 1,
		type: lit.TYPE_INT,
		mandatory: false
	},
	prio: {
		min: lit.PRIORITY_MIN,
		max: lit.PRIORITY_MAX,
		type: lit.TYPE_INT,
		mandatory: false
	},
	utc: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	events: {
		type: lit.TYPE_LIST + lit.TYPE_OBJECT,
		pattern: lit.ScheduledEvent_Event_Constraints,
		mandatory: true
	}
};

lit.ScheduledEvent_Status_Template = {
	state: null, // SCHEDULEDEVENT_STATES
	'last-activity': null,
	'last-time': null,
	'last-job': null
};

lit.Connection_Config_Template = {
	sources: [],
	destinations: [],
	policy: "smart",
	map: {},
	credentials: {}
};

lit.Interchange_Object_Constraints = {
	subscription: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	topic: {
		type: lit.TYPE_STRING,
		pattern: CONNECTION_CHANNEL_RE,
		mandatory: true
	} ,
	broker: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	port: {
		type: lit.TYPE_INT,
		mandatory: true
	},
	protocol: {
		type: lit.TYPE_STRING,
		pattern: alt("mqtt","mqtts","ws","wss"),
		mandatory: true
	},
	qos: {
		type:lit.TYPE_INT,
		pattern: alt(0,1,2)
	}
};

lit.Connection_Config_Constraints = {
	sources: {
		type: 
			lit.TYPE_LIST + lit.TYPE_STRING + lit.TYPE_OBJECT,
		pattern: [CONNECTION_SRC_RE, lit.Interchange_Object_Constraints],
		mandatory: true
	},
	destinations: {
		type: lit.TYPE_LIST + lit.TYPE_STRING + lit.TYPE_OBJECT,
		pattern: [CONNECTION_DST_RE, lit.Interchange_Object_Constraints],
		mandatory: true
	},
	policy: {
		type: lit.TYPE_STRING,
		pattern: alt(
			lit.POLICY_SMART, 
			lit.POLICY_STRICT
		),
		mandatory: false
	},
	map: {
		type: lit.TYPE_OBJECT,
		mandatory: false
	},
	credentials: {
		type: lit.TYPE_OBJECT,
		mandatory: false
	}
};

lit.Connection_Status_Template = {
	implementation: null,
	state: null // CONNECTION_STATES
};

lit.Alarm_Config_Template = {
	desc: null,
	enabled: true,
	cat: "alarm",
	ackd: true,
	activation: null,
	deactivation: null,
	message: null,
	urgent: false,
	actions: null,
	severity: null
};

lit.Alarm_Action_SMS_Constraint = {
	to: {
		type: lit.TYPE_STRING,
		pattern: '[0-9 +]+',
		mandatory: true
	}
};

lit.Alarm_Action_Email_Constraint = {
	to: {
		min: 3,
		type: lit.TYPE_STRING,
		pattern: '.+@.+',
		mandatory: true
	}, // TODO: better pattern for valid email
	subject: {
		min: 1,
		type: lit.TYPE_STRING,
		mandatory: true
	}
};

lit.Alarm_Action_Job_Constraint = {
	activate: {
		type: lit.TYPE_STRING,
		pattern: topic(
			lit.TOPIC_RE_REQUEST,
			lit.OBJECT_TYPE_JOB,
			lit.ANY + "$"
		),
		mandatory: false
	},
	deactivate: {
		type: lit.TYPE_STRING,
		pattern: topic(
			lit.TOPIC_RE_REQUEST,
			lit.OBJECT_TYPE_JOB,
			lit.ANY + "$"
		),
		mandatory: false
	},
	acknowledge: {
		type: lit.TYPE_STRING,
		pattern: topic(
			lit.TOPIC_RE_REQUEST,
			lit.OBJECT_TYPE_JOB,
			lit.ANY + "$"
		),
		mandatory: false
	}
};

lit.Alarm_Action_Reboot_Constraint = {
	time : {
		type: lit.TYPE_STRING,
		mandatory: false
	}
};


lit.Alarm_Actions_Constraints = {
	sms: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Alarm_Action_SMS_Constraint,
		mandatory: false
	},
	email: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Alarm_Action_Email_Constraint,
		mandatory: false
	},
	job: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Alarm_Action_Job_Constraint,
		mandatory: false
	},
	reboot: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Alarm_Action_Reboot_Constraint,
		mandatory: false
	},
	"system-report": {
		type: lit.TYPE_BOOL,
		mandatory: false
	}
};

lit.Alarm_Config_Constraints = {
	desc: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	enabled: {
		type: lit.TYPE_BOOL,
		mandatory: true
	},
	cat: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	ackd: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	activation: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	deactivation: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	message: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	urgent: {
		type: lit.TYPE_BOOL,
		mandatory: false
	},
	actions: {
		type: lit.TYPE_OBJECT,
		pattern: lit.Alarm_Actions_Constraints,
		mandatory: false
	},
	severity: {
		type: lit.TYPE_STRING,
		mandatory: false
	}
};

lit.Alarm_Status_Template = {
	state: null // ALARM_STATES
};

lit.Load_Config_Template = {
	 url: null,
	 user: null,
	 passwd: null,
	 imgpwd: null,
	 integrity: null,
	 method: null,
	 switchover: null,
	 type: null,
	 flags: null,
	 checksum: null,
	 response: null,
	 protocol: null
};

lit.Load_Config_Constraints = {
	url: {
		type: lit.TYPE_STRING,
		mandatory: true
	},// TODO Patttern for url
	user: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	passwd: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	imgpwd: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	integrity: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	method: {
		type: lit.TYPE_STRING,
		mandatory: true
	},
	switchover: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	type: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	flags: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	checksum: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	response: {
		type: lit.TYPE_STRING,
		mandatory: false
	},
	protocol: {
		type: lit.TYPE_STRING,
		mandatory: false
	}
};

lit.Load_Status_Template = {
	state: null
};

/*
 * init
 * initializes this module. The function does nothing but is provided for
 * consistency across all toolkit modules.
 */
function init() {}

/*
 * Last not least, let's export this into the v0 API:
 */
exports.v0 = lit;
exports.v0.VERSION = version;
exports.v0.init = init;
