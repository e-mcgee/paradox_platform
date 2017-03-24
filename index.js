var net = require('net');
var sleep = require('system-sleep');
var loggedin = false;
var alarmstatus = 'Unknown';
var receivebuffer = Buffer.alloc(1024,0x00);
var zonestatus = Buffer.alloc(32,0x00);
var gettingstatus = false;
var controlAlarmstate = false;
var controlPGMstate = false;
var loginresult = 0;


"use strict";

var Characteristic, Service;

// Mute flag to allow sending commands to Paradox.  This flag mutes the Zone and Alarm status polling.
var muteStatus = false;

// Global Zones status array
var zones = new Array();
var alarm_ip_address = "192.168.1.0";
var alarm_port = 10000;
var alarm_password = "password";

// Initialise zones
// Each Zone stores :
//   status : either on or off
//   accessory : store the accessory so that it can be accessed when a change occurs
//   Type : either GarageDoorOpener, MotionSensor, or ContactSensor
for (i=0; i<32; i++) {
   zones.push({ status: "off", accessory: null, type: null});
}

// Global alarmstate
//   status: is either Armed Away, Armed Perimeter, Armed Sleep, or Disarmed
//   accessory : store the accessory so that it can be accessed when a change occurs
var alarmstate = {
    status: "Disarmed",
    accessory: null
}


function _parsestatus() {

    if (receivebuffer[16] == 0x52) {
        if (receivebuffer[19] == 0x01) {
                // Alarm status
                if (receivebuffer[33] > 0x10) {
                        alarmstatus = "In Alarm";
                }
                else {
                        switch(receivebuffer[33]) {
                                case 0x00:
                                   alarmstatus = "Disarmed";
                                   break;
                                case 0x01:
                                   alarmstatus = "Armed Away";
                                   break;
                                case 0x02:
                                   alarmstatus = "Armed Sleep";
                                   break;
                                case 0x03:
                                   alarmstatus = "Armed Sleep";                           
                                   break;
                                case 0x06: 
                                   alarmstatus = "Armed Sleep";
                                   break;
                                case 0x04:
                                   alarmstatus = "Armed Perimeter";                           
                                   break;
                                case 0x05:
                                   alarmstatus = "Armed Perimeter";
                                   break;
                                case 0x08:
                                   alarmstatus = "Instant Armed";                            
                                   break;
                                case 0x09:
                                   alarmstatus = "Instant Armed";
                                   break;
                                default:
                                   alarmstatus = "Unknown";
                        } 
                }
        }
        if (receivebuffer[19] == 0x00) {
                // Zone status
                for (i=0;i<4;i++) {
                        for (j=0;j<8;j++) {
                                if (receivebuffer[i+35] & 0x01<<j) {
                                        zonestatus[j+i*8] = 1;
                                }
                                else {
                                        zonestatus[j+i*8] = 0;
                                }
                        }
                }
        }
    }
}


function format37ByteMessage(message) {

    var checksum = 0;
    if (message.length % 37 !=0) {
            for (i=0;i<message.length;i++)
                    checksum += message.charCodeAt(i);
            while (checksum > 255) 
                    checksum = checksum - (checksum/256)*256;
            buf2 = Buffer.from([checksum]);
            buf1 = Buffer.from(message);
            buf3 = Buffer.concat([buf1, buf2], buf1.length+buf2.length);
            buf4 = Buffer.alloc((Math.round(buf3.length/16)+1)*16,0xEE);
            buf3.copy(buf4);
            message = buf4.toString('hex');
    }
    return message;
}


function _login(password, cl, acc) {
    
    var byte1 = Buffer.from([0xAA,0x08,0x00,0x03,0x08,0xF0,0x00,0x0A,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
    var byte2 = Buffer.from(password);
    var byte3 = Buffer.from([0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);

    var totalLength = byte1.length + byte2.length + byte3.length;
    var buf = Buffer.concat([byte1, byte2, byte3], totalLength);

    loginresult = 1;
    acc.log('Logging in');

    cl.write(buf);
    sleep(600);
    if (receivebuffer[4] == 0x38) {
        acc.log('Log in successfull');
        buf = Buffer.from([0xAA,0x08,0x00,0x03,0x08,0xF0,0x00,0x0A,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
        buf[1] = 0x00;
        buf[5] = 0xF2;
        cl.write(buf);
        sleep(250);

        buf[5] = 0xF3;
        cl.write(buf);
        sleep(250);

        buf[1] = 0x25;
        buf[3] = 0x04;
        buf[5] = 0x00;
        var message = '\x72\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message = format37ByteMessage(message);
        buf2 = Buffer.from(message,'hex');
        totalLength = buf.length + buf2.length;
        var buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);

        buf[1] = 0x26;
        buf[3] = 0x03;
        buf[5] = 0xF8;
        message = '\x50\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message = format37ByteMessage(message);
        buf2 = Buffer.from(message,'hex');
        buf2[2] = 0x80;     // Weird bug that adds c2 whenever there is 0x80 in string so fix it manually
        totalLength = buf.length + buf2.length;
        buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);

        buf[1] = 0x25;
        buf[3] = 0x04;
        buf[5] = 0x00;
        message = '\x5f\x20\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message = format37ByteMessage(message);
        buf2 = Buffer.from(message,'hex');
        totalLength = buf.length + buf2.length;
        buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);

        buf[7] = 0x14;
        buftemp = Buffer.alloc(23, 0x00);
        receivebuffer.copy(buftemp,0,16,26);
        receivebuffer.copy(buftemp,10,24,26);
        receivebuffer.copy(buftemp,15,31,39);
        buftemp[12] = 0x19;
        buftemp[13] = 0x00;
        buftemp[14] = 0x00;
        buf2 = Buffer.from([0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x02,0x00,0x00]);
        totalLength = buftemp.length + buf2.length;
        buf3 = Buffer.concat([buftemp, buf2], totalLength);
        var checksum = 0;
        for (i=0;i<buf3.length;i++) {
                checksum += buf3[i];
            }
        while (checksum > 255) { 
                checksum = checksum - Math.trunc(checksum/256)*256;
            }
        buf4 = Buffer.from([checksum]);
        buf5 = Buffer.concat([buf3, buf4], buf3.length+buf4.length);
        buf6 = Buffer.alloc((Math.round(buf5.length/16)+1)*16,0xEE);
        buf5.copy(buf6);
        totalLength = buf.length + buf6.length;
        buf7 = Buffer.concat([buf, buf6], totalLength);        
        cl.write(buf7);
        sleep(250);

        buf[1] = 0x25;
        buf[3] = 0x04;
        buf[5] = 0x00;
        buf[7] = 0x14;
        message = '\x50\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message = format37ByteMessage(message);
        buf2 = Buffer.from(message,'hex');
        totalLength = buf.length + buf2.length;
        buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);

        buf[1] = 0x25;
        buf[3] = 0x04;
        buf[5] = 0x00;
        buf[7] = 0x14;
        message = '\x50\x00\x0e\x52\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message = format37ByteMessage(message);
        buf2 = Buffer.from(message,'hex');
        totalLength = buf.length + buf2.length;
        buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);
        loggedin = true;
    }
    else {
        acc.log('Error logging in');
        cl.end();
        loggedin = false;
    }    
}


function _getalarmstatus(cl,acc) {
    if (loggedin) {

        acc.log('Geting Status...');
        loginresult = 0;        
        buf = Buffer.from([0xAA,0x25,0x00,0x04,0x08,0x00,0x00,0x14,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0x50,0x00,0x80,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xd0,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
        cl.write(buf);
        sleep(250);
        buf = Buffer.from([0xAA,0x25,0x00,0x04,0x08,0x00,0x00,0x14,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0x50,0x00,0x80,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xd1,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
        cl.write(buf);
        sleep(250);
        acc.log(alarmstatus);
    }
    else {
        acc.log('Cannot get status - not logged in');
    }
}


function getAlarmStatus(acc) {

    if (controlPGMstate || controlAlarmstate ) {
        acc.log('Busy with alarm now - not getting status');
        return;
    }
    
    gettingstatus = true;

    var client = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
                acc.log('Getting Status - Connected to alarm!');
    });

    client.on('end', () => {
       acc.log('Finished Getting Status - Disconnected from  alarm');
       loggedin = false;
    });

    client.on('timeout', () => {
       acc.log('No response from alarm - Disconnected from alarm');
       loggedin = false;
       client.end();
    });

    client.on('error', () => {
       acc.log('Error communicating with alarm - Disconnected from alarm');
       loggedin = false;
       client.end();
    });

    client.on('data', (data) => {
        if (data.length < 1024) {
            receivebuffer = Buffer.from(data);
        }
		_parsestatus();
    });

    sleep(500);
    _login(alarm_password,client,acc);
    _getalarmstatus(client,acc);
    client.end();
    gettingstatus = false;
}


function controlAlarm (state, partition, acc, cl) {
            
    if (loggedin) {
        var message1 = '';

        acc.log('Controlling Alarm State...');
        buf = Buffer.from([0xAA,0x25,0x00,0x04,0x08,0x00,0x00,0x14,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
        if (partition == 0) {
            switch (state) {
                case "ARM" :
                    message1 = '\x40\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "DISARM" :
                    message1 = '\x40\x00\x05\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "SLEEP" :
                    message1 = '\x40\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "STAY" :
                    message1 = '\x40\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
            }            
        }
        if (partition == 1) {
            switch (state) {
                case "ARM" :
                    message1 = '\x40\x00\x04\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "DISARM" :
                    message1 = '\x40\x00\x05\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "SLEEP" :
                    message1 = '\x40\x00\x03\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
                case "STAY" :
                    message1 = '\x40\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
                    break;
            }            
        }
        message1 = format37ByteMessage(message1);
        var buf2 = Buffer.from(message1,'hex');
        var totalLength = buf.length + buf2.length;
        var buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);
    }
    else {
        acc.log('Cannot set Alarm - not logged in');
    }
}


function getHex(dec) {
    var hexArray = new Array( "\x00", "\x01", "\x02", "\x03", 
                              "\x04", "\x05", "\x06", "\x07",
                              "\x08", "\x09", "\x0a", "\x0b", 
                              "\x0c", "\x0d", "\x0e", "\x0f" );

    var code1 = Math.floor(dec / 16);
    var code2 = dec - code1 * 16;

    var decToHex = hexArray[code2];

    return (decToHex);
} 


function controlPGM (state, pgm, acc, cl) {
           
    if (loggedin) {
        var message1 = '';

        acc.log('Controlling PGM State...');
        
        buf = Buffer.from([0xAA,0x25,0x00,0x04,0x08,0x00,0x00,0x14,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE,0xEE]);
        if (state == "ON") {
            message1 = '\x40\x00\x30';
        }
        else if (state == "OFF") {
            message1 = '\x40\x00\x31';
        }
        else {
        	acc.log('Invalid PGM state - ignoring.');
        	return;
        }
        msg = getHex(pgm);
        acc.log(msg);
        message2 = message1.concat(msg);
        str2 = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
        message3 = message2.concat(str2);
        message4 = format37ByteMessage(message3);
        var buf2 = Buffer.from(message4,'hex');
        acc.log(buf2);
        var totalLength = buf.length + buf2.length;
        var buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
        sleep(250);
    }
    else {
        acc.log('Cannot set PGM - not logged in');
    }    
}


//
// Convert status to Homebridge values
function GetHomebridgeStatus(msg) {

    var status= 10;
    switch (msg) {
        case "Armed Perimeter":
                status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
                break;
        case "Armed Sleep":
                status = Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
                break;
        case "Armed Away":
                status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                break;
        case "Disarmed":
                status = Characteristic.SecuritySystemCurrentState.DISARMED;
                break;
        case "In Alarm":
                status = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
                break;						
    };	
    return status;
}


module.exports = function(homebridge) {
  Characteristic = homebridge.hap.Characteristic;
  Service = homebridge.hap.Service;

  homebridge.registerPlatform("homebridge-paradox", "Paradox", paradoxPlatform);
};


function paradoxPlatform(log, config) {

    var self = this;

    this.log = log;
    this.config = config;

    alarm_ip_address = this.config.ip;
    alarm_port = this.config.port;
    alarm_password = this.config.password;

    setInterval(function () {
        alarmstate.accessory.log('Mute : [%s]', muteStatus);
        if (!muteStatus) {
            getAlarmStatus(self);
            var state;

            alarmstate.accessory.log('Got status');
            alarmstate.accessory.log('Results:');
            for (i = 0; i < 32; i++) {
                var st;
                if (zonestatus[i] == 0) {
                    st='off';
                }
                else if (zonestatus[i] == 1) {
                    st='on';
                }
                if ( zonestatus[i] == 1 || zonestatus[i] == 0 ) {
                    if (zones[i].accessory != null && zones[i].status != st) {
                        alarmstate.accessory.log('Accessory was :'+zones[i].status);
                        alarmstate.accessory.log('New atate is :'+st);
                        alarmstate.accessory.log(zonestatus[i]);
                        switch(zones[i].type) {
                            case 'Garage Door':
                                if (st=='off') {
                                    state = Characteristic.TargetDoorState.CLOSED;
                                }
                                else {
                                    state = Characteristic.TargetDoorState.OPEN;
                                }
                                if (zones[i].accessory.garagedooropenerService.readstate != state) {
                                        zones[i].accessory.garagedooropenerService.readstate = state;
                                        zones[i].accessory.garagedooropenerService.getCharacteristic(Characteristic.CurrentDoorState).setValue(state);								
                                        zones[i].accessory.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(state);								
                                }
                                break;
                            case 'Alarm': 
                                break;
                            case 'Contact Sensor':
                                if (st=='off') {
                                    state =Characteristic.ContactSensorState.CONTACT_DETECTED;
                                }
                                else {
                                    state = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                                }
                                zones[i].accessory.contactsensorService.getCharacteristic(Characteristic.ContactSensorState).setValue(state);
                                break;
                            case 'Motion Sensor':
                                if (st=='off') {
                                    state = false;
                                }
                                else {
                                    state = true;
                                }
                                zones[i].accessory.motionsensorService.getCharacteristic(Characteristic.MotionDetected).setValue(state);
                                break;
                            default:
                                alarmstate.accessory.log('Not Supported: %s [%s]', accessoryName, accConfig.type);
                        }							
                    }
                    zones[i].status = st;
                    if (zones[i].accessory != null) {
                        zones[i].accessory.log('Zone ' + i.toString() + ' ' + zones[i].status + ' (' + zones[i].accessory.name + ')');
                    }
                }
            }

            if (alarmstate.status != alarmstatus) {
                if (alarmstatus == 'In Alarm' || alarmstatus == 'Armed Perimeter' || alarmstatus == 'Armed Sleep' || alarmstatus == 'Armed Away' ||  alarmstatus == 'Disarmed') {
                    alarmstate.status = alarmstatus;
                    var stat = GetHomebridgeStatus(alarmstatus);
                    alarmstate.accessory.securitysystemService.setCharacteristic(Characteristic.SecuritySystemCurrentState, stat);
                    alarmstate.accessory.securitysystemService.setCharacteristic(Characteristic.SecuritySystemTargetState, stat);
                }
            }
            alarmstate.accessory.log('Alarmstatus :' + alarmstate.status);
        }
        else {
                alarmstate.accessory.log('Busy with alarm - not getting status now.');
        }
    }, 10000);
}


paradoxPlatform.prototype.accessories = function(callback) {

    var self = this;

    var acc = [];

    if (this.config.accessories) {
        var accessories = this.config.accessories;
        this.log('Looking for accessories in config file');
        accessories.forEach(function(accessoryConfig) {
            var accessoryName = accessoryConfig.name;
            self.log('Accessory');
            self.log(accessoryName);
            var accConfig = accessoryConfig.config;

            if (!accessoryName || !accessoryConfig) {
                self.log('Missing parameters.');
                return;
            }

            self.log('Found: %s [%s]', accessoryName, accConfig.type);

            var a = new ParadoxAccessory(self.log, accConfig, accessoryName);

            if (accConfig.type == 'Garage Door' || accConfig.type == 'Contact Sensor' ||  accConfig.type == 'Motion Sensor') {
                zones[accConfig.zone].accessory = a;
                zones[accConfig.zone].type = accConfig.type;
            }
            if (accConfig.type == 'Alarm') {
                alarmstate.accessory = a;
            }
            acc.push(a);
        });
    }
    else {
            this.log('No config for platform');
    }	
    callback(acc);
}


function ParadoxAccessory(log, config, name) {
	
    this.log = log;
    this.config = config;
    this.name = name;

    this.reachability = true;	
}


ParadoxAccessory.prototype.identify = function (callback) {

  this.log('[' + this.name + '] Identify requested!');
  callback(null); // success
}


ParadoxAccessory.prototype.getServices = function () {

    this.informationService = new Service.AccessoryInformation();

    this.informationService
	.setCharacteristic(Characteristic.Manufacturer, 'Paradox')
	.setCharacteristic(Characteristic.SerialNumber, 'Platform')
	.setCharacteristic(Characteristic.FirmwareRevision, 'v1.0');

    switch(this.config.type) {
        case 'Alarm':
            this.securitysystemService = new Service.SecuritySystem(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Alarm');
            this.securitysystemService
                    .getCharacteristic(Characteristic.SecuritySystemCurrentState)
                             .on('get', this.getAlarmState.bind(this));
            this.securitysystemService
                    .getCharacteristic(Characteristic.SecuritySystemTargetState)
                            .on('set', this.setAlarmState.bind(this));
            return [this.informationService, this.securitysystemService];
            break;
        case 'Garage Door':
            this.garagedooropenerService = new Service.GarageDoorOpener(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Garage Door');
            this.garagedooropenerService
                    .getCharacteristic(Characteristic.CurrentDoorState)
                            .on('get', this.getDoorState.bind(this));
            this.garagedooropenerService
                    .getCharacteristic(Characteristic.TargetDoorState)
                            .on('set', this.setDoorState.bind(this));
            this.garagedooropenerService
                    .getCharacteristic(Characteristic.ObstructionDetected)
                            .on('get', this.getObstructed.bind(this));
            return [this.informationService, this.garagedooropenerService];
            break;
        case 'Contact Sensor':
            this.contactsensorService = new Service.ContactSensor(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Contact Sensor');
            return [this.informationService, this.contactsensorService];
            break;
        case 'Motion Sensor':
            this.motionsensorService = new Service.MotionSensor(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Motion Sensor');
            return [this.informationService, this.motionsensorService];
            break;
    }
}


//
//
// Garage Door Opener handler functions

ParadoxAccessory.prototype.getDoorState = function(callback) {
    var msg = null;
    var state = 10;
    var self = this;
    var acc = this.garagedooropenerService;
    var config = this.config;

    if (zones[config.zone].status=='off') {
        acc.readstate = Characteristic.TargetDoorState.CLOSED;
    }
    else {
        acc.readstate = Characteristic.TargetDoorState.OPEN;
    }

    this.reachability = true;

    callback(null,acc.readstate);
}


ParadoxAccessory.prototype.setDoorState = function(state, callback) {

    var acc = this.garagedooropenerService;
    var config = this.config;
    var self = this;

    controlPGMstate = true;
    muteStatus = true;

    this.log('Setting state:');
    this.log(state);
    this.log('acc.readstate:');
    this.log(acc.readstate);
    this.log('PGM:');
    this.log(config.pgm);

    var options = {
        mode: 'text',
        encoding: 'utf8',
        args: [config.pgm]
    };

    if (acc.readstate != state) {

        var tries = 3;

        loggedin = false;

        while (tries>0 && !loggedin) {
            var client = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
                    self.log('Connected to Alarm!');
            });

            client.on('end', () => {
               self.log('Disconnected from  Alarm');
               loggedin = false;
            });

            client.on('timeout', () => {
               acc.log('No response from alarm - Disconnected from alarm');
               loggedin = false;
               client.end();
            });

            client.on('error', () => {
               acc.log('Error communicating with alarm - Disconnected from alarm');
               loggedin = false;
               client.end();
            });

            client.on('data', (data) => {
                if (data.length < 1024) {
                    receivebuffer = Buffer.from(data);
                }
				_parsestatus();
            });

            sleep(500);

            _login(alarm_password,client, self);
            tries =- 1;
        }
        
        controlPGM("ON", config.pgm, self, client);
        controlPGM("OFF", config.pgm, self, client);

        client.end();
    }

    self.garagedooropenerService.readstate = state;		
    self.garagedooropenerService.setCharacteristic(Characteristic.CurrentDoorState, state);
    
    controlPGMstate = false;
    muteStatus = false;
    
    this.reachability = true;
    callback(null, state);
}


ParadoxAccessory.prototype.getObstructed = function(callback) {

    this.log('Not Obstructed');
    callback();
}


//
//
// Security System(Alarm) handler functions
//
ParadoxAccessory.prototype.getAlarmState = function(callback) {

    var acc = this.securitysystemService;
    var state;
    var self = this;
    var err = null;

    state = GetHomebridgeStatus(alarmstate.status);
    if (state == 10) {
       self.log('Alarmstate unknown');
       err='Error';
    }
    self.log('Alarmstate:');
    self.log(state);
// 	this.securitysystemService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
    this.reachability = true;

    callback(err, state);
}


ParadoxAccessory.prototype.setAlarmState = function(state, callback) {

    var targetstate = 10;
    var acc = this.securitysystemService;
    targetstate = state;
    var self = this;

    if (targetstate == Characteristic.SecuritySystemTargetState.STAY_ARM ||  targetstate == Characteristic.SecuritySystemTargetState.NIGHT_ARM || targetstate == Characteristic.SecuritySystemTargetState.AWAY_ARM || targetstate == Characteristic.SecuritySystemTargetState.DISARM) {

        self.log('Setting alarm state to %s', targetstate);

        // Need to suspend status update timer while changing alarm state and then
        // reinstate the timer afterwards to avoid contention on alarm while setting state
        muteStatus = true;

        controlAlarmstate = true;

        var tries = 3;
        
        loggedin = false;

        while (tries>0 && !loggedin) {

            var client = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
                    self.log('Controlling Alarm - Connected to Alarm!');
            });

            client.on('end', () => {
               self.log('Controlling Alarm - Disconnected from  Alarm');
               loggedin = false;
            });

            client.on('timeout', () => {
               acc.log('No response from alarm - Disconnected from alarm');
               loggedin = false;
               client.end();
            });

            client.on('error', () => {
               acc.log('Error communicating with alarm - Disconnected from alarm');
               loggedin = false;
               client.end();
            });

            client.on('data', (data) => {
                if (data.length < 1024) {
                    receivebuffer = Buffer.from(data);
                }
                _parsestatus();
            });

            sleep(500);

            _login(alarm_password,client, self);
            tries -= 1;
        }

        _getalarmstatus(client, self);
        
        sleep(500);
        //
        // Based on target state call control alarm function with corresponding state
        //
        if (GetHomebridgeStatus(alarmstatus) != targetstate) {
            switch (targetstate) {
                case Characteristic.SecuritySystemTargetState.STAY_ARM:
                    controlAlarm("STAY", 0, self, client);
                    break;				
                case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                    controlAlarm("SLEEP", 0, self, client);
                    break;				
                case Characteristic.SecuritySystemTargetState.AWAY_ARM :
                    controlAlarm("ARM", 0, self, client);
                    break;				
                case Characteristic.SecuritySystemTargetState.DISARM:
                    controlAlarm("DISARM", 0, self, client);
                    break;
                default :
                    self.log('Unknown state');
            };
            self.securitysystemService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
        }
        
        client.end();
        controlAlarmstate = false;
        muteStatus = false;
        this.reachability = true;

        callback(null, state);
    }
    else {
        self.log('Alarm status error - ignoring');
    }
}