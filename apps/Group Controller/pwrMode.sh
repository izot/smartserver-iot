#!/bin/bash
echo "Setting GC-1/if/pwr/0/cpHOA state"
echo "  Script Version: 1.01"
if [ "$#" -lt 1 ]; then
   echo "\nThis script needs 1 argument: AUTO|HAND|OFF are valid parameters, case sensitive."
   echo "  HAND is forced ON.  Set to AUTO for schedule driven"
   exit 1
fi

MODE_VAL="$1"
T_MODE=glp/0/$APOLLO_INSTALL_CODE/rq/dev/lon/GC-1/if/pwr/0/cpHOA/value
# mosquitto_pub -t $T_MODE -m "\"HAND\""
mosquitto_pub -t "$T_MODE" -m \"$MODE_VAL\"

echo "cpHOA: $1"