#!/usr/bin/env python
"""
This is an example of how a service (in this case Python) can manipulate a MBird (virtual LON device)
to produce behaviors that are beneficial to a SmartServer test environment.  The script demonstrates
the ability to MBirds on any Ubuntu platform (including on a SmartServer) that talks on the LON network
like any physical LON device. This includes being able to be provisioned and to have datapoints that can
be read and written by the SmartServer.

In this example, this Python program does two things:
1) At a user specified rate, bump a SNVT_switch value, rotating through N DPs per device (user settable) and through each MBird
2) Whenever a user specified NVI datapoint is updated, that value is pushed out to a user specified NVO datapoint on the same device.

The program also fetches the MBird instances, discards the unprovisioned and switches the LON channel to the same channel of the specified LON interface. 
The program can also be used to change the SmartServer to Independent Management Mode (IMM) which is needed for MBird to run. 


Variables to be supplied by user:
datapointin - The name of the input datapoint to reflect
datapointout - The name of the output datapoint to reflect to
NOTE: These values are used for the example 2)

incrementlist - The list of datapoints to be increment once every time period defined by message_wait
"""


# Update Lamp/0/nviLamp on a Mockingbird device from the SmartServer and you get the event below (whether you enable monitoring or not).  So
# we will look for "updated" in the topic and then look for "value": in the payload
# glp/0/17thbp9/ev/updated/dev/lon/type/9FFFFF0501840460 {"handle":"m-01","topic":"glp/0/17thbp9/fb/dev/lon/m-01","block":"if/Lamp/0","datapoint":"nviLamp","value":{"value":87,"state":0},"health":"normal"}
# And then we want to write this value back to an output.  Here is an example:
# glp/0/17thbp9/rq/dev/lon/m-01/if/Switch/0 {"nvoSwitch":{"value":{"value":98,"state":1},"prio":17}}

# This is what I got from the program below after setting the input to 53 / 1:
# glp/0/17thbp9/rq/dev/lon/m-01/if/Switch/0 {"nvoSwitch":{"value":{"value":53,"state":0},"prio":17}}
# glp/0/17thbp9/rq/dev/lon/m-01/if/Switch/0 {"nvoSwitch":{"value":{"value": 54, "state": 0},"prio":17}}
# glp/0/17thbp9/rq/dev/lon/m-01/if/Switch/0 {"nvoSwitch":{"value":{"value":33,"state":1},"prio":17}}


# Message when connected to the SS
# TOPIC: glp/0/17qeiqj/fb/dev/lon/dyn-1-01/cfg
# {"name":"dyn-1-01","desc":"Internal device applications","loc":{"desc":"","lat":0,"lng":0,"ele":0,"row":0,"column":0,"sunrise":-6,"sunset":-6},"motion_zone":0,"motion_radius":0,"motion_timeout":0,"mru":"2023-09-13 14:01:33.381 UTC"}

# ~~~~~~~~~~~~~~~~~~~~~~~~~~ USER CONFIGURABLE SETTINGS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

# Filenames to store the newly created MBirds.
scr_filename = 'nuDevs.scr'
csv_filename = 'example_devices.csv'

message_wait = 0.1  # Delay between datapoint updates.
SERVICE_PIN_WAIT = 1  # Time between two service pin attempts.
SERVICE_PIN_TRYS = 5  # Number of attempts before giving up.
INITIAL_WAIT_TIME = 5  # Dead delay for all messages to come.
MESSAGE_TIMEOUT = 2 # Query message timeout
DEVICE_CREATION_TIMEOUT = 30
MAX_LEP_ID = 30 # Maximum LEP ID when searching for the interface. 

# Datapoints used for mirroring.
# If datapointin changes, the datapointout will also be changed.
datapointin = "Lamp/0/nviLamp"
datapointout = "Lamp/0/nvoLampFb"

# Datapoints to be incrementally updated:
datapoints = ["Lamp/1/nviLamp", "Lamp/1/nvoLampFb", "Switch/0/nviSwitchFb",
              "Switch/1/nviSwitchFb", "Switch/0/nvoSwitch", "Switch/1/nvoSwitch"]

# You can use this list to set the operational of individual MBirds.
# Create an list of tuples with exact device handle and the desired device operational state.
dev_state_list = None
# Example:
# dev_state_list = [("TI-01", "false"), ("TI-02", "true"), ("TI-03", "toggle")]
# TI-01 will be disabled, TI-02 will be enabled, and TI-03's state will be switched enable-> disable or vice versa. 
# ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import os
import csv
import sys
import time
import json
import signal
import logging
import argparse
import threading
import paho.mqtt.client as paho



glp_prefix = 'glp/0'
# SmartServer SID topic:
sid_topic = f"{glp_prefix}/././sid"
# Topic used updating datapoints
update_datapoint_topic = f'{glp_prefix}/+/ev/updated/dev/lon/type/+'
# Topics used for registering devices
dev_cfg_topic = f'{glp_prefix}/+/fb/dev/lon/+/cfg'
dev_sts_topic = f'{glp_prefix}/+/fb/dev/lon/+/sts'
dev_impl_topic = f'{glp_prefix}/+/fb/dev/lon/+/impl'
IMM_response_topic = f"{glp_prefix}/./=control/service"
subscribe_topic = [(sid_topic, 0), (update_datapoint_topic, 0), (dev_cfg_topic, 0),
                   (dev_sts_topic, 0), (dev_impl_topic, 0)]

# Global variables
MBirds = {}
dev_start_nr = 1
nr_devices_created = 0
SS_SID = None
connected = False
creation_finished = False
pending_device_handle = None
device_channel = None
time_since_last_creation = time.time()

# Setting up command line arguments
parser = argparse.ArgumentParser(
    description='Mockingbird - LON device simulator')
parser.add_argument('-t', dest='ip', type=str, default="localhost",
                    help='IP address of the target SmartServer.')

parser.add_argument('--hdl', dest='device_handle', type=str,
                    help='Base name of the handle. For example: --hdl MBird. No default.')

parser.add_argument('-x', dest='PID', type=str,
                    help='PID of the MBird device type.')

parser.add_argument('-n', dest='num_devices', type=int, default=1,
                    help='Number of devices to create. Default is 1.')

parser.add_argument('-d', dest='dev_template', type=str,
                    help='XIF of the MBird device type from the target CMS. The default is "<PID>-1".')

parser.add_argument('-s', dest='service_pin', action='store_true', default=False,
                    help="Initiates the service pin on selected MBirds. The requests will be sent until the MBird is provisioned or the service pin process times out.")

parser.add_argument('-c', dest='enable_operation', type=str,
                    help="Enables/disables MBirds containing the provided base name. Disabling the MBirds is effectively the same as turning them off.")

parser.add_argument('-i', dest='interface', type=str,
                    help="Set the LON interface to use for data transmission. Example: lon0, lon1, ... If the interface is not specified, the MBirds will be created on internal IP70 interface.")

parser.add_argument('--load', action='store_true', default=False,
                    help="Update the specified datapoints of selected MBirds.")

parser.add_argument('--imm', action='store_true', default=False,
                    help="Put the target SmartServer in the IMM mode. This needs to be done only once.")

parser.add_argument('--log', dest='log', type=str, default="INFO",
                    help='Logging level: DEBUG - all messages, INFO - information, WARNING - warnings, ERROR - errors.')

args = parser.parse_args()


varlock = threading.Lock()

# Setting up process terminator
runner = True
def cool_exit(sig=None, frame=None):
    global runner
    runner = False
    # If stopped unsubscribe from all topics and disconnect.
    try:
        if client and client != None:
            for t in subscribe_topic:
                client.unsubscribe(t[0])
            client.loop_stop()
            client.disconnect()
    except:
        pass

    logging.info('Stopping, bye!')

    sys.exit(0)
    
signal.signal(signal.SIGINT, cool_exit)
signal.signal(signal.SIGTERM, cool_exit)

# Setting the logging level
numeric_level = getattr(logging, args.log.upper(), None)
if not isinstance(numeric_level, int):
    raise ValueError('Invalid log level: %s' % args.log.upper())
logging.basicConfig(level=args.log.upper())


def create_csv_file(filename):
    """Create a new .csv file and write the header line if the file doesn't exist."""
    header1 = ['#filetype', 'devices']
    header2 = ["name", "deviceType", "category", "protocol", "discoveryMethod", "installationDate",
               "uid", "longitude", "latitude", "customerName", "did", "ownerMAC", "timezone"]
    if not os.path.exists(filename):
        with open(filename, 'w', newline='') as csvfile:
            csvwriter = csv.writer(csvfile)
            csvwriter.writerow(header1)
            csvwriter.writerow(header2)


def append_csv_line(filename, row):
    """Append a row to an existing .csv file."""
    with open(filename, 'a', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(row)


def append_scr_line(filename, dev_uid):
    """ Create a new .scr file or append a row to an existing .scr file."""
    if not os.path.exists(filename):
        with open(filename, 'w', newline='') as scrfile:
            scrfile.write(f"q\n{dev_uid}\n")
    else:
        with open(filename, 'a', newline='') as scrfile:
            scrfile.write(f"q\n{dev_uid}\n")


def mqtt_topic_match(actual_topic, filter_topic):
    filter_segments = filter_topic.split('/')
    actual_segments = actual_topic.split('/')
    # Handling the multi-level wildcard
    if filter_segments[-1] == '#':
        return actual_segments[:len(filter_segments) - 1] == filter_segments[:-1]
    # Check for equal length of segments
    if len(filter_segments) != len(actual_segments):
        return False
    # Check each segment for match
    for filter_segment, actual_segment in zip(filter_segments, actual_segments):
        if filter_segment != '+' and filter_segment != actual_segment:
            return False

    return True


def create_device(device_handle):
    global pending_device_handle, nr_devices_created, creation_finished, runner
    if SS_SID == None:
        logging.error("The connection to the SS was unsuccessful. No SID obtained!")
        cool_exit()

    if device_handle in MBirds:
        logging.info(f"Device {device_handle} already exists. Skipping creation")
        # Try to increase the handle number and check if it this device exists.
        trys = 0
        while device_handle in MBirds and nr_devices_created < args.num_devices:
            # Try creating devices with a new handle.
            trys += 1
            nr_devices_created += 1
            device_handle = f"{args.device_handle}-{str(nr_devices_created + dev_start_nr).zfill(2)}"
            if trys > args.num_devices:
                logging.error(f"Tried to increment the name for too many times. Something is probably wrong.")
                cool_exit()
            
            if nr_devices_created >= args.num_devices:
                # All devices probably already exist
                creation_finished = True
                logging.info("All devices already created.")
                return
            
            logging.info(f"Device {device_handle} already exists. Skipping creation")
        

    create_msg = {
        "action": "create",
        "args": {
            "unid": "auto",
            "type": args.PID,
            "lon.attach": "local",
            "provision": False if args.num_devices > 0 else True
        }
    }

    set_cfg_msg = {
        "name": f"{device_handle}",
        "desc": "Internal device applications"
    }

    logging.info(f"Creating a MBird: {device_handle} based on {args.PID}")
    pending_device_handle = device_handle

    # Sending the MBird create request
    create_topic = f"{glp_prefix}/{SS_SID}/rq/dev/lon/{device_handle}/do"
    client.publish(create_topic, json.dumps(create_msg))
    # Updating the MBird configuration
    config_topic = f"{glp_prefix}/{SS_SID}/rq/dev/lon/{device_handle}/cfg"
    client.publish(config_topic, json.dumps(set_cfg_msg))


def handle_IMM_switch(client, userdata, message):
    if len(message.payload) == 0:
        logging.error("Empty IMM response message!")
        return
    try:
        jsonMessage = json.loads(message.payload)
        if jsonMessage["request"] == f"{glp_prefix}/{SS_SID}/rq/dev/lon/lon.sys/if/system/0":
            if jsonMessage["datapoint"]["value"] == "Independent":
                # Ack. and unsubscribe from the topic. 
                logging.info("Switching to IMM successful!")
                client.unsubscribe(IMM_response_topic)
    except:
        logging.error("Decoding of IMM response message failed.")


def set_IMM(client, IMM_switch_topic):
    if SS_SID == None:
        logging.error("SID is not set!")
        return
    
    # Subscribe to the response topic
    client.subscribe(IMM_response_topic)
    client.message_callback_add(IMM_response_topic, handle_IMM_switch)
    
    # Sending the switch to IMM request
    switch_to_IMM_msg = {
        "service": {
            "value":"Independent"
        }
    }
    client.publish(IMM_switch_topic, json.dumps(switch_to_IMM_msg))


lon_interface = None
meta_response = None
def handle_LON_message(client, userdata, message):
    global lon_interface, meta_response
    try:
        jsonPayload = json.loads(message.payload)
        logging.debug(str(jsonPayload))
        if str(jsonPayload["body"]["type"]) == "/~/type/iface":
            # Check if the interface is the one we're looking for.
            interface_path = jsonPayload["body"]["hardwarePath"]
            if interface_path == args.interface:
                logging.info(f"Found LON interface: {interface_path}")
                try:
                    # Check whether the interface is offline:
                    if lon_interface["body"]["status"]["offline"] == "true":
                        logging.info(f"LON interface: {interface_path} found but it's offline!")
                        #lon_interface = None
                    else:
                        logging.info(f"LON interface: {interface_path} found and not offline!")
                        lon_interface = jsonPayload
                except:
                    # Decoding of the lon_interface["body"]["status"]["offline"] failed, because it doesn't exist in the message body.
                    logging.info(f"LON interface: {interface_path} is found and online!")
                    lon_interface = jsonPayload
        else:
            logging.debug("Meta response is not of interface type.")
    except:
        logging.error("LON meta response message decoding failed.")
    # Response is processed.
    meta_response = True


def find_LON_interface(client):
    global lon_interface, meta_response
    meta_payload = "{\"method\":\"GET\"}"
    # Iterate through the positive lep/0/lon/0/request/${LEP_ID}/meta topic until you find the interface.
    for LEP_ID_handle in range(1, MAX_LEP_ID):
        if runner == False:
            break
        # Topic used to query the LEP handles
        meta_topic = f"lep/0/lon/0/request/{str(LEP_ID_handle)}/meta"
        # Topic used to get the response of LEP objects
        meta_topic_response = f"lep/0/lon/0/response/{str(LEP_ID_handle)}/meta"
        
        # Set the callback to the response topic of a query message.
        client.subscribe(meta_topic_response)
        client.message_callback_add(meta_topic_response, handle_LON_message)
        
        # Send the query:
        meta_response = False 
        logging.debug(f"Trying the meta topic: {meta_topic}")
        client.publish(meta_topic, meta_payload)
        
        # Wait for a response...
        timeout = time.time() + MESSAGE_TIMEOUT
        while runner and not meta_response and time.time() < timeout:
            time.sleep(0.1)
        
        # Response received (or timeout), remove the callback:
        client.unsubscribe(meta_topic_response)
        client.message_callback_remove(meta_topic_response)
        
        if time.time() < timeout:
            if lon_interface != None:
                return True # Interface found
            # Interface not found, move on.
            logging.debug(f"LON interface not found on the {meta_topic}")
        else: 
            # The waiting period elapsed.
            logging.info("LON interface response timed out.") 
        
    return False


channel_response = None
def handle_LON_channel(client, userdata, message):
    global channel_response, device_channel
    try:
        jsonPayload = json.loads(message.payload)
        logging.debug(str(jsonPayload))
        if "/~/type/channel/LON/" in str(jsonPayload["body"]["type"]):
            # Get the channel interface and interface number from the message payload. 
            channel_interface = jsonPayload["body"]["link"]["iface"]
            channel_interface_nr = int(channel_interface.split("/")[-1]) 
            if channel_interface_nr == int(lon_interface["body"]["id"]):
                # TODO: check the functionality of the channel:
                device_channel = jsonPayload["body"]["id"]
            else:
                logging.info("Channel not found on the topic")
        else:
            logging.debug("Meta response is not of channel type.")
    except:
        logging.error("LON meta response message decoding failed.")
    
    channel_response = True


def find_LON_channel(client, iface_id):
    global lon_interface, channel_response
    meta_payload = "{\"method\":\"GET\"}"
    # Iterate through the positive lep/0/lon/0/request/${LEP_ID}/meta topic until you find the interface.
    for LEP_ID_handle in range(1, MAX_LEP_ID):
        if runner == False:
            break
        # Channels have negative handle numbers
        LEP_ID_handle = -1*LEP_ID_handle
        # Topic used to query the LEP handles
        meta_topic = f"lep/0/lon/0/request/{str(LEP_ID_handle)}/meta"
        # Topic used to get the response of LEP objects
        meta_topic_response = f"lep/0/lon/0/response/{str(LEP_ID_handle)}/meta"
        
        # Create a callback for the response topic. 
        client.subscribe(meta_topic_response)
        client.message_callback_add(meta_topic_response, handle_LON_channel)
        
        # Send the query:
        channel_response = False 
        logging.debug(f"Trying the meta topic: {meta_topic}")
        client.publish(meta_topic, meta_payload)
        
        # Wait for a response
        timeout = time.time() + MESSAGE_TIMEOUT
        while runner and not channel_response and time.time() < timeout:
            time.sleep(0.1)
        
        # Response received (or timeout), remove the callback:
        client.unsubscribe(meta_topic_response)
        client.message_callback_remove(meta_topic_response)
        
        if time.time() < timeout:    
            if device_channel != None:
                logging.info(f"Channel found {device_channel}")
                return True # Channel found
            else:
                logging.debug(f"Channel not found on the LEP handle {LEP_ID_handle}")
        else:
            # The waiting period elapsed.
            logging.info("LON channel response timed out.") 
        
    return False

    
def handle_sid(client, userdata, message):
    global SS_SID, runner
    try:
        sid_message = message.payload.decode("utf-8")
        if not isinstance(sid_message, str) or len(sid_message) == 0:
            raise Exception("Bad SID response")
        # Check the SID and store it in a value
        SS_SID = str(sid_message).strip('\"')
        
        if SS_SID.isalnum():
            logging.info(f"Successfully connected to the SmartServer, SID: {SS_SID}")
        else:
            logging.error(f"SID is not alphanumeric: {SS_SID}. Something is wrong!")
            cool_exit()
        
        # Switch to the IMM mode if requested by the user. 
        IMM_switch_topic = f"{glp_prefix}/{SS_SID}/rq/dev/lon/lon.sys/if/system/0"
        if args.imm == True:
            logging.info("Trying to switch the target SS to the IMM.")
            set_IMM(client, IMM_switch_topic)
        # Unsubscribe from the SID topic, no longer needed.
        client.unsubscribe(sid_topic)
    except:
        logging.error("Parsing of the SID response failed")
        cool_exit()


def handle_creation_finished(LONdev):
    # Write the result to the .csc
    try:
        dev_unid = LONdev.status["unid"]
        device_csv_entry = [LONdev.name, args.dev_template,"EDGE","lon","manual","",f"'{dev_unid}",-121.93216,37.28506,"Customer 1","","",""]
        append_csv_line(csv_filename, device_csv_entry)
        append_scr_line(scr_filename, dev_unid)
    except:
        logging.error("Writing to .csv file failed.")


def handle_device_creation(client, userdata, message):
    global nr_devices_created, creation_finished, pending_device_handle, time_since_last_creation
    if runner == False:
        sys.exit(0)
    # Get the incoming message.
    payload = message.payload.decode('utf-8')
    dictMessage = json.loads(payload)
    logging.debug(f"topic: {message.topic} | payload: {payload}")
    # Discard empty messages.
    if len(dictMessage) == 0:
        return  # Empty json.

    # Figure out the device's handle.
    try:
        device_handle = message.topic.split("/")[6]
        if device_handle == "lon.sys":
            return # Skip the system LON device
    except:
        logging.error("Failed to obtain the device handle from the topic split.")
        return
    
    # Create LON device instances based on incoming messages.
    # Discriminate messages based on topics: cfg, sts and impl topics. 
    if mqtt_topic_match(message.topic, dev_cfg_topic):
        # cfg message - create the initial devices
        if dictMessage['desc'] == "Internal device applications":
            d = LONDevice(dictMessage['name'])
            d.set_cfg(dictMessage)
            MBirds[dictMessage['name']] = d
            
    elif mqtt_topic_match(message.topic, dev_sts_topic):
        try:
            logging.debug(f"sts: Device {device_handle} | state: {dictMessage['state']}")
        except:
            # No state argument in a message body. Skip... 
            return
        
        # Is it the newly created device?
        if pending_device_handle != None and device_handle == pending_device_handle:
            if dictMessage['state'] == "deleted":
                # TODO: handle when device is deleted when it should be created.
                pass  # for now don't do anything

            if dictMessage['state'] == "nonexistent":
                logging.error(f"MBird {device_handle} creation failed!")
                cool_exit()
                 
            # Received the sts message from the device being  created. 
            logging.info(f"Received the sts message from the MBird {device_handle} being created.")
            
        # sts message - find the devices if it's in the list and update it with the sts message
        device = MBirds.get(device_handle, None)
        if device != None:
            if dictMessage['state'] != "deleted" or dictMessage['state'] != "nonexistent":
                # Add the status message to the existing device (if not deleted). 
                device.set_status(dictMessage)
        else:
            # The device doesn't exist yet, use the device handle from the topic. 
            if dictMessage['state'] != "deleted" or dictMessage['state'] != "nonexistent":
                logging.debug(f"No previously created device with handle {device_handle} to assign this status message: {str(dictMessage)}")
                d = LONDevice(device_handle)
                d.set_status(dictMessage)
                MBirds[device_handle] = d

    elif mqtt_topic_match(message.topic, dev_impl_topic):
        # impl message - find the devices if it's in the list and update it with the impl message
        device = MBirds.get(dictMessage['meta']['eid'], None)
        if device == None:
            # The device is not in the list of the devices yet. Not usually what happens, but add it either way.
            logging.info( f"No previously created device with handle {dictMessage['meta']['eid']} to assign this impl message: {str(dictMessage)}")
            d = LONDevice(dictMessage['meta']['eid'])
            d.set_impl(dictMessage)
            MBirds[dictMessage['meta']['eid']] = d
        else:
            # Set the impl topic of an existing device. 
            device.set_impl(dictMessage)
            # Is it the newly created device? if yes, set it's channel.  
            if pending_device_handle != None and pending_device_handle == device_handle:
                # Set the device's channel and move on with the creation.
                if device_channel != None and device.channel_nr != f"/~/{device_channel}":
                    device.switch_channel(f"/~/{device_channel}")
                
                logging.info(f"Device: {device_handle} fully created and configured.") 
                
                time_since_last_creation = time.time()
                nr_devices_created = nr_devices_created + 1 
                handle_creation_finished(device)

                if nr_devices_created < args.num_devices:
                    new_device_handle = f"{args.device_handle}-{str(nr_devices_created + dev_start_nr).zfill(2)}"
                    create_device(new_device_handle)  # Invoke the next creation.
                else:
                    logging.info(f"Creation of the {nr_devices_created} MBirds finished!")
                    pending_device_handle = None
                    creation_finished = True    
        
def handle_datapoint_update(client, userdata, message):
    if runner == False:
        sys.exit(0)
    # Topic used for conditional datapoint updating
    payload = message.payload.decode('utf-8')
    dictMessage = json.loads(payload)
    logging.debug(f"* update msg | topic: {message.topic} | payload: {payload}")
    # Get the device name name from the update event
    dev_name = dictMessage['handle']
    # Check if there are devices with this name
    device = MBirds.get(dev_name, None)
    if device == None:
        return
    parts = datapointin.split('/')
    # If the updated value matches the specified input datapoint
    # then change the specified output datapoint
    if dictMessage['block'] == f"if/{parts[0]}/{parts[1]}":
        if dictMessage['datapoint'] == parts[2]:
            logging.info(f"Updating {datapointout} of the device {device}, caused by change on {datapointin}")
            device.update_datapoint(datapointout, str(dictMessage['value']))

# LON device class
class LONDevice:
    def __init__(self, name):
        self.name = name
        self.target_channel = None
        self.target_dev_state = None

    def set_status(self, jsonPayload):
        try:
            logging.debug(f"Adding the sts data for the {self}")
            self.dev_state = jsonPayload['state']
            self.health = jsonPayload['health']
            # Save the whole structure
            self.status = jsonPayload
            # Check the desired health.
            if self.target_dev_state != None:
                if self.target_dev_state == "true" and self.health == "provisioned" or self.health == "suspect": 
                    logging.info(f"{self.name} | device successfully powered on with health: {self.health}")
                elif self.target_dev_state == "false" and self.health == "disabled":
                    logging.info(f"{self.name} | device successfully powered off with health: {self.health}")
        except:
            logging.error(f"{self.name}| Unpacking of the sts message failed!")
        
        return self

    def set_cfg(self, jsonPayload):
        try:
            logging.debug(f"Adding the cfg data for the {self}")
            cfg_name = jsonPayload["name"]
            if cfg_name != self.name:
                logging.warning("The name from the cfg and sts don't match!")
            # Save the whole structure
            self.cfg_json = jsonPayload
        except:
            logging.error(f"{self.name}| Unpacking of the sts message failed!")
            
        return self

    def set_impl(self, jsonPayload):
        try:
            logging.debug(f"Adding the impl data for the {self}")
            self.LEP_id = jsonPayload['meta']['id']
            self.channel_nr = jsonPayload['meta']['link']['channel']
            # Save the whole structure
            self.impl = jsonPayload
            # Check the desired channel.
            if self.target_channel != None and self.target_channel == self.channel_nr:
                logging.info(f"{self.name} | channel switched to {self.target_channel}")
        except:
            logging.error(f"{self.name}| Unpacking of the sts message failed!")
            
        return self

    def switch_channel(self, channel_name):
        self.target_channel = channel_name
        if self.LEP_id == None:
            logging.error("The LON device has no LEP id!")
            return
        logging.info(f"Changing the channel type of the {self} to {channel_name}.")
        # Topic: "lep/0/lon/0/request/$i/meta/link/channel"
        topic = f"lep/0/lon/0/request/{self.LEP_id}/meta/link/channel"
        # Message: "{\"method\":\"PUT\",\"body\":\"/~/-4\"}"
        payload = f"{{\"method\":\"PUT\",\"body\":\"{channel_name}\"}}"
        client.publish(topic, payload)

    def update_datapoint(self, datapoint, value):
        logging.info(f"Updating the output datapoint: {self.name} | {datapoint} | {value}")
        with varlock:
            parts = datapoint.split('/')
            strValue = value.replace("'", '"')
            zt = f"glp/0/{SS_SID}/rq/dev/lon/{self.name}/if/{parts[0]}/{parts[1]}"
            zp = "{\"" + parts[2] + "\":{\"value\":" + strValue + ",\"prio\":0}}"
            logging.debug(f"TOPIC: {zt} | PAYLOAD: {zp}")
            client.publish(zt, zp)

    def enable(self, state):
        logging.info(f"Setting the initial state of {self} to {state}")
        zt = f"lep/0/lon/0/request/{self.LEP_id}/meta/enabled"
        if state == "toggle":
            if self.dev_state == "disabled":
                state = "true"
            elif self.dev_state == "provisioned" or self.dev_state == "suspect":
                state = "false"
            else:
                # Default
                state = "true"
        # Set the target state.
        self.target_dev_state = state
        zp = f"{{\"method\":\"PUT\",\"body\":{state}}}"
        logging.debug(f"TOPIC: {zt} | PAYLOAD: {zp}")
        client.publish(zt, zp)
        
        return self
    
    def service_pin(self):
        zt = f"lep/0/lon/0/request/cmd/{self.LEP_id}/service/servicePin"
        zp = "{\"method\":\"PUT\",\"body\":{\"processingState\":\"request\"}}"
        logging.debug(f"Requested servicePin for {self.name} with LEP ID: {self.LEP_id}")
        client.publish(zt, zp)
        return self
        
    def __str__(self) -> str:
        return self.name


def on_connect(client, userdata, flags, rc):
    global connected
    logging.info("Connected with result code "+str(rc))
    connected = True


def on_disconnect(client, userdata, rc):
    global connected
    logging.info("Disconnected with result code "+str(rc))
    connected = False


# Arguments logic:
if args.PID == None:
    if args.dev_template == None:
        logging.error("<PID> and <devicetype> not provided!")
        cool_exit()
    else:
        dev_template_prefix = args.dev_template.split("-")[0]
        args.PID = f"{dev_template_prefix}.xif"
else:
    if args.dev_template == None:
        args.dev_template = f"{args.PID}-1"


# create MQTT client object
client = paho.Client("mbird")     # !! Must be unique !!
client.on_connect = on_connect
client.on_disconnect = on_disconnect

# connect
logging.info('Waiting to connect to {}'.format(args.ip))
client.connect(args.ip)

# Subscribe to all topics
client.subscribe(subscribe_topic)

# Register callbacks to specific topics:
# Callback for obtaining SS SID
client.message_callback_add(sid_topic, handle_sid)
# Callback for registering devices:
# NOTE: make sure that all of the topics using handle_device_creation() callback
# have a device handle on the message.topic.split("/")[6]
client.message_callback_add(dev_impl_topic, handle_device_creation)
client.message_callback_add(dev_sts_topic, handle_device_creation)
client.message_callback_add(dev_cfg_topic, handle_device_creation)
# Callback for updating datapoint values
client.message_callback_add(update_datapoint_topic, handle_datapoint_update)

client.loop_start()


if __name__ == "__main__":
    # Wait for all retaining messages to come from the SmartServer
    time.sleep(1)
    
    # Check which channel to use for the device creation based on the selected interface: 
    if args.interface != None:
        logging.info("Trying to figure out which channel to use.")
        if find_LON_interface(client):
            # Interface does exist, find the LEP channel connected to the interface. 
            lon_interface_lep_id = lon_interface["body"]["id"]
            # Find the channel connected to the specified LON interface. 
            if find_LON_channel(client, lon_interface_lep_id):
                logging.info(f"Channel for the specified interface found!: Channel ID: {device_channel}")
            else:
                logging.info("Channel for the interface couldn't be found!")
        else:
            logging.info("Specified interface couldn't be found!")
            cool_exit()
               
    # Decide whether to create new devices and start creating if needed:
    if args.device_handle != None and args.dev_template != None:
        # Create .csv file and write header if it doesn't exist
        create_csv_file(csv_filename)
        # Check if the device handle are separated
        if "-" in args.device_handle:
            handle_parts = args.device_handle.split("-")
            try:
                dev_start_nr = int(handle_parts[-1])
            except:
                logging.error("Bad device handle formatting!")
                cool_exit()
                
            args.device_handle = "".join(handle_parts[:-1])
        # Create the initial MBird
        logging.info("MBirds creation initiated.")
        time_since_last_creation = time.time()
        create_device(f"{args.device_handle}-{str(nr_devices_created + dev_start_nr).zfill(2)}")
        
        # Wait for the devices to finish with creation
        while runner and not creation_finished and time.time() - time_since_last_creation < DEVICE_CREATION_TIMEOUT:
            time.sleep(0.1)
        
        if time.time() - time_since_last_creation >= DEVICE_CREATION_TIMEOUT:
            logging.error(f"Device creation timed out on {pending_device_handle}")
            cool_exit()
        
        logging.info("MBirds created, moving on.")
        
    else:
        logging.info("No MBird handle specified. Not creating any devices!")
        cool_exit()

    # Wait for all of the remaining messages to come. 
    logging.info(f"Waiting {INITIAL_WAIT_TIME}s for all incoming messages.")
    time.sleep(INITIAL_WAIT_TIME)

    # Show all devices. This could be available as an option enabled by an argument -v
    logging.info("All available devices:")
    for dev in MBirds.values():
        logging.info(dev)
    
    # Create a subset of all devices to control and manipulate:
    # Select all if no handle is provided:
    MBirds_subset = {}
    logging.info("Creating a subset of devices based on the provided handle.")
    if args.device_handle != None:
        for key, dev in MBirds.items():
            if args.device_handle in key:
                MBirds_subset[key] = dev
                logging.info(dev)
        
        if len(MBirds_subset) == 0:
            logging.error(f"No devices with the handle {args.device_handle} found!")
            runner = False
    else:
        logging.info("No handle provided, taking all available devices.")
        MBirds_subset = MBirds


    for dev in MBirds_subset.values():
        # Set the operational state of selected devices.
        if args.enable_operation != None:
            # Option 1: change the device's operational state using argument -c and the user specified list. 
            if dev_state_list != None and len(dev_state_list) > 0:
                # Try to find the device handle in the list of set to change the state.
                try:
                    state = list(filter(lambda x: x[0] == dev.name, dev_state_list))
                    if state:
                        dev.enable(state[0][1])
                except:
                    pass
            else:
                # Option 2: Set the state of all devices which contain the base handle.
                if args.enable_operation == "true" or args.enable_operation == "false" or args.enable_operation == "toggle":
                    dev.enable(args.enable_operation)
                else:
                    logging.error("Bad formatting of the device operational state -c <true/false/toggle>")
                    cool_exit()
        
        # Change the channel if needed and if not done during the creation of a device. 
        if device_channel != None and dev.channel_nr != f"/~/{device_channel}":
            dev.switch_channel(f"/~/{device_channel}")

    # If the service pin enabled, try it for all selected devices. 
    if args.service_pin:
        for i, dev in enumerate(MBirds_subset.values()):
            # Try to provision devices using servicePin and remove them if they fail.
            # and check the devices are on the right channel
            if dev.dev_state == "unprovisioned":
                logging.info(f"Trying to set the servicePin of {dev}.")
                dev.service_pin()
                tries = 0
                while dev.dev_state != "provisioned" and runner:
                    time.sleep(SERVICE_PIN_WAIT)
                    tries += 1
                    logging.info(f"Trying servicePin again {dev}!")
                    dev.service_pin()
                    if tries > SERVICE_PIN_TRYS:
                        break

    if not args.load:
        logging.info("Load generation wasn't enabled. Enable it with additional --load argument")
        cool_exit()
    
    # Main loop:
    # Iterate through all LON devices by iterating through
    # specified datapoints and setting their values.
    val_out = 0
    while runner and connected:
        try:
            for dev in MBirds_subset.values():
                # Don't load unprovisioned devices (for now).
                if dev.dev_state != "provisioned":
                    continue

                for dp in datapoints:
                    if runner != True:
                        break
                    # {"value":valout,"state":1}
                    dp_value = f"{{\"value\":{str(val_out)},\"state\":1}}"
                    dev.update_datapoint(dp, dp_value)
                    time.sleep(message_wait)
            val_out = val_out + 0.5
            if val_out > 100:
                val_out = 0
        except:
            runner = False
            