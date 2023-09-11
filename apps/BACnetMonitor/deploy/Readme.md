# bacnetmonitor Service
It was discovered on SmartServer IoT release 3.65, that reboot can result in the failure of the BACnet routing to BAClon devices on the FT-10 channel.  Restarting the echbacnet service is needed to restore this routing function.  The bacnetmonitor service was created to coordinate a restart of the bacnet engine 3 minutes after reboot.  It optionally will schedule a daily restart at a configured hour as an extra assurance.
## Installation Instructions
1. Establish an SSH console session.
2. Type: sudo mkdir -p /media/sdcard/apps/bacnetmonitor
3. Type: sudo chown -R apollo:apollo /media/sdcard/apps
4. Use SCP to copy the file bacnetmonitor_deploy.zip to the directory created in step 2.
5. Type: cd /media/sdcard/apps/bacnetmonitor 
6. Type: unzip -o bacnetmonitor_deploy.zip
7. Type: sudo chmod +x setup.sh
8. Type: sudo ./setup.sh
9. When prompted, optionally enter the hour at which you want to perform a daily restart of the echbacnet service.
