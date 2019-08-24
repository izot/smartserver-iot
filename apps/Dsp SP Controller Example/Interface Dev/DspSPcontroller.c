/*
 * Interface definition using IML to define the Internal Application Example interface.
 * This file is the input to the III.exe application, to produce aN XIF file. You need
 * to place the ApolloDev.* resouce files in a location that matches the location
 * in the IML belowUDPTDspSPcontroller.
 */
//@Izot option target("shortstack-classic")
//@Izot option server("SS430_FT6050_SYS20000kHz")
//@Izot option programId("90:00:01:06:00:03:85:00")

UFPTDspSPcontroller(DspCntl) DspCntl; //@Izot block (location="./P9000010600000000_4") external("SpController") 

