/*
 * Interface definition using IML to define the Internal Application LoRa Gateway Example interface.
 * This file is the input to the iii.exe application, to produce aN XIF file. You need
 * to place the ApolloDev.* resouce files in a location that matches the location
 * in the IML below for the . 
 * *** Note iii.exe 1.30.009 or higher is required ***
 */
//@Izot option target("xif")
//@Izot option programId("90:00:01:0A:0A:04:85:00")
//@IzoT option dynamic(blocks=0, datapoints=0) 
//@IzoT option addresses(15)
//@IzoT option aliases(15)

UFPTLoRaGateway(lora_gw) lora_gw; //@Izot block (location="./P9000010000000000_3") external("LoRaGateway") 

