# paradox_platform
Paradox alarm homebridge platform

This is my updated release of a paradox platform.  I have tested on my Paradox MG5050 v4 and IP100.
The code is based on Tertiush Python scripts, as well as several sample homebridge accessories/platforms I could find.

The Garage Door Opener code controlling the Paradox PGM's have been completely rewritten using code I adopted from a Raspberry Pi Garage Door Opener I found.
It is now more responsive and stable.  The state is now consistently updated.  I really struggled to fix this but it eventually turned out to have been a bug in homebridge.
It was fixed in the latest version (0.4.36) of homebridge. After updating my plugin works well.  The plugin now requires version 0.4.36 or higher.

I also fixed a problem in the status update loop that sometimes incorrectly updated the zone status.
I traced it to a problem that sometimes occur when the zone status is received but not the alarm status.
I built in a check to only update the homebridge status if both the alarm and zone statuses are received.
This means that there may be cycles where the status updates will be delayed longer than normal due to this issue.

I also fixed the initial state of the alarm and all zones.  They are read and updated directly after homebridge is started the first time.

The config.json includes the time it takes for the gate/garage door to close.
This is set using the "doorOpensInSeconds" parameter in seconds. See the updated sample config.json file.

Please note:
The maximum password length is 16 characters.
I have not yet implemented 2 partition code as I cannot test on my setup.  This is still in the backlog to do.

