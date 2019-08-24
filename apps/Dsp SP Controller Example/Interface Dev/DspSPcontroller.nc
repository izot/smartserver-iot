// NC Model file for SmartServer IoT Internal Applicaiton example - DuctStatic Setpoint Controller
// UFPTDspSPcontroller (20004) in ApolloDev.typ 1.06 or higher
// Author: RTG
// Date: 07/24/2019
// Use with 

network input 	SNVT_str_asc 			nviAddRouge;
network input 	SNVT_str_asc 			nviRemoveRouge;
network input 	SNVT_count 			  nviShowRouge;
network output	SNVT_count				nvoRougeCount;
network output  UNVTdevHandle			nvoRougeReport;
network input 	SNVT_switch				nviEnable;
network output 	SNVT_lev_percent	nvoAvgDemand; 
network output 	SNVT_lev_percent	nvoMinDemand; 
network	output 	SNVT_lev_percent	nvoMaxDemand; 
network output  SNVT_press_p			nvoDspSP; 

network input SCPTductStaticPressureSetpoint 	cp cpDefaultDspSP;
network input SCPTdelayTime 									cp cpDelay;
network input SCPTmeasurementInterval 				cp cpLoopInterval;
network input SCPTmaxDuctStaticPressureSetpoint 				cp cpMaxDspSP;
network input SCPTminDuctStaticPressureSetpoint 				cp cpMinDspSP;

fblock UFPTDspSPcontroller {
	nviAddRouge 			implements 	nviAddRouge;
	nviRemoveRouge 		implements	nviRemoveRouge;
	nviShowRouge			implements	nviShowRouge;
	nvoRougeCount			implements	nvoRougeCount;
	nvoRougeReport		implements	nvoRougeReport;
	nviEnable					implements	nviEnable;
	nvoAvgDemand			implements	nvoAvgDemand;
	nvoMinDemand 			implements	nvoMinDemand;
	nvoMaxDemand 			implements	nvoMaxDemand;
	nvoDspSP 					implements	nvoDspSP;
} UFPTDspSPcontroller
	external_name ("DspSPcontroller")
	fb_properties {
		cpDefaultDspSP = 498,  	/* 2 inches H2O = 498 pascals */
		cpDelay = 1200,			 		/* 120s											 */
		cpLoopInterval = 150,  	/* 15s												 */
		cpMaxDspSP = 747,      	/* 3 inches H20 = 747 pascals */
		cpMinDspSP = 249,				/* 1 inch H20 249 pascals 		*/
	};


