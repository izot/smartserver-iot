/*
 * Interface definition using IML to define the Internal Application Example interface.
 * This file is the input to the III.exe application, to produce aN XIF file. You need
 * to place the ApolloDev.* resouce files in a location that matches the location
 * in the IML below.
 */
//@Izot option target("xif")
//@Izot option programId("90:00:01:23:00:43:85:11")
//@IzoT option dynamic(blocks=0, datapoints=0) 
//@IzoT option addresses(15)
//@IzoT option aliases(15)
SFPTopenLoopActuator(bcastSw,SNVT_switch) bcastSw; //@Izot Block external("swBroadcaster"), implement(nciDefault)  

