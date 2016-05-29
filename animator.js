// this module is responsible for:
//	loading animations from the database / filesystem
//  executing animation timelines
//  populating the Buffer we're passed with color values
//  transitioning between animations

var Display = require('./display');
var vm = require('vm');
var fs = require('fs');
var TWEEN = require('./tween');
	//$ = require('jquery'),
var THREE = require('./public/javascripts/three-math.min')
var extend = require('extend');

var Animator = function(ledBuffer, display, options) {
	options = options || {
		transition: {
			durationMin: 2,
			durationMax: 2
		},
		animation: {
			durationMin: 30,
			durationMax: 60
		},
		hslOffset: {
			h: 0,
			s: 0,
			l: 0
		},
		rgbOffset: {
			r: 0,
			g: 0,
			b: 0
		},
		animations: {
			
		},
		transitions: {

		},
		colorBalance: {
			red: 1,
			green: 1,
			blue: 1
		},
		speedFactor: 1
	};
	this.init(ledBuffer,display,options);
};

extend(Animator.prototype, {
	init: function(ledBuffer, display, options)  {
		this.options = options;

		// store reference to LED buffer for population later
		this.buffer = ledBuffer;

		this.currentAnim = null;
		this.nextAnim = null;

		// read all animations and transitions and get them ready for usage
		this.display = display;
		this.loadTransitions();
	},
	loadTransitions: function() {
		var transitionModules = fs.readdirSync('./transitions'),
			filename;

		this.transitions = [];
		for (var i=0; i < transitionModules.length; i++) {
			this.transitions.push(require('./transitions/' + transitionModules[i]));
		}
	},
	setOptions: function(options, value) {
		if (typeof options === 'object') {
			extend(true, this.options, options);
		} else {
			this.options[options] = value;
		}
		if (options.speedFactor) {
			this.startTime = Date.now();
		}
	},
	play: function() {
		this.startTime = Date.now();
		this.display.play();
	},
	update: function(data) {
		var elapsed = Date.now() - this.startTime;
		// update tweens and display state
		this.display.update(this.startTime + (elapsed*this.options.speedFactor));

		// update current animation
		if (this.currentAnim) {
			this.currentAnim.onUpdate(this.display,data);
		}

		// copy led color values into buffer
		var display = this.display,
			ledBuffer = this.buffer,
			leds = display.leds;

		if (this.transition) {
			this.applyTransition(leds);
		}

		var index = 0, led = null;
		for (var i=0; i < leds.length; ++i) {
			
			index = i*3;
			led = leds[i];

			// if we've been given color modifications (hue, saturation or lightness shift...)
			// apply it here before we translate to buffer
			if (this.filter) {
				var c = led.clone();
				c.offsetHSL(this.filter.h, this.filter.s, this.filter.l);
				led = c;
			}
			
			if(led)
			{
				led.r *= this.options.colorBalance.red;
				led.g *= this.options.colorBalance.green;
				led.b *= this.options.colorBalance.blue;

				led.r = Math.min(1,led.r);
				led.g = Math.min(1,led.g);
				led.b = Math.min(1,led.b);
				led.r = Math.max(0,led.r);
				led.g = Math.max(0,led.g);
				led.b = Math.max(0,led.b);
				
				ledBuffer[index] = Math.round(led.r*255);
				ledBuffer[index+1] = Math.round(led.g*255);
				ledBuffer[index+2] = Math.round(led.b*255);
			}
		}

		// TODO: if current anim doesn't provide touch implementation then apply touchData.filters here

		// ledBuffer now ready for sending to clients
	},
	applyTransition: function(newValues) {
		if (!this.transition) {
			return newValues;
		}
		return this.transition.calculate(this.oldValues, newValues);
	},

	startTransition: function(Transition) {
		// copy current led values
		var oldValues = [];
		for (var i=0; i < this.display.leds.length; i++) {
			var led = this.display.leds[i];
			oldValues.push(led.clone());
		}
		this.oldValues = oldValues;

		// calculate random duration based on settings
		var min = this.options.transition.durationMin,
			max = Math.max(this.options.transition.durationMax,min),
			duration = 0;

		min = Math.min(min, max);

		console.log('debug: transition min ' + min + ' max ' + max);
		duration = Math.round((min + (Math.random() * (max-min)))*1000);

		// create transition object and start it tweening
		var transition = new Transition(duration); // override settings here

		// ensure we're at the start of the transition
		transition.complete = 0;

		// let it setup whatever it needs
		transition.setup(this.display, this.oldValues);

		//console.log('info: running transition for ' + transition.duration + 'ms');
		// create a tween to manage its lifetime
		var tween = this.display.tween(transition, {
				duration: transition.duration,
				repeat: 0,
				to: {
					complete: 1
				}
			});

		// handle listener for end of transition
		tween.onComplete(function() {
			// transition complete, clear it
			this.transition = null;
			//console.log('info: clearing transition');
		}.bind(this));

		tween.start();
		// store it so we know we're transitioning
		this.transition = transition;
		return transition;
	},
	pickTransition: function() {
		var idx = Math.floor(Math.random()*this.transitions.length);
		return this.transitions[idx];
	},
	checkAnimationRequired: function(anim) {
		/*		
		if (anim.required) {
			console.log('Checking : ' + JSON.stringify(anim.required));
			var required = anim.required;
			for (var variable in required) {
				if (!this.data.available(variable)) {
					return false;
				}
			}
			return true;
		}		
		*/

		return true;
	},
	unsubscribeVariables: function(anim) {
		/*
		if (anim.required) {
			var required = anim.required;
			for (var variable in required) {
				this.data.unsubscribe(variable);
			}
		}		
		*/
	},
	subscribeVariables: function(anim) {
		/*
		if (anim.required) {
			var required = anim.required;
			for (var variable in required) {
				this.data.subscribe(variable);
			}
		}
		*/
	},

	next: function(anim, data) {
		/*
		// check the anim, see if we can play it
		if (!this.checkAnimationRequired(anim)) {
			this.emit('animation-needs-data', anim);
			this.emit('animation-finished',this);
			return;
		}
		*/
		this.startTime = Date.now();
		this.display.cleanAnimation();

		// unsubscribe old animation
		if (this.anim) {
			this.unsubscribeVariables(this.anim);
		}
		
		try {
			this.currentAnim = anim.script.runInNewContext({
				Display: Display,
				Color: THREE.Color,
				THREE: THREE,
				TWEEN: TWEEN,
				//$: $,
				console: console,
				setTimeout: setTimeout,
				setInterval: setInterval,
				clearTimeout: clearTimeout,
				clearInterval: clearInterval
			})(); // execute the script to get the anim module all setup
		} catch (e) {
			console.log("Animation failed to parse properly : " + e.message);
			console.log("Trace : " + e.stack);
			//this.emit('animation-finished',this);
			return;
		}

		this.anim = anim;
		this.subscribeVariables(anim);

		var Transition = this.pickTransition();
		// setup transition
		var transition = this.startTransition(Transition);

		// initialize it
		this.currentAnim.init(this.display,this);


		// setup timeout to trigger next
		if (this.nextAnimTimeout) {
			clearTimeout(this.nextAnimTimeout);
			this.nextAnimTimeout = null;
		}

		// pick random animation duration
		var min = this.options.animation.durationMin,
			max = Math.max(this.options.animation.durationMax,min),
			duration = 0;

		min = Math.min(min, max);
		if (this.currentAnim.AnimDuration) {
			duration = this.currentAnim.AnimDuration;
		} else {
			duration = Math.round((min + (Math.random() * (max-min))) * 1000) + transition.duration;
		}

		console.log('info: running animation : ' + anim.name + ' for ' + duration + 'ms');
		var that = this;
		
		/*
		this.nextAnimTimeout = setTimeout(function() {
			that.emit('animation-finished',that);
		}, duration);
		this.emit('animation-change', anim.name);
		*/
		
		this.display.play();
	},
	clearShift: function() {
		this.filter = null;
	},
	setShift: function(h,s,l) {
		this.filter = {
			h: h,
			s: s,
			l: l
		};
	},
	setData: function(data) {
		this.data = data;
	}
});


module.exports = Animator;
