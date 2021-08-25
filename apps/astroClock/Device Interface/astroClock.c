/*
 * Interface definition using IML to define the Internal Application Example interface.
 * This file is the input to the III.exe application, to produce aN XIF file. You need
 * to place the ApolloDev.* resouce files in a location that matches the location
 * in the IML below.
 */
//@Izot option target("xif")
//@Izot option programId("90:00:01:06:00:0A:85:11")
//@IzoT option dynamic(blocks=0, datapoints=0) 
//@IzoT option addresses(32)
//@IzoT option aliases(32)
//SFPTnodeObject(node) nodeObject; //IzoT block external("nodeObject")
UFPTastroClock(astroClk) astroClock; //@Izot block (location="./P9000010600000000_4") external("astroClock") 

