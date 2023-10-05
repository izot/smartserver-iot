// ChirpStack 4 wrapper for TTN Codec
function decodeUplink(input) {
    var res = Decoder(input.bytes, input.fPort);
    if (res.error) {
      return {
        errors: [res.error],
      };
    }
    return {
      data: res,
    };
  }

function Decoder(bytes, fport) {
	var decoded = {};
  var current_volume;
  // Masks for status frame fport 10
  // These are from the MSB (bytes[0]) 
  const backflow      = 0b10000000;
  const blockedMeter  = 0b01000000;
  const batteryLow    = 0b00000010;
  const fraudDetected = 0b00000001;
    // Payload format varies based on FPort
    switch (fport){
        case 1:
            decoded.fport = fport;
            decoded.currentVolume = ((bytes[0] << 24) +  (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]);
            break;
        case 2:
            decoded.fport = fport;
            decoded.currentVolume = ((bytes[0] << 24) +  (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]);
            break;
        case 3:
            decoded.fport = fport;
            decoded.currentVolume = ((bytes[0] << 24) +  (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]);
            break;
        case 4:
            decoded.fport = fport;
            decoded.currentVolume = ((bytes[0] << 24) +  (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]);
            break;
        case 10:
            decoded.fport = fport;
            ((bytes[0] & backflow) == backflow) ? decoded.backflow = 1 : decoded.backflow = 0;
            ((bytes[0] & blockedMeter) == blockedMeter) ? decoded.blockedMeter = 1 : decoded.blockedMeter = 0;
            ((bytes[0] & batteryLow) == batteryLow) ? decoded.batteryLow = 1 : decoded.batteryLow = 0;
            ((bytes[0] & fraudDetected) == fraudDetected) ? decoded.fraudDetected = 1 : decoded.fraudDetected = 0;
            break;
        default:            
    }
    return decoded;
}
