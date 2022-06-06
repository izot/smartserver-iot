**SmartServer IoT Node-RED Web Connection Flow  (1.00)**

Some application require pushing data from one SmartServer to multiple SmartServers. This can be accomplished using a Web Connection created by Node-RED flows (see the CMS Sequence Wizard).

This Web Connection (Web Conn) example demostrates how a datapoint on an external device on a source SmartServer can be propagated to external devices on one or more destination SmartServer using the REST API with HTTPS.

Two Node-RED flows are provided: Web Conn Source Flow Tab is used on the SmartServer pushing the data, and Web Conn Destination Flow Tab which is used on all the SmartServers receiving the data.

After you import the flow tabs onto the SmartServers you will need to modify each flow tab for your specific datapoints, and application.  If you have more than one destination then it is recommended that you setup one destination SmartServer first and then export that flow, import this exported flow on all the destination SmartServer and modify the flow as needed. The flows come up in about 7 mintues after power up or reboot, and have a recovery time of 5 mintues for loss of communication after 3 attempts.

Use the documentation and included flows in the attached zip file to better understand and how to configure Node-RED for this applicaiton. Import the Web Conn Source Flow Tab into the Source Sequence Widget and Import the Web Conn Destination Flow Tab into one of the destination SmartServers. 


