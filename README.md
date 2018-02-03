# paradox_platform
Paradox alarm homebridge platform

This is my updated release of a paradox platform.  I have tested on my Paradox MG5050 v4 and IP100.
The code is based on Tertiush Python scripts, code I adopted from a Raspberry Pi Garage Door Opener, as well as several sample homebridge accessories/platforms I could find.

The new version finally supports 2 partitions.  I found a way to read the second partition state.  The config.json file now requires 2 alarm accessories.  These include the name and partition number.
If the second partition is not implemented, use "inactive" as its name so that it is not loaded into homebridge.
See the updated sample config.json file.

I have now added a switch control accessory to the Paradox platform to control connection status to the alarm.
This is useful if you want to connect to the alarm with other apps such as iParadox or the Web page.
You simply toggle the switch to control logged in status.

I have also added parameters to the config of the platform to tweak all the delays between commands and plugins.See the wiki for description of this and sample config.json file.

Please note:
The maximum password length is 16 characters.
The plugin  requires version 0.4.36 or higher.

