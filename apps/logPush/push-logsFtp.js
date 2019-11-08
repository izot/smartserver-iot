
const fs = require('fs'); 
const ftpClient = require('ftp');  // npm ftp module
// This environment line must exist in the supwervisorctl conf file so the default.json file
// and be pulled in 
// environment=NODE_CONFIG_DIR="/home/apollo/apps/push-logs/config" 
const config = require('config');

// Read application configuration from config/default.json
const hostAddr = config.get('App.host-address');
const ftpPort = config.get('App.ftpPort');
const fptUser = config.get('App.fptUser');
const ftpPwd = config.get('App.ftpPwd');
const destFolder = config.get('App.destFolder')
const retain = config.get('App.retain');
const compress = config.get('App.compress');  // Note Compression not supported by default in all FTP servers. 

var toTransfer = new Set();
const cFtp = new ftpClient();
let sendPending = false;
const appVersion= '1.00.003';

let filesSent = 0;
let fileErrors = 0;

// Determine available FS assets.  Using SD card on SmartServer if available
// All appearing in the transferDir are pushed to the configured FTP server.
// Code was tested on filezilla and IIS FTP servers
const transferDir = process.env.hasOwnProperty('APOLLO_DATA') ? '/media/sdcard/transfer' : './transfer';

let nowTs = new Date();
console.log(`${nowTs.toLocaleString()} - Startup push-logsFtp app Version: ${appVersion}`);

// https://github.com/mscdex/node-ftp/issues/126 : read ERRCONNREST errors are being supressed.  Succecssful transfers
// to filezilla, and IIS FTP server occur despite this error.
function processTransferDir () {
    let nowTs = new Date();
    fs.readdir(transferDir,(err,files) => {
        if (err) {
            console.error(`${nowTs.toLocaleString()} readdir  failed - ${err}`);
            } else {
                if (files.length == 0)
                    return;
                console.log(`${nowTs.toLocaleString()} - Files staged: ${files.length}, Total Files sent: ${filesSent}, Total Errors: ${fileErrors}`);
                files.forEach ((fname) => {
                    toTransfer.add(fname)
                    sendPending = true;
                });
                if (sendPending && cFtp.connected === false) {
                    cFtp.connect({host: hostAddr, port: ftpPort, user: fptUser, password: ftpPwd, keepalive: 2000});
                };
            };
    });
}
// On startup, look for files in the transfer folder, and if not empty, queue up the work
processTransferDir();

function sendFile (fname) {
    let nowTs = new Date();
    cFtp.put(`${transferDir}/${fname}`,fname, compress, function(err) {
        if (err && (err.message !== "read ECONNRESET")) {
            ++fileErrors;
            console.error(`${nowTs.toLocaleString()} put ${fname} failed - ${err}`);
            return false;
        } else {
            ++filesSent;
            toTransfer.delete(fname);
            if (!retain) {
                fs.unlink (`${transferDir}/${fname}`, (err) => {
                    if (err)
                        console.error (`${nowTs.toLocaleString()} delete ${fname} failed - ${err}`)
                });
            };
            if (toTransfer.size == 0) {
                sendPending = false;
                cFtp.end();
                //console.log ('disonnected from FTP server');
            }
            return true;
        };          
    });
}
// This will fire when a file for transfer is moved to the transferDir
fs.watchFile(transferDir,  (curr, prev) => {
    // When a file is removed from the transfer folder, we want to not 
    // process it while other files for sending may be in the queue
    if (!sendPending)
        processTransferDir();
    //console.log(`Files to send. The current mtime is : ${curr.mtime}`);
});


cFtp.on ('end', () =>  {
    let nowTs = new Date();
    console.log(`${nowTs.toLocaleString()} - File transfered: ${filesSent}. File send errors: ${fileErrors}`);
    console.log (`${nowTs} - FTP end.`);  
});

cFtp.on('ready', () => {
    let nowTs = new Date();
    //console.log (`${nowTs} - FTP Ready.`);  
    let sendOk = true;
    if (sendPending) {
        for (let fname of toTransfer) {
            //console.lcFtpStateog(`Staged: ${fname}`);
            sendOk = sendFile(fname);
            if(sendOk !== undefined && !sendOk)
                break ;   
        };
    };
});

cFtp.on ('error', (err) => {
    if (err && (err.message !== "read ECONNRESET")) {
        var nowTs = new Date(); // Seconds TS good enough
        console.log(`${nowTs.toLocaleString()} - FTP Error event: ${err}`);
        sendPending = false;
        cFtp.end();
    }
});