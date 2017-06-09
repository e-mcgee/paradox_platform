# paradox_platform
Paradox alarm homebridge platform

This is my initial release of a paradox platform.  I have tested on my Paradox MG5050 v4.

The code is based on Tertiush Python scripts, as well as several sample homebridge accessories/platforms I could find.

My initial attempt used Python script based on Tertiush code and works well.  I ported the scripts to Node for this release and still needs some work.

Please note:
When homebridge is started the status of the Alarm and PGM's will not be correct.  Simply trigger the PGM's once and set the alarm status manually to match the current status of the alarm and all should be good from there.
The maximum password length is 16 characters.

