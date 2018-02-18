// Requires
var net = require('net');
var mqtt = require('mqtt');

// Global variables
var loggedin = false;                           // indcates if logged in successful
var client;
var mqttclient;
var mqttenabled = false;

//var alarmstatus = 'Disarmed';                   // Current Alarm state
//var alarmstatus_p2 = 'Disarmed';                   // Current Alarm state
var receivebuffer = Buffer.alloc(1024, 0x00);   // Data received from alarm is stored here
var zonestatus = Buffer.alloc(32, 0x00);        // Current 32 zone status is stored here
var gettingstatus = false;                      // Indicates if status get is in progress
var controlAlarmstate = false;                  // Indicates if conreolling of alarm is in progress
var controlPGMstate = false;                    // Indicates if controlling of PGMs are in progress
var loginresult = 0;                            // Flag used to ignre login messages causing zone status messages
var muteStatus = false;                         // Mute flag to allow sending commands to Paradox.  This flag mutes the Zone and Alarm status polling.

var PanelProduct = 'SP5500';

// Global Zones status array
// Each Zone stores :
//   status : either on or off
//   accessory : store the accessory so that it can be accessed when a change occurs
//   Type : either GarageDoorOpener, MotionSensor, or ContactSensor
var zones = new Array();

// Global alarmstate
//   status: is either Armed Away, Armed Perimeter, Armed Sleep, or Disarmed
//   accessory : store the accessory so that it can be accessed when a change occurs
//var alarmstate = {
//    status: "Disarmed",
//    accessory: null
//};

var alarm = new Array();
var alarmstatus = new Array();
var PanelFirmware = new Array();

var alarm_ip_address = "192.168.1.0";           // Alarm IP address on local LAN
var alarm_port = 10000;                         // Alarm Port used
var alarm_password = "password";                // Store alarm password in here
var message_count = 0;                          // Count number of received status messages
var status_valid = false;                       // Flag indicating valid status received
var connected = true;                           // Flag to disable alarm connection for 3rd party access


// Global constants
const LOGIN_MSG1 = [0xAA, 0x08, 0x00, 0x03, 0x08, 0xF0, 0x00, 0x0A, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];
const LOGIN_MSG2 = [0xAA, 0x08, 0x00, 0x03, 0x08, 0xF0, 0x00, 0x0A, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];
const LOGIN_MSG3 = '\x72\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const LOGIN_MSG4 = '\x50\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const LOGIN_MSG5 = '\x5f\x20\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const LOGIN_MSG6 = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00];
const LOGIN_MSG7 = '\x50\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const LOGIN_MSG8 = '\x50\x00\x0e\x52\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';

const STATUS_MSG1                = [0xAA, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0x50, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd0, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];
const STATUS_MSG2                = [0xAA, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0x50, 0x00, 0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xd1, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];

const CONTROLALARM_MSG1          = [0xAA, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];
const CONTROLALARM_ARM_P0_MSG    = '\x40\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_DISARM_P0_MSG = '\x40\x00\x05\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_SLEEP_P0_MSG  = '\x40\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_STAY_P0_MSG   = '\x40\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_ARM_P1_MSG    = '\x40\x00\x04\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_DISARM_P1_MSG = '\x40\x00\x05\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_SLEEP_P1_MSG  = '\x40\x00\x03\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
const CONTROLALARM_STAY_P1_MSG   = '\x40\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';

const CONTROLPGM_MSG1            = [0xAA, 0x25, 0x00, 0x04, 0x08, 0x00, 0x00, 0x14, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE, 0xEE];
const CONTROLPGM_MSG2            = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';

const CLOSECONNECTION_MSG        = '\x70\x00\x05\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';



var eventMap = {
    0: "Zone OK",
    1: "Zone open",
    2: "Partition status",
    3: "Bell status (Partition 1)",
    5: "Non-Reportable Event",
    6: "Non-reportable event",
    7: "PGM Activation",
    8: "Button B pressed on remote",
    9: "Button C pressed on remote",
    10: "Button D pressed on remote",
    11: "Button E pressed on remote",
    12: "Cold start wireless zone",
    13: "Cold start wireless module (Partition 1)",
    14: "Bypass programming",
    15: "User code activated output (Partition 1)",
    16: "Wireless smoke maintenance signal",
    17: "Delay zone alarm transmission",
    18: "Zone signal strength weak 1 (Partition 1)",
    19: "Zone signal strength weak 2 (Partition 1)",
    20: "Zone signal strength weak 3 (Partition 1)",
    21: "Zone signal strength weak 4 (Partition 1)",
    22: "Button 5 pressed on remote",
    23: "Button 6 pressed on remote",
    24: "Fire delay started",
    25: "N/A",
    26: "Software access",
    27: "Bus module event",
    28: "StayD pass acknowledged",
    29: "Arming with user",
    30: "Special arming",
    31: "Disarming with user",
    32: "Disarming after alarm with user",
    33: "Alarm cancelled with user",
    34: "Special disarming",
    35: "Zone bypassed",
    36: "Zone in alarm",
    37: "Fire alarm",
    38: "Zone alarm restore",
    39: "Fire alarm restore",
    40: "Special alarm",
    41: "Zone shutdown",
    42: "Zone tampered",
    43: "Zone tamper restore",
    44: "New trouble (Partition 1:both for sub event 7",
    45: "Trouble restored ",
    46: "Bus / EBus / Wireless module new trouble (Partition 1)",
    47: "Bus / EBus / Wireless module trouble restored (Partition 1)",
    48: "Special (Partition 1)",
    49: "Low battery on zone",
    50: "Low battery on zone restore",
    51: "Zone supervision trouble",
    52: "Zone supervision restore",
    53: "Wireless module supervision trouble (Partition 1)",
    54: "Wireless module supervision restore (Partition 1)",
    55: "Wireless module tamper trouble (Partition 1)",
    56: "Wireless module tamper restore (Partition 1)",
    57: "Non-medical alarm (paramedic)",
    58: "Zone forced",
    59: "Zone included",
    64: "System Status"
};

var partitionStatus = {       
    0:"N/A" ,
    1:"N/A" ,
    2:"Silent alarm" ,
    3:"Buzzer alarm" ,
    4:"Steady alarm" ,
    5:"Pulse alarm" ,
    6:"Strobe" ,
    7:"Alarm stopped" ,
    8:"Squawk ON (Partition 1)" ,
    9:"Squawk OFF (Partition 1)" ,
    10:"Ground Start (Partition 1)" ,
    11:"Disarm partition" ,
    12:"Arm partition" ,
    13:"Entry delay started" ,
    14:"Exit delay started" ,
    15:"Pre-alarm delay" ,
    16:"Report confirmation" ,
    99:"Any partition status event"
};

var bellStatus = {
    0:" Bell OFF" ,
    1:" Bell ON" ,
    2:" Bell squawk arm" ,
    3:" Bell squawk disarm" ,
    99:"Any bell status event"
};

var nonReportableEvents = {
    0:"Telephone line trouble" ,
    1:"[ENTER]/[CLEAR]/[POWER] key was pressed (Partition 1 only)" ,
    2:"N/A" ,
    3:"Arm in stay mode" ,
    4:"Arm in sleep mode" ,
    5:"Arm in force mode" ,
    6:"Full arm when armed in stay mode" ,
    7:"PC fail to communicate (Partition 1)" ,
    8:"Utility Key 1 pressed (keys [1] and [2]) (Partition 1)" ,
    9:"Utility Key 2 pressed (keys [4] and [5]) (Partition 1)" ,
    10:"Utility Key 3 pressed (keys [7] and [8]) (Partition 1)" ,
    11:"Utility Key 4 pressed (keys [2] and [3]) (Partition 1)" ,
    12:"Utility Key 5 pressed (keys [5] and [6]) (Partition 1)" ,
    13:"Utility Key 6 pressed (keys [8] and [9]) (Partition 1)" ,
    14:"Tamper generated alarm" ,
    15:"Supervision loss generated alarm" ,
    16:"N/A" ,
    17:"N/A" ,
    18:"N/A" ,
    19:"N/A" ,
    20:"Full arm when armed in sleep mode" ,
    21:"Firmware upgrade -Partition 1 only (non-PGM event)" ,
    22:"N/A" ,
    23:"StayD mode activated" ,
    24:"StayD mode deactivated" ,
    25:"IP Registration status change" ,
    26:"GPRS Registration status change" ,
    99:"Any non-reportable event"
};

newTrouble = {
    0:"N/A" ,
    1:"AC failure" ,
    2:"Battery failure" ,
    3:"Auxiliary current overload" ,
    4:"Bell current overload" ,
    5:"Bell disconnected" ,
    6:"Clock loss" ,
    7:"Fire loop trouble" ,
    8:"Fail to communicate to monitoring station telephone #1" ,
    9:"Fail to communicate to monitoring station telephone #2" ,
    11:"Fail to communicate to voice report" ,
    12:"RF jamming" ,
    13:"GSM RF jamming" ,
    14:"GSM no service" ,
    15:"GSM supervision lost" ,
    16:"Fail To Communicate IP Receiver 1 (GPRS)" ,
    17:"Fail To Communicate IP Receiver 2 (GPRS)" ,
    18:"IP Module No Service" ,
    19:"IP Module Supervision Loss" ,
    20:"Fail To Communicate IP Receiver 1 (IP)" ,
    21:"Fail To Communicate IP Receiver 2 (IP)" ,
    99:"Any new trouble event"
};

var troubleRestored = {
    0:"Telephone line restore" ,
    1:"AC failure restore" ,
    2:"Battery failure restore" ,
    3:"Auxiliary current overload restore" ,
    4:"Bell current overload restore" ,
    5:"Bell disconnected restore" ,
    6:"Clock loss restore" ,
    7:"Fire loop trouble restore" ,
    8:"Fail to communicate to monitoring station telephone #1 restore" ,
    9:"Fail to communicate to monitoring station telephone #2 restore" ,
    11:"Fail to communicate to voice report restore" ,
    12:"RF jamming restore" ,
    13:"GSM RF jamming restore" ,
    14:"GSM no service restore" ,
    15:"GSM supervision lost restore" ,
    16:"Fail To Communicate IP Receiver 1 (GPRS) restore" ,
    17:"Fail To Communicate IP Receiver 2 (GPRS) restore" ,
    18:"IP Module No Service restore" ,
    19:"IP Module Supervision Loss restore" ,
    20:"Fail To Communicate IP Receiver 1 (IP) restore" ,
    21:"Fail To Communicate IP Receiver 2 (IP) restore" ,
    99:"Any trouble event restore"
};

var specialArming = {
    0:"Auto-arming (on time/no movement)" ,
    1:"Late to close" ,
    2:"No movement arming" ,
    3:"Partial arming" ,
    4:"Quick arming" ,
    5:"Arming through WinLoad" ,
    6:"Arming with keyswitch" ,
    99:"Any special arming"
};

var specialDisarming = {
    0:"Auto-arm cancelled (on time/no movement)" ,
    1:"Disarming through WinLoad" ,
    2:"Disarming through WinLoad after alarm" ,
    3:"Alarm cancelled through WinLoad" ,
    4:"Paramedical alarm cancelled" ,
    5:"Disarm with keyswitch" ,
    6:"Disarm with keyswitch after an alarm" ,
    7:"Alarm cancelled with keyswitch" ,
    99:"Any special disarming"
};

var specialAlarm = {
    0:"Panic non-medical emergency" ,
    1:"Panic medical" ,
    2:"Panic fire" ,
    3:"Recent closing" ,
    4:"Global shutdown" ,
    5:"Duress alarm" ,
    6:"Keypad lockout (Partition 1)" ,
    99:"Any special alarm event"
};

var softwareAccess = {
    0:"Non-valid source ID" ,
    1:"WinLoad direct" ,
    2:"WinLoad through IP module" ,
    3:"WinLoad through GSM module" ,
    4:"WinLoad through modem" ,
    9:"IP150 direct" ,
    10:"VDMP3 direct" ,
    11:"Voice through GSM module" ,
    12:"Remote access" ,
    13:"SMS through GSM module" ,
    99:"Any software access"
};

var busModuleEvent = {
    0:"A bus module was added" ,
    1:"A bus module was removed" ,
    2:"2-way RF Module Communication Failure" ,
    3:"2-way RF Module Communication Restored"
};

var moduleTrouble = {
    0:"Bus / EBus / Wireless module communication fault" ,
    1:"Tamper trouble" ,
    2:"Power fail" ,
    3:"Battery failure" ,
    99:"Any bus module new trouble event" 
};

var moduleTroubleRestore = {
    0:"Bus / EBus / Wireless module communication fault restore" ,
    1:"Tamper trouble restore" ,
    2:"Power fail restore" ,
    3:"Battery failure restore" ,
    99:"Any bus module trouble restored event"
};

 var special = {
    0:"System power up" ,
    1:"Reporting test" ,
    2:"Software log on" ,
    3:"Software log off" ,
    4:"Installer in programming mode" ,
    5:"Installer exited programming mode" ,
    6:"Maintenance in programming mode" ,
    7:"Maintenance exited programming mode" ,
    8:"Closing delinquency delay elapsed" ,
    99:"Any special event"
};

var systemStatus = {
    0:"Follow Arm LED status" ,
    1:"PGM pulse fast in alarm" ,
    2:"PGM pulse fast in exit delay below 10 sec." ,
    3:"PGM pulse slow in exit delay over 10 sec." ,
    4:"PGM steady ON if armed" ,
    5:"PGM OFF if disarmed"
};



//const DOOROPENTIME = 16000;
var LOGINDELAY = 3800;
var POLL_DELAY = 5000;
var WAIT_AFTER_LOGIN = 600;
var DELAY_BETWEEN_CMDS = 250;
var LOGOUT_DELAY = 500;
var LOGIN_DELAY_AFTER_RECONNECT = 1000;

const FIRMWARE = '\x00\x00\x00';

"use strict";

var Characteristic, Service, DoorState;

// Initialise firmware version
for (i=0; i < 3; i++) {
    PanelFirmware[i] = 0;
}
// Initialise zones
for (i = 0; i < 32; i++) {
    zones.push({status: "off", accessory: null, type: null, doorOpensInSeconds: null
});
}

// Initialise alarms
for (i = 0; i < 2; i++) {
    alarm.push({status: "Disarmed", accessory: null, partition: i});
}

// Initialise alarms
for (i = 0; i < 2; i++) {
    alarmstatus.push({status: "Disarmed"});
}

function _checksum() {
    var checksum = 0;
        for (i = 0; i < 36; i++)
            checksum += receivebuffer[i];
        while (checksum > 255)
            checksum = checksum - (checksum / 256) * 256;
    if (checksum == receivebuffer[36])
        return true;
    else return false;
}
//
// Function to retrieve alram status and zone status from buffer data received from alarm.
//  This is used in periodic status pole as well as in alarm control and pgm control functions
function _parsestatus(acc, cl) {
    
    var checkok = false;
    
//    if (_checksum()) {
//        acc.log('Checksum OK');
//        checkok = true;    
//    }
//    else checkok = false;
//    acc.log("Checksum :");
//    acc.log(checkok);

//    for (i = 0; i < 36; i++)
//        acc.log(receivebuffer[i]);

    if (receivebuffer[16] == 0x02) {
        switch (receivebuffer[20]) {
            case 0x15:
                PanelProduct = 'SP5500';
                break;
            case 0x16:
                PanelProduct = 'SP6000';
                break;
            case 0x17:
                PanelProduct = 'SP7000';
                break;
            case 0x40:
                PanelProduct = 'MG5000';
                break;
            case 0x42:
                PanelProduct = 'MG5050';
                break;
        }
        for (i=0;i < 3; i++) {
            PanelFirmware[i] = receivebuffer[21+i];
        }
        var Firmware = PanelFirmware[0] + PanelFirmware[1] + PanelFirmware[2];
        var str = toString(Firmware);

        acc.informationService
            .setCharacteristic(Characteristic.SerialNumber, PanelProduct)
            .setCharacteristic(Characteristic.FirmwareRevision, str);

    }
    
    if (receivebuffer[16] == 0xE2) {
        var state;
//        acc.log(receivebuffer[23]);
        acc.log(eventMap[receivebuffer[23]]);
        switch (receivebuffer[23]) {
            case 0:
                // "Zone OK",
                zones[receivebuffer[24]-1].status = 'off'; 
            case 1:
                // "Zone open",
                if (receivebuffer[23] == 1) zones[receivebuffer[24]-1].status = 'on';
                var state;
                if (zones[receivebuffer[24]-1].accessory != null) {
                    switch (zones[receivebuffer[24]-1].type) {
                        case 'Garage Door':
                            var isClosed;
                            if (zones[receivebuffer[24]-1].status == 'off') {
                                isClosed = true;
                                state = DoorState.CLOSED;
                            } else {
                                isClosed = false;
                                state = DoorState.OPEN;
                            }                            
                            if (isClosed != zones[receivebuffer[24]-1].accessory.wasClosed) {
                              if (!zones[receivebuffer[24]-1].accessory.operating) {
                                zones[receivebuffer[24]-1].accessory.log('Door state changed');
                                zones[receivebuffer[24]-1].accessory.wasClosed = isClosed;
                                zones[receivebuffer[24]-1].accessory.garagedooropenerService.getCharacteristic(DoorState).updateValue(state);
                                zones[receivebuffer[24]-1].accessory.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(state);
                                zones[receivebuffer[24]-1].accessory.targetState = state;
                              }
                            }
                            break;
                        case 'Alarm':
                            break;
                        case 'Contact Sensor':
                            if (zones[receivebuffer[24]-1].status == 'off') {
                                state = Characteristic.ContactSensorState.CONTACT_DETECTED;
                            } else {
                                state = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                            }
                            zones[receivebuffer[24]-1].accessory.contactsensorService.getCharacteristic(Characteristic.ContactSensorState).setValue(state);
                            break;
                        case 'Motion Sensor':
                            if (zones[receivebuffer[24]-1].status == 'off') {
                                state = false;
                            } else {
                                state = true;
                            }
                            zones[receivebuffer[24]-1].accessory.motionsensorService.getCharacteristic(Characteristic.MotionDetected).setValue(state);
                            break;
                    }
                }
                if (zones[receivebuffer[24]-1].accessory != null) {
                    zones[receivebuffer[24]-1].accessory.log('Zone ' + (receivebuffer[24]-1).toString() + ' ' + zones[receivebuffer[24]-1].status + ' (' + zones[receivebuffer[24]-1].accessory.name + ')');
                    if (mqttenabled) {
                        mqttclient.publish(zones[receivebuffer[24]-1].topic, zones[receivebuffer[24]-1].status, this.publish_options);
                    }
                }                
                acc.log('Zone:' + zones[receivebuffer[24]-1].accessory.name);
                break;
            case 2:
                // "Partition status"
                //0:"N/A" ,
                //1:"N/A" ,
                //2:"Silent alarm" ,
                //3:"Buzzer alarm" ,
                //4:"Steady alarm" ,
                //5:"Pulse alarm" ,
                //6:"Strobe" ,
                //7:"Alarm stopped" ,
                //8:"Squawk ON (Partition 1)" ,
                //9:"Squawk OFF (Partition 1)" ,
                //10:"Ground Start (Partition 1)" ,
                //11:"Disarm partition" ,
                //12:"Arm partition" ,
                //13:"Entry delay started" ,
                //14:"Exit delay started" ,
                //15:"Pre-alarm delay" ,
                //16:"Report confirmation" ,
                //99:"Any partition status event"                
                acc.log(partitionStatus[receivebuffer[24]]);
                break;
            case 3:
                // "Bell status (Partition 1)"
                acc.log(bellStatus[receivebuffer[24]]);
                break;
            case 5:
            case 6:
                acc.log(nonReportableEvents[receivebuffer[24]]);
                break;
            case 26:
                acc.log(softwareAccess[receivebuffer[24]]);
                break;
            case 27:
                acc.log(busModuleEvent[receivebuffer[24]]);
                break;
            case 30:
                acc.log(specialArming[receivebuffer[24]]);
                break;
            case 34:
                acc.log(specialDisarming[receivebuffer[24]]);
                break;
            case 36:
                // "Zone in alarm"
                zones[receivebuffer[24]-1].accessory.log('Zone:' + zones[receivebuffer[24]-1].accessory.name + 'in alarm.');
                alarm[receivebuffer[25]-1].accessory.setCharacteristic(Characteristic.SecuritySystemCurrentState, Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
                alarm[receivebuffer[25]-1].accessory.log('Alarmstatus :' + alarm[receivebuffer[25]-1].status);
                if (mqttenabled) {
                    mqttclient.publish(alarm[receivebuffer[25]-1].topic, alarm[receivebuffer[25]-1].status, acc.publish_options);
                }
                break;
            case 38:
                // "Zone alarm restore"
                zones[receivebuffer[24]-1].accessory.log('Zone:' + zones[receivebuffer[24]-1].accessory.name + 'alarm restored.');
                alarm[receivebuffer[25]-1].accessory.setCharacteristic(Characteristic.SecuritySystemCurrentState, Characteristic.SecuritySystemCurrentState.DISARMED);
                alarm[receivebuffer[25]-1].accessory.log('Alarmstatus :' + alarm[receivebuffer[25]-1].status);
                if (mqttenabled) {
                    mqttclient.publish(alarm[receivebuffer[25]-1].topic, alarm[receivebuffer[25]-1].status, acc.publish_options);
                }
                break;                
            case 40:
                acc.log(specialAlarm[receivebuffer[24]]);
                break;
            case 42:
                // "Trouble restored "
                acc.log([receivebuffer[24]]);
                break;
            case 44:
                // "New trouble (Partition 1:both for sub event 7"
                // SecuritySystem
                //  // Optional Characteristics
                //  this.addOptionalCharacteristic(Characteristic.StatusFault);
                acc.log(newTrouble[receivebuffer[24]]);
                break;
            case 45:
                // "Trouble restored "
                acc.log(troubleRestored[receivebuffer[24]]);
                break;
            case 46:
                acc.log(moduleTrouble[receivebuffer[24]]);
                break;
            case 47:
                acc.log(moduleTroubleRestore[receivebuffer[24]]);
                break;
            case 48:
                acc.log(special[receivebuffer[24]]);
                break;
//    42: "Zone tampered",
//    43: "Zone tamper restore",
//    49: "Low battery on zone",
// ContacSensor
//  // Optional Characteristics
//  this.addOptionalCharacteristic(Characteristic.StatusTampered);
//  this.addOptionalCharacteristic(Characteristic.StatusLowBattery);
//
// MotionSensor
//  // Optional Characteristics
//  this.addOptionalCharacteristic(Characteristic.StatusTampered);
//  this.addOptionalCharacteristic(Characteristic.StatusLowBattery);


            case 64:
                acc.log(systemStatus[receivebuffer[24]]);
                break;
        }
    }

    
    if (receivebuffer[16] == 0x52) {
        if (receivebuffer[19] == 0x01) {
            // Alarm status
//            acc.log('Alarm State received');
            status_valid = true;
            if (receivebuffer[33] > 0x10) {
                alarmstatus[0] = "In Alarm";
            } else {
                switch (receivebuffer[33]) {
                    case 0x00:
                        alarmstatus[0] = "Disarmed";
                        break;
                    case 0x01:
                        alarmstatus[0] = "Armed Away";
                        break;
                    case 0x02:
                        alarmstatus[0] = "Armed Sleep";
                        break;
                    case 0x03:
                        alarmstatus[0] = "Armed Sleep";
                        break;
                    case 0x06:
                        alarmstatus[0] = "Armed Sleep";
                        break;
                    case 0x04:
                        alarmstatus[0] = "Armed Perimeter";
                        break;
                    case 0x05:
                        alarmstatus[0] = "Armed Perimeter";
                        break;
                    case 0x08:
                        alarmstatus[0] = "Instant Armed";
                        break;
                    case 0x09:
                        alarmstatus[0] = "Instant Armed";
                        break;
                    default:
                        alarmstatus[0] = "Unknown";
                }
            }
            
            if (receivebuffer[37] > 0x10) {
                alarmstatus[1] = "In Alarm";
            } else {            
                switch (receivebuffer[37]) {
                    case 0x00:
                        alarmstatus[1] = "Disarmed";
                        break;
                    case 0x01:
                        alarmstatus[1] = "Armed Away";
                        break;
                    case 0x02:
                        alarmstatus[1] = "Armed Sleep";
                        break;
                    case 0x03:
                        alarmstatus[1] = "Armed Sleep";
                        break;
                    case 0x06:
                        alarmstatus[1] = "Armed Sleep";
                        break;
                    case 0x04:
                        alarmstatus[1] = "Armed Perimeter";
                        break;
                    case 0x05:
                        alarmstatus[1] = "Armed Perimeter";
                        break;
                    case 0x08:
                        alarmstatus[1] = "Instant Armed";
                        break;
                    case 0x09:
                        alarmstatus[1] = "Instant Armed";
                        break;
                    default:
                        alarmstatus[1] = "Unknown";
                }
                
            }
        }
        if (receivebuffer[19] == 0x00) {
            // Zone status
            if (loginresult == 0) {             // only get zone status if this message is not as a result of a login message sent to alarm          
//                acc.log('Zone State received');
                for (i = 0; i < 4; i++) {
                    for (j = 0; j < 8; j++) {
                        if (zones[j + i * 8].accessory != null) {
                            if (zones[j + i * 8].accessory.operating != true) {
                                if (receivebuffer[i + 35] & 0x01 << j) {
                                    zones[j + i * 8].status = "on";
                                } else {
                                    zones[j + i * 8].status = "off";
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

//
// This function formats the message sent to the alarm by ensuring it is 36 bytes in length and then adding a checksum byte to the end that results in a 37 byte message
function format37ByteMessage(message) {

    var checksum = 0;
    if (message.length % 37 != 0) {
        for (i = 0; i < message.length; i++)
            checksum += message.charCodeAt(i);
        while (checksum > 255)
            checksum = checksum - (checksum / 256) * 256;
        buf2 = Buffer.from([checksum]);
        buf1 = Buffer.from(message);
        buf3 = Buffer.concat([buf1, buf2], buf1.length + buf2.length);
        buf4 = Buffer.alloc((Math.round(buf3.length / 16) + 1) * 16, 0xEE);
        buf3.copy(buf4);
        message = buf4.toString('hex');
    }
    return message;
}

function setupClient() {
    var cl = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
        this.log('Getting Status - Connected to alarm!');
    });

    cl.on('end', () => {
//        self.log('Finished Getting Status - Disconnected from  alarm');
        loggedin = false;
        connected = false;
    });

    cl.on('timeout', () => {
//        self.log('No response from alarm - Disconnected from alarm');
        loggedin = false;
        cl.end();
    });

    cl.on('error', () => {
//        self.log('Error communicating with alarm - Disconnected from alarm');
        loggedin = false;
        cl.end();
    });

    cl.on('data', (data) => {
        if (data.length > 37) {
//            self.log("Message received");
//            self.log("message length = ");
//            self.log(data.length);
            receivebuffer = Buffer.from(data);
//            self.log(receivebuffer[16]);
//            self.log(receivebuffer[23]);
//            self.log(receivebuffer[24]);
//            self.log(receivebuffer[25]);            
            _parsestatus(self, client);
            message_count++;
        }
    });
    
    return cl;
}

//
// This is the login function to the alarm.  It takes the alarm password, the socket handle, and the accessory in order to be able to log message for the ccessory
function _login(password, cl, acc) {

    var byte1 = Buffer.from(LOGIN_MSG1);   
    var byte2 = Buffer.alloc(16,0xEE);  // Please not : currently only cater for passwords shorter than 16 characters
    var byte3 = Buffer.from(password);
    byte3.copy(byte2,0);
    byte1[1]=byte3.length;              // Cater for password length in header
    var totalLength = byte1.length + byte2.length;
    var buf = Buffer.concat([byte1, byte2], totalLength);

    loginresult = 1;
    acc.log('Logging in');

    cl.write(buf);
    setTimeout(function () {
        if (receivebuffer[4] == 0x38) {
            acc.log('Log in successfull');
            buf = Buffer.from(LOGIN_MSG2);
            buf[1] = 0x00;
            buf[5] = 0xF2;
            cl.write(buf);
            setTimeout(function () {
                acc.log('Step 1');
                buf[5] = 0xF3;
                cl.write(buf);
                setTimeout(function () {
                    acc.log('Step 2');
                    buf[1] = 0x25;
                    buf[3] = 0x04;
                    buf[5] = 0x00;
                    var message = LOGIN_MSG3;
                    message = format37ByteMessage(message);
                    buf2 = Buffer.from(message, 'hex');
                    totalLength = buf.length + buf2.length;
                    var buf3 = Buffer.concat([buf, buf2], totalLength);
                    cl.write(buf3);
                    setTimeout(function () {
                        acc.log('Step 3');
                        buf[1] = 0x26;
                        buf[3] = 0x03;
                        buf[5] = 0xF8;
                        message = LOGIN_MSG4;
                        message = format37ByteMessage(message);
                        buf2 = Buffer.from(message, 'hex');
                        buf2[2] = 0x80;     // Weird bug that adds c2 whenever there is 0x80 in string so fix it manually
                        totalLength = buf.length + buf2.length;
                        buf3 = Buffer.concat([buf, buf2], totalLength);
                        cl.write(buf3);
                        setTimeout(function () {
                            buf[1] = 0x25;
                            buf[3] = 0x04;
                            buf[5] = 0x00;
                            message = LOGIN_MSG5;
                            message = format37ByteMessage(message);
                            buf2 = Buffer.from(message, 'hex');
                            totalLength = buf.length + buf2.length;
                            buf3 = Buffer.concat([buf, buf2], totalLength);
                            cl.write(buf3);
                            setTimeout(function () {
// add code here to extract product id and firmware version to information service
                                buf[7] = 0x14;
                                buftemp = Buffer.alloc(23, 0x00);
                                receivebuffer.copy(buftemp, 0, 16, 26);
                                receivebuffer.copy(buftemp, 10, 24, 26);
                                receivebuffer.copy(buftemp, 15, 31, 39);
                                buftemp[12] = 0x19;
                                buftemp[13] = 0x00;
                                buftemp[14] = 0x00;
                                buf2 = Buffer.from(LOGIN_MSG6);
                                totalLength = buftemp.length + buf2.length;
                                buf3 = Buffer.concat([buftemp, buf2], totalLength);
                                var checksum = 0;
                                for (i = 0; i < buf3.length; i++) {
                                    checksum += buf3[i];
                                }
                                while (checksum > 255) {
                                    checksum = checksum - Math.trunc(checksum / 256) * 256;
                                }
                                buf4 = Buffer.from([checksum]);
                                buf5 = Buffer.concat([buf3, buf4], buf3.length + buf4.length);
                                buf6 = Buffer.alloc((Math.round(buf5.length / 16) + 1) * 16, 0xEE);
                                buf5.copy(buf6);
                                totalLength = buf.length + buf6.length;
                                buf7 = Buffer.concat([buf, buf6], totalLength);
                                cl.write(buf7);
                                setTimeout(function () {
                                    buf[1] = 0x25;
                                    buf[3] = 0x04;
                                    buf[5] = 0x00;
                                    buf[7] = 0x14;
                                    message = LOGIN_MSG7;
                                    message = format37ByteMessage(message);
                                    buf2 = Buffer.from(message, 'hex');
                                    totalLength = buf.length + buf2.length;
                                    buf3 = Buffer.concat([buf, buf2], totalLength);
                                    cl.write(buf3);
                                    setTimeout(function () {
                                        buf[1] = 0x25;
                                        buf[3] = 0x04;
                                        buf[5] = 0x00;
                                        buf[7] = 0x14;
                                        message = LOGIN_MSG8;
                                        message = format37ByteMessage(message);
                                        buf2 = Buffer.from(message, 'hex');
                                        totalLength = buf.length + buf2.length;
                                        buf3 = Buffer.concat([buf, buf2], totalLength);
                                        cl.write(buf3);
                                        setTimeout(function () {
                                            loggedin = true;
                                            acc.log('Done logging in');
                                        }, LOGINDELAY);
                                    }, DELAY_BETWEEN_CMDS);
                                }, DELAY_BETWEEN_CMDS);
                            }, DELAY_BETWEEN_CMDS);
                        }, DELAY_BETWEEN_CMDS);
                    }, DELAY_BETWEEN_CMDS);
                }, DELAY_BETWEEN_CMDS);
            }, DELAY_BETWEEN_CMDS);
        } else {
            acc.log('Error logging in');
            cl.end();
            loggedin = false;
        }
    }, WAIT_AFTER_LOGIN);
}


function _logout(cl, acc) {

    acc.log('Creating close message');
    var buf = Buffer.from(CONTROLALARM_MSG1);
    message1 = CLOSECONNECTION_MSG;
    message1 = format37ByteMessage(message1);
    var buf2 = Buffer.from(message1, 'hex');
    var totalLength = buf.length + buf2.length;
    var buf3 = Buffer.concat([buf, buf2], totalLength);

    loginresult = 0;
    loggedin = false;
    acc.log('Close alarm connection');

    cl.write(buf3);
    setTimeout(function() {
        cl.end();
    }, LOGOUT_DELAY);
}    


//
// This is an internal function that sends the status request messages to the alarm in order to retrieve the alarm and zone status
//  It takes the socket handle to communicate the message to the alarm and accessory handle in order to log messages for the accessory
function _getalarmstatus(cl, acc) {
    if (loggedin) {

        acc.log('Geting Status...');
        loginresult = 0;
        buf = Buffer.from(STATUS_MSG1);
        cl.write(buf);
        setTimeout(function () {
            buf = Buffer.from(STATUS_MSG2);
            cl.write(buf);
            setTimeout(function () {
                acc.log("Statusses:");
                acc.log('Area 1 - ' + alarmstatus[0]);
                acc.log('Area 2 - ' + alarmstatus[1]);
            }, DELAY_BETWEEN_CMDS);
        }, DELAY_BETWEEN_CMDS);
    } else {
        acc.log('Cannot get status - not logged in');
    }
}


//
// Function that handles the full status get cycle. It logs in, sends status requets message and retrieves status info form data received from alarm
//  It takes accessory as input in order to be able to log messages for it
function getAlarmStatus(acc) {
    
    self = this;

    if (controlPGMstate || controlAlarmstate || !connected) {
        acc.log('Busy with alarm now - not getting status');
        return false;
    }

    message_count = 0;
    status_valid = false;
    _getalarmstatus(client, acc);
    status_valid = true;
    return(status_valid);
}


//
// Function to control alarm
//   It takes input as the state the alarm must be set to, the partition in which the zone is, the accessory in order to log messages and the socket handle to be able to talk to alarm 
function controlAlarm(state, partition, acc, cl) {

    if (loggedin) {
        var message1 = '';

        acc.log('Controlling Alarm State...');
        buf = Buffer.from(CONTROLALARM_MSG1);
        if (partition == 0) {
            switch (state) {
                case "ARM" :
                    message1 = CONTROLALARM_ARM_P0_MSG;
                    break;
                case "DISARM" :
                    message1 = CONTROLALARM_DISARM_P0_MSG;
                    break;
                case "SLEEP" :
                    message1 = CONTROLALARM_SLEEP_P0_MSG;
                    break;
                case "STAY" :
                    message1 = CONTROLALARM_STAY_P0_MSG;
                    break;
            }
        }
        if (partition == 1) {
            switch (state) {
                case "ARM" :
                    message1 = CONTROLALARM_ARM_P1_MSG;
                    break;
                case "DISARM" :
                    message1 = CONTROLALARM_DISARM_P1_MSG;
                    break;
                case "SLEEP" :
                    message1 = CONTROLALARM_SLEEP_P1_MSG;
                    break;
                case "STAY" :
                    message1 = CONTROLALARM_STAY_P1_MSG;
                    break;
            }
        }
        message1 = format37ByteMessage(message1);
        var buf2 = Buffer.from(message1, 'hex');
        var totalLength = buf.length + buf2.length;
        var buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
    } else {
        acc.log('Cannot set Alarm - not logged in');
    }
}


//
// Function to covert a decimal number into a hex string representative
function getHex(dec) {
    var hexArray = new Array("\x00", "\x01", "\x02", "\x03",
            "\x04", "\x05", "\x06", "\x07",
            "\x08", "\x09", "\x0a", "\x0b",
            "\x0c", "\x0d", "\x0e", "\x0f");

    var code1 = Math.floor(dec / 16);
    var code2 = dec - code1 * 16;

    var decToHex = hexArray[code2];

    return (decToHex);
}


//
// Function to control pgms
//   It takes input as the state the pgm must be set to, the accessory in order to log messages and the socket handle to be able to talk to alarm 
function controlPGM(state, pgm, acc, cl) {

    if (loggedin) {
        var message1 = '';

        acc.log('Controlling PGM State...');

        buf = Buffer.from(CONTROLPGM_MSG1);
        if (state == "ON") {
            message1 = '\x40\x00\x30';
        } else if (state == "OFF") {
            message1 = '\x40\x00\x31';
        } else {
            acc.log('Invalid PGM state - ignoring.');
            return;
        }
        msg = getHex(pgm);
//        acc.log(msg);
        message2 = message1.concat(msg);
        str2 = CONTROLPGM_MSG2;
        message3 = message2.concat(str2);
        message4 = format37ByteMessage(message3);
        var buf2 = Buffer.from(message4, 'hex');
//        acc.log(buf2);
        var totalLength = buf.length + buf2.length;
        var buf3 = Buffer.concat([buf, buf2], totalLength);
        cl.write(buf3);
    } else {
        acc.log('Cannot set PGM - not logged in');
    }
}


//
// Funtion to convert status to Homebridge values
function GetHomebridgeStatus(msg) {

    var status = 10;
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
    }
    ;
    return status;
}


module.exports = function (homebridge) {
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;
    DoorState = homebridge.hap.Characteristic.CurrentDoorState;
    AlarmS = homebridge.hap.Characteristic.SecuritySystemCurrentState;

    homebridge.registerPlatform("homebridge-paradox", "Paradox", paradoxPlatform);
};

//
// Define Homebridge Paradox Platform
function paradoxPlatform(log, config) {

    var self = this;

    this.log = log;
    this.config = config;
    
    this.log("Platform initialisation");

    // Retrieve Alarm IP address, Port and password form config.json file
    alarm_ip_address = this.config.ip;
    alarm_port = this.config.port;
    alarm_password = this.config.password;
    LOGINDELAY = this.config.logindelay;
    POLL_DELAY = this.config.polldelay;
    WAIT_AFTER_LOGIN = this.config.waitafterlogin;
    DELAY_BETWEEN_CMDS = this.config.delaybetweencmds;
    LOGOUT_DELAY = this.config.logoutdelay;
    LOGIN_DELAY_AFTER_RECONNECT = this.config.logindelayafterreconnect;

//    if (this.config.mqtt) {
//        this.client.publish(this.topicStatusSet, this.statusCmd, this.publish_options);
//    }


    if (this.config.mqtt) {
        mqttenabled = true;
  	this.url = this.config.mqtturl;
        this.log("MQTT URL - " + this.url);
        this.publish_options = {
            qos: ((this.config.qos !== undefined) ? this.config.qos : 0),
	    retain: ((this.config.retain !== undefined) ? this.config.retain : false)
        };
        this.log("Publish Options");
	this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
        this.log("Client ID");        
	this.options = {
	    keepalive: 10,
            clientId: this.client_Id,
	    protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
	    will: {
                topic: 'WillMsg',
                payload: 'Connection Closed abnormally..!',
                qos: 0,
                retain: ((this.config.retain !== undefined) ? this.config.retain : false)
            },
	    username: this.config.mqttusername,
	    password: this.config.mqttpassword,
            rejectUnauthorized: false
	};
        this.log("Connecting to MQTT Broker");
        mqttclient = mqtt.connect(this.url, this.options);

//        this.mqttclient.on('message', function (topic, message) {
//        if (topic == that.topicStatusGet) {
//            var status = message.toString();
//            if (status == that.onValue || status == that.offValue) {
//                    that.switchStatus = (status == that.onValue) ? true : false;
//                    that.service.getCharacteristic(Characteristic.On).setValue(that.switchStatus, undefined, 'fromSetValue');
//            }
//        }
//        });
    }        
//    this.client.subscribe(this.topicStatusGet);
//    this.client.publish(this.topicStatusSet, this.statusCmd, this.publish_options);


//    client = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
//        this.log('Getting Status - Connected to alarm!');
//    });
//
//    client.on('end', () => {
////        self.log('Finished Getting Status - Disconnected from  alarm');
//        loggedin = false;
//        connected = false;
//    });
//
//    client.on('timeout', () => {
////        self.log('No response from alarm - Disconnected from alarm');
//        loggedin = false;
//        client.end();
//    });
//
//    client.on('error', () => {
////        self.log('Error communicating with alarm - Disconnected from alarm');
//        loggedin = false;
//        client.end();
//    });
//
//    client.on('data', (data) => {
//        if (data.length > 37) {
////            self.log("Message received");
////            self.log("message length = ");
////            self.log(data.length);
//            receivebuffer = Buffer.from(data);
////            self.log(receivebuffer[16]);
////            self.log(receivebuffer[23]);
////            self.log(receivebuffer[24]);
////            self.log(receivebuffer[25]);            
//            _parsestatus(self, client);
//            message_count++;
//        }
//    });
//    
//    _login(alarm_password, client, self);
//    this.log("Fin logged in")
    // Status poll loop
    //  This loop sends the status request message to the alarm and then retrives the values form the buffer.
    //  It then parses the values corretcly to reflect the correct Homekit status, depending on what tye of accessory the status belongs to.
    //  It handles garage door, contact zones and motion detection homekit accessories.
    //  The zone accessory type is mapped in the config.json file.
    //  Each accsory can also have a pgm mapped to it.  this is also mapped in the config.json file.
    setInterval(function (client) {
        alarm[0].accessory.log('Mute : [%s]', muteStatus);
        if (connected && !loggedin) {
            client = setupClient();
            _login(alarm_password, client, self);
        }
        if (!muteStatus && getAlarmStatus(self)) {
            var state;
            alarm[0].accessory.log('Got status');
            alarm[0].accessory.log('Results:');
            for (i = 0; i < 32; i++) {
                var st;
                if (zones[i].accessory != null) {
                    switch (zones[i].type) {
                        case 'Garage Door':
                            var isClosed;
                            if (zones[i].status == 'off') {
                                isClosed = true;
                                state = DoorState.CLOSED;
                            } else {
                                isClosed = false;
                                state = DoorState.OPEN;
                            }                            
                            if (isClosed != zones[i].accessory.wasClosed) {
                              if (!zones[i].accessory.operating) {
                                zones[i].accessory.log('Door state changed');
                                zones[i].accessory.wasClosed = isClosed;
                                zones[i].accessory.garagedooropenerService.getCharacteristic(DoorState).updateValue(state);
                                zones[i].accessory.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(state);
                                zones[i].accessory.targetState = state;
                              }
                            }
                            break;
                        case 'Alarm':
                            break;
                        case 'Contact Sensor':
                            if (zones[i].status == 'off') {
                                state = Characteristic.ContactSensorState.CONTACT_DETECTED;
                            } else {
                                state = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                            }
                            zones[i].accessory.contactsensorService.getCharacteristic(Characteristic.ContactSensorState).setValue(state);
                            break;
                        case 'Motion Sensor':
                            if (zones[i].status == 'off') {
                                state = false;
                            } else {
                                state = true;
                            }
                            zones[i].accessory.motionsensorService.getCharacteristic(Characteristic.MotionDetected).setValue(state);
                            break;
                        default:
                            alarm[0].accessory.log('Not Supported: %s [%s]', accessoryName, accConfig.type);
                    }
                }
                if (zones[i].accessory != null) {
                    zones[i].accessory.log('Zone ' + i.toString() + ' ' + zones[i].status + ' (' + zones[i].accessory.name + ')');
                    if (mqttenabled) {
                        mqttclient.publish(zones[i].topic, zones[i].status, this.publish_options);
                    }
                }
            }
            
            for (i = 0; i < 2; i++) {
                if (alarm[i].accessory != null) {
                    if (alarm[i].status != alarmstatus[i]) {
                        if (alarmstatus[i] == 'In Alarm' || alarmstatus[i] == 'Armed Perimeter' || alarmstatus[i] == 'Armed Sleep' || alarmstatus[i] == 'Armed Away' || alarmstatus[i] == 'Disarmed') {
                            alarm[i].status = alarmstatus[i];
                            var stat = GetHomebridgeStatus(alarmstatus[i]);
                            if (alarmstatus[i] == 'In Alarm') {
                                var alarmtype = 'Zone(s) triggered:';                        
                                for (i = 0; i < 32; i++) {
                                    if (zones[i].accessory != null) {
                                        alarmtype += zones[i].name + ' ';
                                    }
                                }
                            }
                            alarm[i].accessory.securitysystemService.getCharacteristic(Characteristic.SecuritySystemAlarmType).updateValue(alarmtype);                    
                            alarm[i].accessory.securitysystemService.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(stat);
                            alarm[i].accessory.securitysystemService.getCharacteristic(Characteristic.SecuritySystemTargetState).updateValue(stat);
                        }
                    }
                    alarm[i].accessory.log('Alarmstatus :' + alarm[i].status);
                    if (mqttenabled) {
                        mqttclient.publish(alarm[i].topic, alarm[i].status, this.publish_options);
                    }
                }
            }

        } else {
            alarm[0].accessory.log('Busy with alarm - not getting status now.');
        }
    }, POLL_DELAY);
    
};

//
// This is the function used by homebridge to create the accessories by parsing through the config.json file.
//  It retrieves the name, accessory type.
//  It then maps the name and type to the zone in the global zone status array.
paradoxPlatform.prototype.accessories = function (callback) {

    var self = this;

    var acc = [];

    if (this.config.accessories) {
        var accessories = this.config.accessories;
        this.log('Looking for accessories in config file');
        accessories.forEach(function (accessoryConfig) {
            var accessoryName = accessoryConfig.name;
            self.log('Accessory');
            self.log(accessoryName);
            var accConfig = accessoryConfig.config;

            if (!accessoryName || !accessoryConfig) {
                self.log('Missing parameters.');
                return;
            }

            self.log('Found: %s [%s]', accessoryName, accConfig.type);
            
            if (accessoryName != "inactive") {

                var a = new ParadoxAccessory(self.log, accConfig, accessoryName);

                if (accConfig.type == 'Garage Door' || accConfig.type == 'Contact Sensor' || accConfig.type == 'Motion Sensor') {
                    zones[accConfig.zone].accessory = a;
                    zones[accConfig.zone].type = accConfig.type;
                    zones[accConfig.zone].topic = accConfig.topic;                
                }
                if (accConfig.type == 'Garage Door') {
                    zones[accConfig.zone].doorOpensInSeconds = accConfig.doorOpensInSeconds;
                    self.log('Door open in seconds:');
                    self.log(accConfig.doorOpensInSeconds);
                }

                if (accConfig.type == 'Alarm') {
                    alarm[accConfig.partition].accessory = a;
                    alarm[accConfig.partition].topic = accConfig.topic;
                }
                acc.push(a);
            }
        });
   } else {
        this.log('No config for platform');
    }
    callback(acc);
};


function ParadoxAccessory(log, config, name) {

    this.log = log;
    this.config = config;
    this.name = name;
    this.reachability = true;
    this.wasClosed = true;
    this.operating = false;
    
    this.initService();
};


//
// Called when the accessory needs to be identified. This can be done in the Home app for example
ParadoxAccessory.prototype.identify = function (callback) {

    this.log('[' + this.name + '] Identify requested!');
    callback(null); // success
};


//  This is called to retrieve the accessory service types and handles all the modelled types, i.e. Alarm, Garage Door, Contact Sensor and Motion sensor.
ParadoxAccessory.prototype.getServices = function () {

    switch (this.config.type) {
        case 'Alarm':
            return [this.informationService, this.securitysystemService];
            break;
        case 'Garage Door':
          return [this.informationService, this.garagedooropenerService];
            break;
        case 'Contact Sensor':
           return [this.informationService, this.contactsensorService];
            break;
        case 'Motion Sensor':
            return [this.informationService, this.motionsensorService];
            break;
        case 'Connected':
            return [this.informationService, this.switchService];
            break;
    }
};


//  This is called to retrieve the accessory service types and handles all the modelled types, i.e. Alarm, Garage Door, Contact Sensor and Motion sensor.
ParadoxAccessory.prototype.initService = function () {

    this.informationService = new Service.AccessoryInformation();

    this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Paradox')
            .setCharacteristic(Characteristic.SerialNumber, 'Platform')
            .setCharacteristic(Characteristic.FirmwareRevision, 'v1.0');

    switch (this.config.type) {
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

            this.log("Initial Alarm State: ");
            this.log(alarmstatus[this.config.partition]);
            this.securitysystemService.getCharacteristic(AlarmS).setValue(GetHomebridgeStatus(alarmstatus[this.config.partition]));
            this.securitysystemService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(GetHomebridgeStatus(alarmstatus[this.config.partition]));
            break;
        case 'Garage Door':
            this.garagedooropenerService = new Service.GarageDoorOpener(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Garage Door');
            this.garagedooropenerService
                    .getCharacteristic(DoorState)
                    .on('get', this.getDoorState.bind(this));
            this.garagedooropenerService
                    .getCharacteristic(Characteristic.TargetDoorState)
                    .on('set', this.setDoorState.bind(this));
            this.garagedooropenerService
                    .getCharacteristic(Characteristic.ObstructionDetected)
                    .on('get', this.getObstructed.bind(this));

            this.garagedooropenerService.operating = false;
                        
            this.log("Initial Door State: ");
            if (zones[this.config.zone].status == 'off') {
                this.wasClosed = true;
                this.log('Closed');
                this.garagedooropenerService.getCharacteristic(DoorState).setValue(Characteristic.CurrentDoorState.CLOSED);  /// Was TargetDoorState
                this.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(Characteristic.TargetDoorState.CLOSED);
            } else {
                this.wasClosed = false;
                this.log('Open');
                this.garagedooropenerService.getCharacteristic(DoorState).setValue(Characteristic.CurrentDoorState.OPEN);  /// Was TargetDoorState
                this.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(Characteristic.TargetDoorState.OPEN);
            }
            break;
        case 'Contact Sensor':
            this.contactsensorService = new Service.ContactSensor(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Contact Sensor');
            break;
        case 'Motion Sensor':
            this.motionsensorService = new Service.MotionSensor(this.name);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Motion Sensor');
            break;
        case 'Connected':
            this.switchService = new Service.Switch(this.name);
            this.log("Initialy connected to alarm");            
            this.switchService.setCharacteristic(Characteristic.On, true);
            this.informationService
                    .setCharacteristic(Characteristic.Model, 'Connected switch');
            this.switchService
                .getCharacteristic(Characteristic.On)
                .on('get', this.getConnectedState.bind(this));
            this.switchService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setConnectedState.bind(this));
            break;
    }
};


//
//
// Garage Door Opener handler functions

ParadoxAccessory.prototype.getDoorState = function (callback) {
    var self = this;
    var acc = this.garagedooropenerService;
    var config = this.config;

    callback(null, this.targetState);
};


ParadoxAccessory.prototype.setFinalDoorState = function(callback, state) {

    var acc = this.garagedooropenerService;

//    if (!this.hasClosedSensor() && !this.hasOpenSensor()) {
//      var isClosed = !this.isClosed();
//      var isOpen = this.isClosed();
//    } else {
//      var isClosed = this.isClosed();
//      var isOpen = this.isOpen();
//    }
//    if ( (this.targetState == DoorState.CLOSED && !isClosed) || (this.targetState == DoorState.OPEN && !isOpen) ) {
//      this.log("Was trying to " + (this.targetState == DoorState.CLOSED ? "CLOSE" : "OPEN") + " the door, but it is still " + (isClosed ? "CLOSED":"OPEN"));
//      this.currentDoorState.setValue(DoorState.STOPPED);
//    } else {
      this.log("Set current state to " + (this.targetState == DoorState.CLOSED ? "CLOSED" : "OPEN"));
      this.wasClosed = this.targetState == DoorState.CLOSED;
      this.log("Setting final state...");
      this.garagedooropenerService.setCharacteristic(DoorState, this.targetState);
//      this.garagedooropenerService.getCharacteristic(Characteristic.TargetDoorState).setValue(this.targetState);
  
    //    }
    this.operating = false;
    callback(null, state);
};


ParadoxAccessory.prototype.setDoorState = function (state, callback) {

    var acc = this.garagedooropenerService;
    var config = this.config;
    var self = this;
    var wait = 1;
    
    var isClosed;
    
    self.log('Setting state to ' + state);
    this.targetState = state;

    if (zones[config.zone].status == 'off') {
        isClosed = true;
        self.log('Curently closed');
    } else {
        isClosed = false;
        self.log('Curently open');
    }

    if ((state == DoorState.OPEN && isClosed) || (state == DoorState.CLOSED && !isClosed)) {
        self.log("Triggering GarageDoor Relay");
        this.operating = true;
        if (state == DoorState.OPEN) {
            acc.getCharacteristic(DoorState).setValue(DoorState.OPENING);
        } else {
            acc.getCharacteristic(DoorState).setValue(DoorState.CLOSING);
        }
        self.log("Door will close in (s) :");
        self.log(this.config.doorOpensInSeconds);
    
        if (gettingstatus || controlAlarmstate || controlPGMstate) {
            self.log('Alarm busy ... waiting 5s');
            wait = 1000;
        }
               
        setTimeout (function () {
            self.log('OK proceeding');
            controlPGMstate = true;
            muteStatus = true;

            self.log('PGM:');
            self.log(config.pgm);

            var options = {
                mode: 'text',
                encoding: 'utf8',
                args: [config.pgm]
            };
            controlPGM("ON", config.pgm, self, client);
            setTimeout(self.setFinalDoorState.bind(self, callback, state), self.config.doorOpensInSeconds * 1000);
            setTimeout(function () {
                controlPGM("OFF", config.pgm, self, client);
                setTimeout(function () {
                    controlPGMstate = false;
                    muteStatus = false;
                    this.reachability = true;
                }, DELAY_BETWEEN_CMDS);
            }, DELAY_BETWEEN_CMDS);
        }, wait);
    }
    else {
      callback();
    }
};


ParadoxAccessory.prototype.getObstructed = function (callback) {

    this.log('Not Obstructed');
    callback();
};

//
//
// Security System(Alarm) handler functions
//
ParadoxAccessory.prototype.getAlarmState = function (callback) {

    var acc = this.securitysystemService;
    var state;
    var self = this;
    var err = null;
    var config = this.config;

    state = GetHomebridgeStatus(alarm[config.partition].status);
    if (state == 10) {
        self.log('Alarmstate unknown');
        err = 'Error';
    }
    self.log('Alarmstate:');
    self.log(state);
    this.reachability = true;

    callback(err, state);
};


ParadoxAccessory.prototype.setAlarmState = function (state, callback) {

    var targetstate = 10;
    var acc = this.securitysystemService;
    targetstate = state;
    var self = this;
    var wait = 1;
    var config = this.config;

    if (targetstate == Characteristic.SecuritySystemTargetState.STAY_ARM || targetstate == Characteristic.SecuritySystemTargetState.NIGHT_ARM || targetstate == Characteristic.SecuritySystemTargetState.AWAY_ARM || targetstate == Characteristic.SecuritySystemTargetState.DISARM) {

        self.log('Setting alarm state to %s', targetstate);

        // Need to suspend status update timer while changing alarm state and then
        // reinstate the timer afterwards to avoid contention on alarm while setting state
        
        if (controlPGMstate || gettingstatus || controlAlarmstate) {
            self.log('Busy with alarm .... Waiting to complete');
            wait = 1000;
        }
        
        setTimeout (function () {
            muteStatus = true;
            controlAlarmstate = true;
            _getalarmstatus(client, self);
            setTimeout(function () {
                if (GetHomebridgeStatus(alarmstatus[config.partition]) != targetstate) {
                    switch (targetstate) {
                        case Characteristic.SecuritySystemTargetState.STAY_ARM:
                            controlAlarm("STAY", config.partition, self, client);
                            break;
                        case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                            controlAlarm("SLEEP", config.partition, self, client);
                            break;
                        case Characteristic.SecuritySystemTargetState.AWAY_ARM :
                            controlAlarm("ARM", config.partition, self, client);
                            break;
                        case Characteristic.SecuritySystemTargetState.DISARM:
                            controlAlarm("DISARM", config.partition, self, client);
                            break;
                        default :
                            self.log('Unknown state');
                    }
                    self.securitysystemService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
                }
                controlAlarmstate = false;
                muteStatus = false;
                self.reachability = true;
                callback(null, state);                       
            }, LOGOUT_DELAY);                
        }, wait);    
    } else {
        self.log('Alarm status error - ignoring');
    }
};

ParadoxAccessory.prototype.getConnectedState = function (callback) {

    callback(null, connected);    
};

ParadoxAccessory.prototype.setConnectedState = function (state, callback) {
    
    var self = this;
    
    this.log("Changing connected state");
    if (!connected) {
//        this.log("Logging in again");
//        client = net.createConnection({port: alarm_port, host: alarm_ip_address}, () => {
//            this.log('Getting Status - Connected to alarm!');
//        });
//
//        client.on('end', () => {
//    //        self.log('Finished Getting Status - Disconnected from  alarm');
//            loggedin = false;
//            connected = false;
//        });
//
//        client.on('timeout', () => {
//    //        self.log('No response from alarm - Disconnected from alarm');
//            loggedin = false;
//            client.end();
//        });
//
//        client.on('error', () => {
//    //        self.log('Error communicating with alarm - Disconnected from alarm');
//            loggedin = false;
//            client.end();
//        });
//
//        client.on('data', (data) => {
//            if (data.length > 37) {
//    //            acc.log("Message received");
//    //            acc.log("message length = ");
//    //            acc.log(data.length);
//                receivebuffer = Buffer.from(data);
//                _parsestatus(self, client);
//                message_count++;
//            }
//        });
//       
//        setTimeout ( function() {
//           _login(alarm_password, client, self);
//           setTimeout ( function () {
                connected = true;               
//           }, LOGINDELAY);
//        } ,LOGIN_DELAY_AFTER_RECONNECT);

    } else {
       this.log("Disconnecting from alarm");
       _logout(client, self);
       connected = false;
   }
   
   state = connected;
   callback(null, connected);
};

