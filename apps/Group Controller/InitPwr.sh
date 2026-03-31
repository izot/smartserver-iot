mosquitto_pub -t glp/0/17qam11/rq/dev/lon/GC-1/if/pwr/0/cpOnLevel/value -m 1
mosquitto_pub -t glp/0/17qam11/rq/dev/lon/GC-1/if/pwr/0/cpOffLevel/value -m 0
mosquitto_pub -t glp/0/17qam11/rq/dev/lon/GC-1/if/pwr/0/cpPointPath/value -m '{"pathStr":"modbus/1/if/DO/0/DO_0"}'

