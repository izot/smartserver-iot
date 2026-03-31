#!/bin/bash
echo "Initialize GC-1/if/pwr/0 configuration"
echo "Scipt Version: 1.01"
if [ "$#" -lt 3 ]; then
   echo "This script needs 3 arguments: pointPath ON_value OFF_value"
   echo "  pointPath example: modbus/1/if/DO/0/DO_0"
   exit 1
fi

T_ON=glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/GC-1/if/pwr/0/cpOnLevel/value
T_OFF=glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/GC-1/if/pwr/0/cpOffLevel/value
T_MODE=glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/GC-1/if/pwr/0/cpHOA/value
T_PATH=glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/GC-1/if/pwr/0/cpPointPath/value

PATH_POINT="$1"
ON_VAL=$2
OFF_VAL=$3
JSON_STR="{\"pathStr\":\"$PATH_POINT\"}"

echo "Setting up GC-1/pwr/0 configuration"
mosquitto_pub -t "$T_ON" -m $ON_VAL
mosquitto_pub -t "$T_OFF" -m $OFF_VAL
mosquitto_pub -t "$T_PATH" -m "$JSON_STR"
echo "Forcing segment power ON"
mosquitto_pub -t "$T_MODE" -m "\"HAND\""
