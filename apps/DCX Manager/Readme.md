# DCX Manager Service
This application supports power line outdoor lighting systems where the streetlight segment power is switched off during the day.  It handles sequencing of DCI functions that monitor the connectivity of devices so the state is not changed while the power is off.

Release 1.05 created on 07/25/2023 has a key feature addition to force devices to the UP state when segement power is switched ON.
Releae 1.06 - fixed startup initialization issues.
Release 1.01.001 - Logging specific to 4.0x service architecture. Capturing provission, and connection requests.

1. `DCX Manager Service Integration Guide.pdf` - Instructions on how to install and use the DCX Manager service.
2. `src` - This folder contains the source code for the DCX Manager and Group controller used in this solution.
3. `deploy` - This folder contains the file DCX_deploy.zip which is used to setup the DCX Manager and group controller services. 
4. `DCX_connections.con` - An example CMS connection file to support solution integration.  You may need to edit be for importing into the CMS. 

