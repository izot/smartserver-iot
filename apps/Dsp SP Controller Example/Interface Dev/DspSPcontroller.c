/*
 * Interface definition using IML to define the Internal Application Example interface.
 * This file is the input to the iii.exe application, to produce aN XIF file. You need
 * to place the ApolloDev.* resouce files in a location that matches the location
 * in the IML belowUDPTDspSPcontroller. 
 * *** Note iii.exe 1.30.009 or higher is required ***
 */
//@Izot option target("xif")
//@Izot option programId("90:00:01:06:00:03:85:00")
//@IzoT option dynamic(blocks=0, datapoints=0) 
//@IzoT option addresses(15)
//@IzoT option aliases(15)

UFPTDspSPcontroller(DspCntl) DspCntl; //@Izot block (location="./P9000010600000000_4") external("SpController") 

