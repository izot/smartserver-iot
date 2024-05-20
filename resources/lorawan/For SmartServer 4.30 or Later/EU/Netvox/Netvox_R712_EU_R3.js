/*
 * Example decoder for some Netvox sensors with The Things Network, Chirpstack and node.js CLI
 * FOR TESTING PURPOSES ONLY
 * Paul Hayes - paul@alliot.co.uk
 */

function Decoder(bytes, fport) {
	var decoded = {data:{}};
	if (fport === 6) { // then its ReportDataCmd
		if (bytes[2] === 0x00) { // version report
			decoded.data.softwareversion = bytes[3];
			decoded.data.hardwareversion = bytes[4];
			decoded.data.datecode = bcdtonumber(bytes.slice(5, 9));
			return decoded;
		}
		if ((bytes[1] === 0x01) && (bytes[2] === 0x01)) { // device type 01 (R711/712) and report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature = ((bytes[4] << 24 >> 16) + bytes[5]) / 100;
            decoded.data.humidity = ((bytes[6] << 8) + bytes[7]) / 100;
		} else if ((bytes[1] === 0x9C) && (bytes[2] === 0x01)) { // device type 156 (R718AD)
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature = ((bytes[4] << 24 >> 16) + bytes[5]) / 100;     
		} else if ((bytes[1] === 0x02) && (bytes[2] === 0x01)) { // device type 02 (R311A), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.contact = bytes[4];
		} else if ((bytes[1] === 0x06) && (bytes[2] === 0x01)) { // device type 06 (R311W)
			decoded.data.battery = bytes[3] / 10;
			decoded.data.leakone = bytes[4];
			decoded.data.leaktwo = bytes[5];
		} else if ((bytes[1] === 0x13) && (bytes[2] === 0x01)) { // device type 13 (R718AB)
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature = ((bytes[4] << 24 >> 16) + bytes[5]) / 100;
			decoded.data.humidity = ((bytes[6] << 8) + bytes[7]) / 100;
		} else if ((bytes[1] === 0x16) && (bytes[2] === 0x01)) { // device type 13 (R718CK2)
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature1 = ((bytes[4] << 24 >> 16) + bytes[5]) / 10;
			decoded.data.temperature2 = ((bytes[6] << 24 >> 16) + bytes[7]) / 10;
		} else if ((bytes[1] === 0x0E) && (bytes[2] === 0x01)) { // device type 0E (R809A) and report type 01
			decoded.data.state = bytes[3];
			decoded.data.kwhused = ((bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7]) / 1000;
		} else if ((bytes[1] === 0x0E) && (bytes[2] === 0x02)) { // device type 0E (R809A), report type 02
			decoded.data.volts = ((bytes[3] << 8) + bytes[4]);
			decoded.data.amps = ((bytes[5] << 8) + bytes[6]) / 1000;
			decoded.data.watts = ((bytes[7] << 8) + bytes[8]);
		} else if ((bytes[1] === 0x03) && (bytes[2] === 0x01)) { // device type 0E (RB11E), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature = ((bytes[4] << 24 >> 16) + bytes[5]) / 100;
			decoded.data.illuminance = ((bytes[6] << 8) + bytes[7]);
			decoded.data.occupied = bytes[8];
		} else if (((bytes[1] === 0x05) || (bytes[1] === 0x09)) && (bytes[2] === 0x07)) {  // device R72615A, CO2 report type
			decoded.data.battery = bytes[3] / 10;
			if ((bytes[4] != 0xff) || (bytes[5] != 0xff)) { // sometimes see ffff as co2 data?!?
				decoded.data.co2 = ((bytes[4] << 8) + bytes[5]) / 10;
			}
			// the rest of the message is 0xff for other sensor types
		} else if (((bytes[1] === 0x05) || (bytes[1] === 0x09)) && (bytes[2] === 0x0C)) { // device R72615A, temp & humidity report
			decoded.data.battery = bytes[3] / 10;
			decoded.data.temperature = ((bytes[4] << 24 >> 16) + bytes[5]) / 100;
			decoded.data.humidity = ((bytes[6] << 8) + bytes[7]) / 100;
			// the rest of the message is 0xff for other sensor types
		} else if ((bytes[1] === 0x1B) && (bytes[2] === 0x01)) { // device R718DB and report 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.vibration = bytes[4];
		} else if ((bytes[1] === 0x49) && (bytes[2] === 0x01)) { // device type 49 (R718N1) and report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.rawcurrentma = ((bytes[4] << 8) + bytes[5]);
			decoded.data.multiplier = bytes[6];
			decoded.data.currentma = decoded.data.rawcurrentma * decoded.data.multiplier;
		} else if ((bytes[1] === 0x4A) && (bytes[2] === 0x01)) { // device type 4A (R718N3) and report type 01
			// full data is split over two separate uplink messages
			decoded.data.battery = bytes[3] / 10;
			decoded.data.multiplier1 = bytes[10];
			decoded.data.rawcurrentma1 = ((bytes[4] << 8) + bytes[5]);
			decoded.data.rawcurrentma2 = ((bytes[6] << 8) + bytes[7]);
			decoded.data.rawcurrentma3 = ((bytes[8] << 8) + bytes[9]);
			decoded.data.currentma1 = decoded.rawcurrentma1 * decoded.multiplier1;
			decoded.data.currentma2 = decoded.rawcurrentma2 * decoded.multiplier1;
			decoded.data.currentma3 = decoded.rawcurrentma3 * decoded.multiplier1;
            decoded.data.reportType = bytes[2];
		} else if ((bytes[1] === 0x4A) && (bytes[2] === 0x02)) { // device type 4A (R718N3) and report type 02
			// full data is split over two separate uplink messages
			decoded.data.battery = bytes[3] / 10;
			decoded.data.multiplier2 = bytes[4];
			decoded.data.multiplier3 = bytes[5];
            decoded.data.reportType = bytes[2];
		} else if ((bytes[1] === 0x1C) && (bytes[2] === 0x01)) { // device type 1C (R718E) and report type 01
			// full data is split over two separate uplink messages
			decoded.data.battery = bytes[3] / 10;
            decoded.data.accelerationx = bytestofloat16((bytes[5] << 8) + bytes[4]);
            decoded.data.accelerationxraw = ((bytes[4] << 8) + bytes[5]);
            decoded.data.accelerationy = bytestofloat16((bytes[7] << 8) + bytes[6]);
            decoded.data.accelerationyraw = ((bytes[6] << 8) + bytes[7]);
            decoded.data.accelerationz = bytestofloat16((bytes[9] << 8) + bytes[8]);
            decoded.data.accelerationzraw = ((bytes[8] << 8) + bytes[9]);
            decoded.data.reportType = bytes[2];
		} else if ((bytes[1] === 0x1C) && (bytes[2] === 0x02)) { // device type 1C (R718E) and report type 02
			// full data is split over two separate uplink messages
            decoded.data.velocityx = bytestofloat16((bytes[4] << 8) + bytes[3]);
            decoded.data.velocityxraw = ((bytes[4] << 8) + bytes[3]);
            decoded.data.velocityy = bytestofloat16((bytes[6] << 8) + bytes[5]);
            decoded.data.velocityyraw = ((bytes[6] << 8) + bytes[5]);
            decoded.data.velocityz = bytestofloat16((bytes[8] << 8) + bytes[7]);
            decoded.data.velocityzraw = ((bytes[8] << 8) + bytes[7])
			decoded.data.temperature = ((bytes[9] << 24 >> 16) + bytes[10]) / 10;
            decoded.data.reportType = bytes[2];
		} else if ((bytes[1] === 0x32) && (bytes[2] === 0x01)) { // device type 32 (R718WA), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.waterleak = bytes[4];
		} else if ((bytes[1] === 0x4D) && (bytes[2] === 0x01)) { // device type 4D (R312A), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.alarm = bytes[4];
		} else if ((bytes[1] === 0x04) && (bytes[2] === 0x01)) { // device type 04 (R311G), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.illuminance = (bytes[4] << 8) | bytes[5];
		} else if ((bytes[1] === 0x1D) && (bytes[2] === 0x01)) { // device type 1D (R718F), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.contact = bytes[4];
		} else if ((bytes[1] === 0x4F) && (bytes[2] === 0x01)) { // device type 4F (R311FA), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.activity = bytes[4];
		} else if ((bytes[1] === 0x12) && (bytes[2] === 0x01)) { // device type 12 (R718WB), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.leak = bytes[4];
		} else if ((bytes[1] === 0x9F) && (bytes[2] === 0x01)) { // device type 9F (R718VA/VB), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.status = bytes[4];
		} else if ((bytes[1] === 0x20) && (bytes[2] === 0x01)) { // device type 20 (R718IA), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.adcrawvalue = (bytes[4] << 8) | bytes[5];
		} else if ((bytes[1] === 0x41) && (bytes[2] === 0x01)) { // device type 41 (R718IA2), report type 01
			decoded.data.battery = bytes[3] / 10;
			decoded.data.adcrawvalue1 = (bytes[4] << 8) | bytes[5];
			decoded.data.adcrawvalue2 = (bytes[6] << 8) | bytes[7];
		} else if ((bytes[1] === 0x05) && (bytes[2] === 0x0A)) { // device type 05 (RA07 series), water level/soil moisture
			decoded.data.battery = bytes[3] / 10;
			if (bytes[4] != 0xFF && bytes[5] != 0xFF) {
				decoded.data.soilvwc = (bytes[4] << 8) | bytes[5];
			}
			if (bytes[6] != 0xFF && bytes[7] != 0xFF) {
				decoded.data.soiltemperature = (bytes[6] << 8) | bytes[7];
			}
			if (bytes[8] != 0xFF && bytes[9] != 0xFF) {
				decoded.data.waterlevel = (bytes[8] << 8) | bytes[9];
			}
			if (bytes[10] != 0xFF) {
				decoded.data.ec = bytes[10];
			}
		} else if ((bytes[1] === 0x05) && (bytes[2] === 0x08)) { // device type 05 (RA07 series), ph sensor
			decoded.data.battery = bytes[3] / 10;
			if (bytes[4] != 0xFF && bytes[5] != 0xFF) {
				decoded.data.ph = ((bytes[4] << 8) | bytes[5])/100;
			}
			if (bytes[6] != 0xFF && bytes[7] != 0xFF) {
				decoded.data.temperature = ((bytes[6] << 8) | bytes[7])/100;
			}
			if (bytes[8] != 0xFF && bytes[9] != 0xFF) {
				decoded.data.orp = (bytes[8] << 8) | bytes[9];
			}
		} else if ((bytes[1] === 0x05) && (bytes[2] === 0x09)) { // device type 05 (RA07 series), turbidity sensor
			decoded.data.battery = bytes[3] / 10;
			if (bytes[4] != 0xFF && bytes[5] != 0xFF) {
				decoded.data.ntu = ((bytes[4] << 8) | bytes[5])/10;
			}
			if (bytes[6] != 0xFF && bytes[7] != 0xFF) {
				decoded.data.temperature = ((bytes[6] << 8) | bytes[7])/100;
			}
			if (bytes[8] != 0xFF && bytes[9] != 0xFF) {
				decoded.data.soilhumidity = ((bytes[8] << 8) | bytes[9])/100;
			}
		} else if ((bytes[1] === 0x5A) && (bytes[2] === 0x01)) { // device type 01 (R311WA/R313WA)
			decoded.data.battery = bytes[3] / 10;
			decoded.data.status1 = bytes[4];
			decoded.data.status2 = bytes[5];
			}
	} else if (fport === 7) { // then its a ConfigureCmd response
		if ((bytes[0] === 0x82) && (bytes[1] === 0x01)) { // R711 or R712
			decoded.data.mintime = ((bytes[2] << 8) + bytes[3]);
			decoded.data.maxtime = ((bytes[4] << 8) + bytes[5]);
			decoded.data.battchange = bytes[6] / 10;
			decoded.data.tempchange = ((bytes[7] << 8) + bytes[8]) / 100;
			decoded.data.humidchange = ((bytes[9] << 8) + bytes[10]) / 100;
		} else if ((bytes[0] === 0x81) && (bytes[1] === 0x01)) { // R711 or R712
			decoded.data.success = bytes[2];
		}
	}
	return decoded;
}

function bcdtonumber(bytes) {
	var num = 0;
	var m = 1;
	var i;
	for (i = 0; i < bytes.length; i++) {
		num += (bytes[bytes.length - 1 - i] & 0x0F) * m;
		num += ((bytes[bytes.length - 1 - i] >> 4) & 0x0F) * m * 10;
		m *= 100;
	}
	return num;
}

function bytestofloat16(bytes) {
    var sign = (bytes & 0x8000) ? -1 : 1;
    var exponent = ((bytes >> 7) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 7));

    if (exponent == 128) 
        return 0.0;

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 6);
    } else significand = (significand | (1 << 7)) / (1 << 7);

    return sign * significand * Math.pow(2, exponent);
}

// Chirpstack decoder wrapper
function decodeUplink(input)  {
	return Decoder(input.bytes, input.fPort);
}

// Direct node.js CLU wrapper (payload bytestring as argument)
try {
    console.log(Decoder(Buffer.from(process.argv[2], 'hex'), 6));
} catch(err) {}
