function decodeUplink(input) {
  var res = Decoder(input.bytes, input.fPort);
  /*
  if (res.error) {
    return {
      errors: [res.error],
    };
  }
  */
  return {
    data: res,
  };
}

//**********************************************************************************
// function Decoder()
// Has TTN (byte, fport) interface  
//**********************************************************************************
function Decoder(bytes, fport) {

  var decoded = {};
  var voltage;
  var apparentPower;
  var activePower;
  var energy;
  var burnHours;
  var lightLevel;
  var lampError;
  var driverError;
  var status; 
  var lampErrorPresent;
  var driverErrorPresent;

  // Basic lengths etc.
  const protocolLength = 1;
  const linkValidationLength = 4; // Report starts at bytes[5]
  const linkValidation = 0x00;
  const report = 0x08;
  const requiredProtocol = 0x02;
  const typeMask = 0b00001111;

  // Data that will always be in a constant position
  // Control Gear
  const controlDataByte = 1 + protocolLength + linkValidationLength; // bytes[] indexed 0 -> n-1
  const cg1Mask = 0b11100000; // Upper 3 bits
  const nema = 0;
  const cg0 = 1;
  const cg1 = 2;
  const cg2 = 3;
  const cg3 = 4;
  const cg4 = 5;
  const cg5 = 6;

  // Month Parity
  const monthParityByte = 2 + protocolLength + linkValidationLength;
  const monthParityMask = 0b10000000;
  
  // Day
  const dayByte = 2 + protocolLength + linkValidationLength;
  const dayMask = 0b01111100;
 
  // Time
  const timeTSB = 2 + protocolLength + linkValidationLength;
  const timeMSB = 3 + protocolLength + linkValidationLength;
  const timeLSB = 4 + protocolLength + linkValidationLength;
  const timeMask = 0b000000111111111110000000;

  // Measurements
  const measMskByte = 4 + protocolLength + linkValidationLength;
  const measMask = 0b01111111; // lower 7 bits
  const measurementLevelMask =         0b00100000;
  const measurementBurnHoursMask =     0b00010000;
  const measurementVoltageMask =       0b00001000;
  const measurementActivePowerMask =   0b00000100;
  const measurementApparentPowerMask = 0b00000010;
  const measurementEnergyMask =        0b00000001;

  // Start doing things here:

  // Check what data we have in the report (not used at the moment)
  var measurements = (bytes[measMskByte] & measMask);  
  var levelPresent = (measurements & measurementLevelMask); // > 0 if present
  var burnHoursPresent = (measurements & measurementBurnHoursMask);
  var voltagePresent = (measurements & measurementVoltageMask);
  var activePowerPresent = (measurements & measurementActivePowerMask);
  var apparentPowerPresent = (measurements & measurementApparentPowerMask);
  var energyPresent = (measurements & measurementEnergyMask);

  // Get time related data (constant for all report types)
  var monthParity = ((bytes[monthParityByte] & monthParityMask) >> 7);
  var day = ((bytes[dayByte] & dayMask) >> 2);
  var time = (((((bytes[timeTSB] << 16) + (bytes[timeLSB] << 8)) + (bytes[timeLSB])) & timeMask) >> 7);

  // Check which device is returning data
  controlGear = (bytes[controlDataByte] & cg1Mask) >> 5;

  // Check we are looking at the right type of data
  // Check for Nema report
  if  ((bytes.length > protocolLength + linkValidationLength) &&
      ((bytes[0] == requiredProtocol) && 
      ((bytes[1] & typeMask) == linkValidation)) && 
      ((bytes[protocolLength + linkValidationLength] & typeMask) == report) &&
      (controlGear == nema)) {
    
      // Voltage
      const voltageMSB = 5 + protocolLength + linkValidationLength;
      const voltageLSB = 6 + protocolLength + linkValidationLength;
      const voltageMask = 0b1111111111110000;

      // Derive voltage
      voltage = (bytes[voltageMSB] << 8);
      voltage += bytes[voltageLSB];
      voltage = (voltage & voltageMask);
      voltage = (voltage >>4) / 10;
      decoded.voltage = voltage;

      // Derive actPower
      const activePowerTSB = 6 + protocolLength + linkValidationLength;
      const activePowerMSB = 7 + protocolLength + linkValidationLength;
      const activePowerLSB = 8 + protocolLength + linkValidationLength;
      const activePowerMask = 0b000000111111111111100000;

      activePower = (bytes[activePowerTSB] << 16);
      activePower += (bytes[activePowerMSB] << 8);
      activePower += (bytes[activePowerLSB]);
      activePower = (activePower & activePowerMask);
      activePower = (activePower >> 5);
      decoded.activePower = activePower;
    
      // Derive appPower
      const apparentPowerMSB = 8 + protocolLength + linkValidationLength;
      const apparentPowerLSB = 9 + protocolLength + linkValidationLength;
      const apparentPowerMask = 0b0001111111111111;
      
      apparentPower += (bytes[apparentPowerMSB] << 8);
      apparentPower = (bytes[apparentPowerLSB]);
      apparentPower = (apparentPower & apparentPowerMask);
      decoded.apparentPower = apparentPower;

      // Derive energy
      const energyPowerMSB = 10 + protocolLength + linkValidationLength;
      const energyPowerLSB = 11 + protocolLength + linkValidationLength;
      //"02 00 E1 0B 01 08 09 15 C2 0F 99 50 05 00 68 00 00"
      energy = (bytes[energyPowerMSB] << 8);
      energy += (bytes[energyPowerLSB]);
      decoded.energy = energy;

      // Derive monthParity
      decoded.monthParity = monthParity;

      // Derive day
      decoded.day = day;

      // Derive time
      decoded.time = time;

      // Derive controlGear (which DALI interface this data relates to)
      decoded.controlGear = controlGear;

      // The following are not included in Nema report, so sending nulls:
      // Derive burHours
      decoded.burnHours = 0;
  
      // Derive lightLevel
      decoded.lightLevel = 0;

      // Derive status
      decoded.lampError = 0;
      decoded.driverError = 0;
      decoded.decoderError = 0;
      return decoded;
  }

  // Check for control gear report
  else if ((bytes.length > protocolLength + linkValidationLength) &&
      ((bytes[0] == requiredProtocol) && 
      ((bytes[1] & typeMask) == linkValidation)) && 
      ((bytes[protocolLength + linkValidationLength] & typeMask) == report) &&
      ((controlGear > nema) && (controlGear <= (cg5 + 1)))) { // Control gear 0-5
      // Decode for full set of data (should check measure mask though)
      
      // Voltage
      const voltageMSB = 8 + protocolLength + linkValidationLength;
      const voltageLSB = 9 + protocolLength + linkValidationLength;
      const voltageMask = 0b1111111111110000;

      // Derive voltage
      voltage = (bytes[voltageMSB] << 8);
      voltage += bytes[voltageLSB];
      voltage = (voltage & voltageMask);
      voltage = (voltage >>4) / 10;
      decoded.voltage = voltage;

      // Derive actPower
      const activePowerTSB = 9 + protocolLength + linkValidationLength;
      const activePowerMSB = 10 + protocolLength + linkValidationLength;
      const activePowerLSB = 11 + protocolLength + linkValidationLength;
      const activePowerMask = 0b000000111111111111100000;
      
      activePower = (bytes[activePowerTSB] << 16);
      activePower += (bytes[activePowerMSB] << 8);
      activePower += (bytes[activePowerLSB]);
      activePower = (activePower & activePowerMask);
      activePower = (activePower >> 5);
      decoded.activePower = activePower;
    
      // Derive appPower
      const apparentPowerMSB = 11 + protocolLength + linkValidationLength;
      const apparentPowerLSB = 12 + protocolLength + linkValidationLength;
      const apparentPowerMask = 0b0001111111111111;
      
      apparentPower += (bytes[apparentPowerMSB] << 8);
      apparentPower = (bytes[apparentPowerLSB]);
      apparentPower = (apparentPower & apparentPowerMask);
      decoded.apparentPower = apparentPower;

      // Derive energy
      const energyPowerMSB = 13 + protocolLength + linkValidationLength;
      const energyPowerLSB = 14 + protocolLength + linkValidationLength;
      //"02 00 E1 0B 01 08 09 15 C2 0F 99 50 05 00 68 00 00"
      energy = (bytes[energyPowerMSB] << 8);
      energy += (bytes[energyPowerLSB]);
      decoded.energy = energy;

      // Derive monthParity
      decoded.monthParity = monthParity;

      // Derive day
      decoded.day = day;

      // Derive time
      decoded.time = time;

      // Derive controlGear (which DALI interface this data relates to)
      decoded.controlGear = controlGear;

      // The following are not included in Nema report, so sending nulls:
      // Derive burHours
      const burnHoursTSB = 6 + protocolLength + linkValidationLength;
      const burnHoursMSB = 7 + protocolLength + linkValidationLength;
      const burnHoursLSB = 8 + protocolLength + linkValidationLength;
      const burnHoursMask = 0b001111111111111111000000;

      burnHours = (bytes[burnHoursTSB] << 16);
      burnHours += (bytes[burnHoursMSB] << 8);
      burnHours += (bytes[burnHoursLSB]);
      burnHours = (burnHours & burnHoursMask);
      burnHours = (burnHours >> 6);
      decoded.burnHours = burnHours;
      
      // Derive lightLevel
      const lightLevelMSB = 5 + protocolLength + linkValidationLength;
      const lightLevelLSB = 5 + protocolLength + linkValidationLength;
      const lightLevelMask = 0b0011111111000000;

      lightLevel = (bytes[lightLevelMSB] << 8);
      lightLevel += bytes[lightLevelLSB];
      lightLevel = (level & lightLevelMask);
      lightLevel = (level >> 6);
      decoded.lightLevel = lightLevel;

      // Derive status
      const statusByte = 5 + protocolLength + linkValidationLength;
      const statusMask =          0b11000000; 
      const lampErrorMask =       0b10000000;
      const driverErrorMask =     0b01000000;
  
      status = (bytes[statusByte] & statusMask);  
      lampErrorPresent = (status & lampErrorMask); // > 0 if present
      driverErrorPresent = (status & driverErrorMask); // > 0 if present
      
      if (lampErrorPresent) {
          decoded.lampError = "true";
      }
      else {
          decoded.lampError = "false";
      }
      if (driverErrorPresent) {
          decoded.driverError = "true";
      }
      else {
          decoded.driverError = "false";
      }
      // Signal good decode
      decoded.decodeError = "No Error";
      return decoded;
  }
  else {
      decoded.activePower = "null";
      decoded.apparentPower  = "null";
      decoded.burnHours = "null";
      decoded.controlGear  = "null";
      decoded.day  = "null";
      decoded.driverError = "null";
      decoded.energy = "null";
      decoded.lampError = "null";
      decoded.driverError = "null";
      decoded.monthParity = "null";
      decoded.time = "null";
      decoded.voltage = "null";
      decoded.decodeError = "Unknown report";
      return decoded;
  }
}