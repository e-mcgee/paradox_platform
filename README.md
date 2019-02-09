# paradox_platform
Paradox alarm homebridge platform

This is my updated release of a paradox platform.  I have tested on my Paradox MG5050 v4 and IP100.
The code is based on Tertiush Python scripts, code I adopted from a Raspberry Pi Garage Door Opener, as well as several sample homebridge accessories/platforms I could find.

Please assist me to maintain by donating to : [![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=TLH94WX6J7BB8)

The new version finally supports 2 partitions.  I found a way to read the second partition state.  The config.json file now requires 2 alarm accessories.  These include the name and partition number.
If the second partition is not implemented, use "inactive" as its name so that it is not loaded into homebridge.
See the updated sample config.json file.

I have now added a switch control accessory to the Paradox platform to control connection status to the alarm.
This is useful if you want to connect to the alarm with other apps such as iParadox or the Web page.
You simply toggle the switch to control logged in status.

Parameters are available for the config of the platform to tweak all the delays between commands and plugins.See the wiki for description of this and sample config.json file.

Change log:
1) Fixed callback in door state setting to ensure immediate feedback so that multiple actions on doors can happen simultaneously.
2) Fixed alarm set callback that was missing
3) Mute status get until login complete
4) Fixed random crash - caused by log during PGM changes
5) Fixed random crash - caused by incorrect zone or alarm value received from alarm that points to an invalid zone not caught by code.  Now checking validity of zone first.
6) Calculating Checksum correctly - only parse message received if checksum is OK
7) Checks that zone info received from alarm is between 1 and 32 to avoid crashes if not
8) Fixed variable that is not initialised and may cause random crashes
9) Fixed race condition during debounce period on index variable
10) Changed alarm trigger state
11) Fixed Connected flag that gets reset on connection end.  Connected flag should stop login but failed connections should not stop login through flag

Please note:
The maximum password length is 16 characters.
The plugin  requires version 0.4.36 or higher.

