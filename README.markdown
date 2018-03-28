# homebridge-jmri #

A Homebridge plugin for controlling a model railroad through [JMRI](http://jmri.org/).

## Requirements ##
* A DCC equipped model railroad.
* [JMRI](http://jmri.org/)
* Requires the [JMRI JSON Servlet](http://jmri.org/help/en/html/web/JsonServlet.shtml) websocket server to be running. 
* [JMRI](http://jmri.org/) requires a DCC "command station" to control the train state. I used a [SPROG DCC Programmer and Command Station](http://www.sprog.us.com). 

## Some background on this project ##

_I am not a model train guy._

### So, why do this? ###

* I enjoy creating software to make things do what you would not expect possible.
* I ran across the [Homebridge](https://github.com/nfarina/homebridge) project one day.
* I thought it would be interesting to control a model train with Siri.
	* _"Hey Siri, turn on my railroad."_
	* _"Hey Siri, set my railroad speed to 38%."_
	* _"Hey Siri, turn on the inside track."_ 
	* and _many_ other fun commands.

## Example Homebridge Configuration ##


```json
"accessories": [
         {
           "accessory": "JMRI",
           "name": "Railroad",
           "host": "jmri.local.net:12080",
           "EngineLongName": "Yellow Train",
		   "EngineAddress": "3",
           "Turnouts": [{"id":"ST1","state":0},{"id":"ST2","state":0}]
         }
       ]
```


