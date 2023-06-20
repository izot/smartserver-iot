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

/**
 * Payload Decoder for Chirpstack and Milesight network server
 *
 * Copyright 2021 Milesight IoT
 *
 * @product WS301
 */
 function Decoder(bytes, port) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // DOOR / WINDOW STATE
        else if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.state = bytes[i] === 0 ? 1 : 0;
            decoded.state = parseFloat(decoded.state);
            i += 1;
        }
        // INSTALL STATE
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.install = bytes[i] === 0 ? 1 : 0;
          	decoded.install = parseFloat(decoded.install);
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}