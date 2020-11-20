function Decode(fPort, bytes, variables) {

    var BatteryVolts = bytes[3] / 10;
    var Temperature = (bytes[4]<<24>>16 | bytes[5]) / 100;
    var Humidity = ((bytes[6] << 8) | bytes[7]) / 100;
    
    return {
        Volts: BatteryVolts,
        Temperature : Temperature,
        Humidity: Humidity
        };
    }