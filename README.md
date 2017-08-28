# paradox_platform
Paradox alarm homebridge platform

This is my updated release of a paradox platform.  I have tested on my Paradox MG5050 v4 and IP100.

I have not yet implemented 2 partition code as I cannot test on my setup.  This is still in the backlog to do.

The Garage Door Opener code controlling the Paradox PGM's have been completely rewritten using code I adopted from a Raspberry Pi Garage Door Opener I found.
It is now more responsive and stable.  It still needs some work to consistently set the final door state.

The new release requires an update of the config.json the include the time it takes for the gate/garage door to close.
This is set using the "doorOpensInSeconds" parameter in seconds. See the updated sample config.json file.

The code is based on Tertiush Python scripts, as well as several sample homebridge accessories/platforms I could find.

My initial attempt used Python script based on Tertiush code and works well.  I ported the scripts to Node for this release and still needs some work.

Please note:
When homebridge is started the status of the Alarm and PGM's will not be correct.  Simply trigger the PGM's once and set the alarm status manually to match the current status of the alarm and all should be good from there.
The maximum password length is 16 characters.

