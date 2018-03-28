var locks = require('locks');
var request = require('request');
var WebSocket = require('ws');
 

var Service, Characteristic;

var WSLog;
var WSConf;
var WSState;

const UNKNOWN = 0;
const ON = 2;
const OFF = 4;

var Services;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-jmri', 'JMRI', RailroadAccessory);
};

function RailroadAccessory(log, config) {
  this.log = log;
  WSLog = log;
  WSConf = config;
  this.host = config.host;
  this.name = config.name;
  this.EngineLongName = config.EngineLongName;
  this.EngineAddress = config.EngineAddress;
  this.Turnouts = config.Turnouts;
    
  this.state = {
    power: false,
    speed: 0,
    forward: true,
    mute: true,
    turnouts: false,
    cabLight: true,
    headLight: true,
    gumballLight: true,
  };
  
  WSState = this.state;
  
  this.mutex = locks.createMutex()
}

RailroadAccessory.prototype.getRailroad = function(value, callback) {
request({
    url: 'http://' + this.host + '/json/' + value['type'],
    method: 'POST',
    json: true,
    body: value,
  }, function(error, response, body) {
    if (error) {
      callback(error);
    } else if (response.statusCode != 500) {
      callback(null, body);
    } else {
      callback(new Error('HTTP response ' + response.statusCode + ': ' + JSON.stringify(body)));
    }
  });

};

RailroadAccessory.prototype.updateRailroad = function(value, callback) {
  request({
    url: 'http://' + this.host + '/json/' + value['type'],
    method: 'POST',
    json: true,
    body: value,
  }, function(error, response, body) {
   
 if (error) {
      callback(error);
    } else if (response.statusCode !== 500) {
      callback(null, body);
    } else {
      callback(new Error('HTTP response ' + response.statusCode + ': ' + JSON.stringify(body)));
    }
  });
};

RailroadAccessory.prototype.getTrainState = function(callback) {
  this.log('getting Train State ');
  var  update = {   "type": "power",   "data": {     "state": UNKNOWN } };

  this.getRailroad(update, (error, data) => {
    if (error) {
      callback(error);
    } else {
      this.log('Returning data from getRailroad of ' + JSON.stringify(data));
      if (data['data']['state'] == ON) {
        this.state.power = true;
      } else {
        this.state.power = false;
      }

     this.log('Returning ' + data['type'] + ' state of ' + data['data']['state'].toString());
     this.log('Turnouts are:' + this.state.turnouts);
      callback(null, this.state);
    }
  });
};

RailroadAccessory.prototype.identify = function(callback) {
  this.log("Identify requested!");
  this.updateRailroad({"type":"power","data":{"state":0}}, (error) => {
    if (error) {
      callback(error);
      return;
    }
    setTimeout(() => {
      this.updateRailroad({"type":"power","data":{"state":0}}, callback);
    }, 500);
  });
};

RailroadAccessory.prototype.getServices = function() {
  this.fanService = new Service.Fan();
  this.fanService.getCharacteristic(Characteristic.On)
    .on('get', this.getOn.bind(this))
    .on('set', this.setOn.bind(this));
  this.fanService.getCharacteristic(Characteristic.RotationSpeed)
    .on('get', this.getSpeed.bind(this))
    .on('set', this.setSpeed.bind(this));
  this.fanService.getCharacteristic(Characteristic.RotationDirection)
    .on('get', this.getDirection.bind(this))
    .on('set', this.setDirection.bind(this));

  this.speakerService = new Service.Switch();
  this.speakerService.displayName = 'Train Sound';
  this.speakerService.subtype = 'sound';
  this.speakerService.getCharacteristic(Characteristic.On)
    .on('get', this.getMute.bind(this))
    .on('set', this.setMute.bind(this));

  this.headLightService = new Service.Switch();
  this.headLightService.displayName = 'Train Headlight';
  this.headLightService.subtype = 'headLight';
  this.headLightService.getCharacteristic(Characteristic.On)
    .on('get', this.getHeadLight.bind(this))
    .on('set', this.setHeadLight.bind(this));

  this.gumballLightService = new Service.Switch();
  this.gumballLightService.displayName = 'Train Gumball light';
  this.gumballLightService.subtype = 'gumballLight';
  this.gumballLightService.getCharacteristic(Characteristic.On)
    .on('get', this.getGumballLight.bind(this))
    .on('set', this.setGumballLight.bind(this));

  this.cabLightService = new Service.Switch();
  this.cabLightService.displayName = 'Train Cab Light';
  this.cabLightService.subtype = 'cabLight';
  this.cabLightService.getCharacteristic(Characteristic.On)
    .on('get', this.getCabLight.bind(this))
    .on('set', this.setCabLight.bind(this));

  this.turnoutService = new Service.Switch();
  this.turnoutService.displayName = 'Turnouts';
  this.turnoutService.subtype = 'relay';
  
  this.turnoutService.getCharacteristic(Characteristic.On)
    .on('get', this.getTurnoutsTargetState.bind(this))
    .on('set', this.setTurnoutsTargetState.bind(this));	

  this.log('getting services ');
  
  Services = [this.speakerService, this.turnoutService, this.headLightService, this.gumballLightService, this.cabLightService, this.fanService];

  return [this.speakerService, this.turnoutService, this.headLightService, this.gumballLightService, this.cabLightService, this.fanService];
};

RailroadAccessory.prototype.getOn = function(callback) {
	this.log('getting on ');
	this.getTrainState(function(error, state) {
    callback(null,state && state.power);
  });
};

RailroadAccessory.prototype.setOn = function(value, callback) {
  var v = value || value === 1 ? 1 : 0;	
  var s = this.state['power'] ? 1 : 0;
  if (s !== v) {
    this.log('setting power to ' + v.toString());
    var state = {};
    state.power = v;
    
     this.log('setting Railroad Power ' + state.power.toString());
	 var update = {};
	  if (state['power'] == 1) {
	    update = {   "type": "power",   "data": {     "state": 2 } };
	  } else {
	    update = {   "type": "power",   "data": {     "state": 4 } };
	  }
	  
	  this.state.power = value;

	  sendTargetState(update);
	  callback(null, this.state);

  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.getSpeed = function(callback) {
  this.log('getting speed ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.speed);
  });
};

RailroadAccessory.prototype.setSpeed = function(value, callback) {
  if (this.state.speed != value) {
    this.log('setting speed to ' + value);
    this.state.speed = value;
  
    callback(null, this.state);
  } else {
    callback(null);
  }
};

RailroadAccessory.prototype.getDirection = function(callback) {
  this.log('getting forward ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.forward);
  });
};

RailroadAccessory.prototype.setDirection = function(value, callback) {
  if (this.state.forward != value) {
    this.log('setting forward to ' + value);
    this.state.forward = value;
  
    callback(null, this.state);
  } else {
    callback(null);
  }
};


RailroadAccessory.prototype.getMute = function(callback) {
  this.log('getting mute ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.mute);
  });
};

RailroadAccessory.prototype.setMute = function(value, callback) {
  if (this.state.mute != value) {
    this.log('setting mute to ' + value);
    this.state.mute = value;
	  callback(null, this.state);
  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.getHeadLight = function(callback) {
  this.log('getting HeadLight ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.headLight);
  });
};

RailroadAccessory.prototype.setHeadLight = function(value, callback) {
  if (this.state.headLight != value) {
    this.log('setting HeadLight to ' + value);
    this.state.headLight = value;
	  callback(null, this.state);
  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.getGumballLight = function(callback) {
  this.log('getting gumballLight ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.gumballLight);
  });
};

RailroadAccessory.prototype.setGumballLight = function(value, callback) {
  if (this.state.gumballLight != value) {
    this.log('setting gumballLight to ' + value);
    this.state.gumballLight = value;
	  callback(null, this.state);
  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.getCabLight = function(callback) {
  this.log('getting cabLight ');
  this.getTrainState(function(error, state) {
    callback(null, state && state.cabLight);
  });
};

RailroadAccessory.prototype.setCabLight = function(value, callback) {
  if (this.state.cabLight != value) {
    this.log('setting cabLight to ' + value);
    this.state.cabLight = value;
	  callback(null, this.state);
  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.setTurnoutsTargetState = function(value, callback) {
	
 var v = value || value === 1 ? 1 : 0;	
  var s = this.state['turnouts'] ? 1 : 0;
  if (s !== v) {
    this.log('setting turnouts to ' + v.toString());
    var state = {};
    state.turnouts = v;

	  var updateST1 = {};
	  if (state['turnouts'] == 1) {
	    updateST1 = {"type":"turnout","data":{"name":WSConf.Turnouts[0].id,"state":4}};
	  } else {
	    updateST1 = {"type":"turnout","data":{"name":WSConf.Turnouts[0].id,"state":2}};
	  }
	  
	  var updateST2 = {};
	  if (state['turnouts'] == 1) {
	    updateST2 = {"type":"turnout","data":{"name":WSConf.Turnouts[1].id,"state":4}};
	  } else {
	    updateST2 = {"type":"turnout","data":{"name":WSConf.Turnouts[1].id,"state":2}};
	  }
	  
    this.state.turnouts = value;
    
    sendTargetState(updateST1);
    setTimeout(() => {
    sendTargetState(updateST2);}, 1000);
    
	  callback(null, this.state);
  } else {
    callback(null);
  }
 
};

RailroadAccessory.prototype.getTurnoutsTargetState = function(callback) {
  this.log('getting turnouts target state');
  this.getTrainState(function(error, state) {
    callback(null, state && state.turnouts);
  });
};


var client = new WebSocket('ws://' + WSConf.host + '/json/');

var heartbeatDelay;	// Heartbeat timer delay
var heartbeat = null;	// Heartbeat timer
 
client.onerror = function() {
    WSLog('Connection Error');
};
 
client.onopen = function() {
    WSLog('WebSocket Client Connected');
 
    function sendThrottle() {
        if (client.readyState === client.OPEN) {
            var update = {};
    
			update = {"type":"throttle","data":{"throttle":WSConf.EngineLongName,"address":WSConf.EngineAddress,"speed":WSState.speed/100,"F0":WSState.headLight,"F5":WSState.gumballLight,"F6":WSState.cabLight,"F8":WSState.mute,"forward":WSState.forward}};
			WSLog("Sending " + JSON.stringify(update));
            client.send(JSON.stringify(update));
            setTimeout(sendThrottle, 2000);
        }
    }
    sendThrottle();
    
    var defineTurnout = {"type":"turnout","data":{"name":WSConf.Turnouts[0].id,"state":WSConf.Turnouts[0].state}};
	WSLog("Sending " + JSON.stringify(defineTurnout));
    client.send(JSON.stringify(defineTurnout));

    defineTurnout = {"type":"turnout","data":{"name":WSConf.Turnouts[1].id,"state":WSConf.Turnouts[1].state}};
	WSLog("Sending " + JSON.stringify(defineTurnout));
    client.send(JSON.stringify(defineTurnout));

};

function sendTargetState(update) {
  if (client.readyState === client.OPEN) {
		WSLog("Sending " + JSON.stringify(update));
        client.send(JSON.stringify(update));
    }
}

 
client.onclose = function() {
	if(heartbeat) 
	{
		clearInterval(heartbeat);
	}
    WSLog('WebSocket Client Closed');
};
 
client.onmessage = function(e) {
    if (typeof e.data === 'string') {
        WSLog("WebSocket Received: '" + e.data + "'");
        var result = JSON.parse(e.data);
        if(result.type == 'throttle')
        {
	        if(typeof result.data['speed'] != 'undefined')
	        {
		        WSState.speed = result.data['speed'] * 100;
		        Services[5].getCharacteristic(Characteristic.RotationSpeed).updateValue(WSState.speed);
	        }

	        if(typeof result.data['forward'] != 'undefined')
	        {
		        WSState.forward = result.data['forward'];
		        Services[5].getCharacteristic(Characteristic.RotationDirection).updateValue(WSState.forward);
	        }
	        
	        if(typeof result.data['F8'] != 'undefined')
	        {
		        WSState.mute = result.data['F8'];
		        Services[0].getCharacteristic(Characteristic.On).updateValue(WSState.mute);
	        }	        
	        
	        if(typeof result.data['F0'] != 'undefined')
	        {
		        WSState.headLight = result.data['F0'];
		        Services[2].getCharacteristic(Characteristic.On).updateValue(WSState.headLight);
	        }
	        
	        if(typeof result.data['F5'] != 'undefined')
	        {
		        WSState.gumballLight = result.data['F5'];
		        Services[3].getCharacteristic(Characteristic.On).updateValue(WSState.gumballLight);
	        }

	        if(typeof result.data['F6'] != 'undefined')
	        {
		        WSState.cabLight = result.data['F6'];
		        Services[4].getCharacteristic(Characteristic.On).updateValue(WSState.cabLight);
	        }

        }
        if(result.type == 'power')
        {
			switch(result.data['state']) 
			{
		        case 2:
        			WSState.power = true;
		            break;
		        case 4:
	  				WSState.power = false;
	            break;
    		}
    		
    		Services[5].getCharacteristic(Characteristic.On).updateValue(WSState.power);
        }
        if(result.type == 'turnout')
        {
			if (result.data['state'] == 4) 
			{
        		WSState.turnouts = true;
        		Services[1].getCharacteristic(Characteristic.On).updateValue(WSState.turnouts);
      		} 
	  		if (result.data['state'] == 2) 
      		{
	  			WSState.turnouts = false;
	  			Services[1].getCharacteristic(Characteristic.On).updateValue(WSState.turnouts);
      		}
        }

        if(result.type == 'hello')
        {
			heartbeatDelay = result.data['heartbeat'];
			var update = {};
    
			update = {"type":"ping"};
			if(heartbeat) 
			{
				clearInterval(heartbeat);
    		}
        	heartbeat = setInterval(function() {client.send(JSON.stringify(update));}, heartbeatDelay);
        }        
                
    }
};




