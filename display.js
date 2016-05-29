// this module creates a virtual display object that the animations will be running on
// it handles lighting calcuations and various other stuff and ultimately is responsible for
// setting colors on the buffer array
// this object should provide the same interfaces as the display.js on the animation editor

const ledConfig = {
	"rows": 10,
	"cols": 30
};

var TWEEN = require('./tween')
var THREE = require('./public/javascripts/three-math.min')
var Color = THREE.Color
var Canvas = require('canvas')

// Blend modes from http://www.venture-ware.com/kevin/coding/lets-learn-math-photoshop-blend-modes/
// many thanks to Kevin Jensen!
var BlendModes = {
	normal: function(top, bottom) {
		return top;
	},
	darken: function(top, bottom) {
		return (top > bottom) ? bottom : top;
	},
	multiply: function(top, bottom) {
		return (top * bottom);
	},
	colorBurn: function(top, bottom) {
		if ( top === 0 ) return 0; // We don't want to divide by zero
		var col = ( 1 - ( 1 - bottom ) / top );
		return ( col < 0 ) ? 0 : col;
	},
	linearBurn: function(top, bottom) {
		return (top + bottom < 1.0) ? 0 : top + bottom - 1.0;
	},
	lighten: function(top, bottom) {
		return (top > bottom) ? top : bottom;
	},
	screen: function(blend, base) {
		return 1 - (( 1 - base) * (1-blend));
	},
	colorDodge: function(top, bottom) {
		if (top === 1) return 1;
		var col = bottom / (1-top);
		return (col > 1) ? 1 : col;
	},
	linearDodge: function(top, bottom) {
		return (top + bottom > 1) ? 1 : top + bottom;
	},
	overlay: function(top, bottom) {
		return (bottom < 0.5) ? (2*top*bottom) : ((1 - 2 * (1 - top) ) * (1-bottom));
	},
	softLight: function(top, bottom) {
		return ( ( 1 - top ) * top * bottom + top * ( 1 - ( 1 - top ) * ( 1 - bottom ) ) );
	},
	hardLight: function(top, bottom) {
		if (bottom < 0.5) {
			return 2*top*bottom;
		} else {
			return (1-2 * (1 - top) * (1 - bottom));
		}
	},
	vividLight: function(top, bottom) {
		if (top < 0.5) {
			return BlendModes.colorBurn(2*top, bottom);
		}
		return BlendModes.colorDodge(2 * (top - 0.5), bottom);
	},
	linearLight: function(top, bottom) {
		if (top < 0.5) {
			return BlendModes.linearBurn(2*top, bottom);
		}
		return BlendModes.linearDodge(2* (top-0.5), bottom);
	},
	pinLight: function(top, bottom) {
		return (top < 0.5) ? BlendModes.darken(2*top, bottom) : BlendModes.lighten(2*(top-0.5), bottom);
	},
	hardMix: function(blend, base) {
		return (blend < 1 - base) ? 0 : 1;
	},
	difference: function(top, bottom) {
		return Math.abs(top - bottom);
	},
	exclusion: function(top, bottom) {
		return top + bottom - 2 * top * bottom;
	},
	subtract: function(blend, base) {
		return Math.max(base - blend,0);
	},
	divide: function(blend, base) {
		if (blend === 0) {
			return 0;
		}
		return base / blend;
	},
	wrap: function(top, bottom) {
		bottom += top;
		bottom = bottom % 1;
		return bottom;
	}
};
// aliases
BlendModes.add = BlendModes.linearDodge;

var Display = function() {

	this.config = ledConfig;
	this.rows = ledConfig.rows;
	this.cols = ledConfig.cols;
	this.ratio = this.cols/this.rows;
	this.MAX_LEDS = this.rows*this.cols;

	this.leds = [];
	
	for (var i=0; i < this.MAX_LEDS; i++) {
		var c =  new Color(0x0);
		this.leds.push(c);
	}

	this.loadFonts();
	this.initPalettes();

	this.reset();
};

Display.prototype = {

	playing: false,
	tweens: [],

	play: function() {
		// start all tweens from 0
		this.playing = true;
		TWEEN.removeAll();
		for (var i=0; i < this.tweens.length; i++) {
			TWEEN.add(this.tweens[i]);
			this.tweens[i].start();
		}
	},
	stop: function() {
		// clear all tweens from Tween object
		this.playing = false;
		TWEEN.removeAll();
	},
	isPlaying: function() {
		return this.playing;
	},
	update: function(time) {
		try {
			TWEEN.update(time);
		} catch (e) {
			console.log("Failed to update tweens : " + e.message);
			console.log("Trace : " + e.stack);
		}
	},

	defaultFont: 'data:image/png;base64,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',
	defaultFontTileMap: {
	    tileWidth: 10,
	    tileHeight: 10,
	    tileBorder: 0
	},

	loadFonts: function() {
		this.fonts = {};
		this.fonts['default'] = { image: this.loadImage(this.defaultFont), map: this.defaultFontTileMap, mask: new Color(0xFF00FF), text: new Color(0xFFFFFF) };
	},

	getFont: function(name) {
		return this.fonts[name];
	},

	loadFont: function(name, dataUri, tileMap, maskColor, textColor) {
		this.fonts[name] = { image: this.loadImage(dataUri), map: tileMap, mask: maskColor, text: textColor };
	},
	
	// palettes
	palettes: {},
	initPalettes: function() {
		this.palettes = {};
		this.createPalette('rainbow', [
			0xFF0000, 0xD52A00, 0xAB5500, 0xAB7F00,
    		0xABAB00, 0x56D500, 0x00FF00, 0x00D52A,
    		0x00AB55, 0x0056AA, 0x0000FF, 0x2A00D5,
    		0x5500AB, 0x7F0081, 0xAB0055, 0xD5002B
    	]);
		this.createPalette('rainbow-striped', [
		    0xFF0000, 0x000000, 0xAB5500, 0x000000,
		    0xABAB00, 0x000000, 0x00FF00, 0x000000,
		    0x00AB55, 0x000000, 0x0000FF, 0x000000,
		    0x5500AB, 0x000000, 0xAB0055, 0x000000
		]);
		this.createPalette('heat', [
		    0x330000, 0x660000, 0x990000, 0xCC0000, 0xFF0000,
		    0xFF3300, 0xFF6600, 0xFF9900, 0xFFCC00, 0xFFFF00,
		    0xFFFF33, 0xFFFF66, 0xFFFF99, 0xFFFFCC, 0xFFFFFF
    	]);
    	this.createPalette('party' [
    		0x5500AB, 0x84007C, 0xB5004B, 0xE5001B,
		    0xE81700, 0xB84700, 0xAB7700, 0xABAB00,
		    0xAB5500, 0xDD2200, 0xF2000E, 0xC2003E,
		    0x8F0071, 0x5F00A1, 0x2F00D0, 0x0007F9
	    ]);

	},
	createPalette: function(name, colors) {
		// confirm color values are colors
		if (!Array.isArray(colors)) {
			return false;
		}

		for (var i=0; i < colors.length; i++) {
			var c = colors[i];
			if (typeof c === "number") {
				c = new Color(c);
			}
			colors[i] = c;
		}

		this.palettes[name] = colors;
	},
	
	randomizePalettes: function() {
		this.createPalette('random1', [
            new Color().setHSL(Math.random(), 1, 0.25),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 0.5, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5)
        ]);
        this.createPalette('random2', [
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            new Color().setHSL(Math.random(), Math.random(), 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), Math.random(), 0.5),
            
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0)
        ]);
        this.createPalette('random3', [
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0),
            
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 0, 0),
            new Color().setHSL(Math.random(), 0, 0)
        ]);
        this.createPalette('random4', [
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), Math.random(), Math.random()*0.5),
            
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, Math.random()*0.5),
            
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, 0),
            new Color().setHSL(Math.random(), 1, 0.5),
            new Color().setHSL(Math.random(), 1, Math.random()*0.5)
        ]);
	},
	getRandomPalette: function() {
		var result;
	    var count = 0;
	    for (var name in this.palettes) {
	        if (Math.random() < 1/++count) {
	           result = name;
	        }
	    }
	    return result;
	},
	getPaletteColor: function(name, value, interpolate) {
		if (!this.palettes[name]) {
			return this.getPaletteColor('rainbow', value);
		}

		var palette = this.palettes[name];
		// clamp value to 0-1 range with wraparound
		if (value < 0) {
			value = 0;
		}
		value = value % 1;
		// scale value to number of indices and round to closest
		var scaledValue = (palette.length) * value;

		var closestIndex = Math.round(scaledValue);
		if (closestIndex >= palette.length) {
			closestIndex = 0;
		}

		if (!interpolate) {
			return palette[closestIndex].clone();
		}

		// for interpolate get lower and upper colors
		var lowerIndex = Math.floor(scaledValue),
			upperIndex = Math.ceil(scaledValue),
			alpha = (scaledValue - lowerIndex);

		if (upperIndex >= palette.length) {
			upperIndex = 0;
		}

		var lowerColor = palette[lowerIndex],
			upperColor = palette[upperIndex];

		if(lowerColor)
			return lowerColor.clone().lerp(upperColor, alpha);
		else
			return new Color(0);
	},

	drawLine: function(x0,y0, x1, y1, color) {
	    var steep = Math.abs(y1 - y0) > Math.abs(x1 - x0),
	        tmp;
	    if (steep) {
	        tmp = x0;
	        x0 = y0;
	        y0 = tmp;
	        tmp = x1;
	        x1 = y1;
	        y1 = tmp;
	    }
	    if (x0 > x1) {
	        tmp = x0;
	        x0 = x1;
	        x1 = tmp;
	        tmp = y0;
	        y0 = y1;
	        y1 = tmp;
	    }

	    var display = this;

		var plot = function(x, y, c, color) {
			var index = x + (y*display.cols);
		    if (index > display.leds.length || index < 0) {
		        return;
		    }
		    //plot the pixel at (x, y) with brightness c (where 0 ≤ c ≤ 1)
		    var hsl = color.getHSL();
		    hsl.l = c*0.5;
		    var col = new Color();
		    col.setHSL(hsl.h, hsl.s, hsl.l);
		    
		    display.setColor(index, col, 'add');
		};

		var ipart = function(x) {
		    return ~~x;
		};
	 
		var round = function(x) {
		    return ipart(x + 0.5);
		};
	 
		var fpart = function(x) {
		    return x%1;
		};
		 
		var rfpart = function(x) {
		    return 1 - fpart(x);
		};

	    var dx = x1 - x0,
	        dy = y1 - y0;
	        
	    var gradient = dy/dx;
	    
	    var xend = Math.round(x0),
	        yend = y0 + gradient * (xend - x0),
	        xgap = rfpart(x0 + 0.5),
	        xpxl1 = xend,   //this will be used in the main loop
	        ypxl1 = ipart(yend);
	        
	     if (steep) {
	         plot(ypxl1,   xpxl1, rfpart(yend) * xgap, color);
	         plot(ypxl1+1, xpxl1,  fpart(yend) * xgap, color);
	     } else {
	         plot(xpxl1, ypxl1  , rfpart(yend) * xgap, color);
	         plot(xpxl1, ypxl1+1,  fpart(yend) * xgap, color);
	     }
	     
	     var intery = yend + gradient; // first y-intersection for the main loop
	 
	     // handle second endpoint
	     xend = Math.round(x1);
	     yend = y1 + gradient * (xend - x1);
	     xgap = fpart(x1 + 0.5);
	     var xpxl2 = xend, //this will be used in the main loop
	        ypxl2 = ipart(yend);
	        
	     if (steep) {
	         plot(ypxl2  , xpxl2, rfpart(yend) * xgap, color);
	         plot(ypxl2+1, xpxl2,  fpart(yend) * xgap, color);
	     } else {
	         plot(xpxl2, ypxl2,  rfpart(yend) * xgap, color);
	         plot(xpxl2, ypxl2+1, fpart(yend) * xgap, color);
	     }
	 
	     // main loop
	 
	     for (var x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
	         if (steep) {
	             plot(ipart(intery)  , x, rfpart(intery), color);
	             plot(ipart(intery)+1, x,  fpart(intery), color);
	         } else {
	             plot(x, ipart (intery),  rfpart(intery), color);
	             plot(x, ipart (intery)+1, fpart(intery), color);
	         }
	         intery = intery + gradient;
	     }
	},

	drawString: function (str,x,y,colors,fontName) {
		if (!fontName) {
			fontName = 'default';
		}
	    var originalX = x;
	    var fontMap = this.fonts[fontName].map;
	    for (var i=0; i < str.length; i++) {
	        if (str[i]=='\r') {
	            continue;
	        }
	        if (str[i]=='\n') {
	            y += fontMap.tileHeight;
	            x = originalX;
	            continue;
	        }
	        var c = colors;
	        if (!c) {
	            c = new Color(0xFFFFFF);
	        }
	        if (Array.isArray(colors)) {
	            c = colors[i%colors.length];
	        }
	        this.drawLetter(str[i], x,y,c,fontName);
	        x += fontMap.tileWidth;
	    }
	},
	drawLetter: function(letter,x,y,c,fontName) {
		if (!fontName) {
			fontName = 'default';
		}
	    var charCode = letter.charCodeAt(0);
	    var tileX = charCode % 16,
	        tileY = Math.floor(charCode / 16);

	    var font = this.fonts[fontName];

	    this.drawImageTile(font.image, x,y-font.map.tileHeight, tileX,tileY, font.map,
	        {
	            mask: font.mask,
	            replace: [
	                [font.text, c]
	            ]
	        }
	    );
	},
	loadImage: function(dataUri) {

		var image = new Canvas.Image;
		image.src = dataUri;


		var canvas = new Canvas(image.width, image.height);
		var context = canvas.getContext('2d');

		try {
		    context.drawImage(image, 0, 0);
		    var raw = context.getImageData(
		      0, 0, image.width, image.height
		    );
		    return { data: raw.data, height: image.height, width: image.width };
		} catch (e) {
			return { data: [], height: 0, width: 0 };
		}
	},

	isMasked: function(c, colors) {
		if (colors && colors.mask) {
			for (var i=0; i < colors.mask.length; i++) {
				if (colors.mask[i].equals(c)) {
					return true;
				}
			}
		}
		return false;
	},

	replaceColor: function(c, colors) {
		if (colors && colors.replace) {
			for (var i=0; i < colors.replace.length; i++) {
				var replacePair = colors.replace[i];
				if (Array.isArray(replacePair) && replacePair.length >= 2) {
					if (replacePair[0].equals(c)) {
						return new Color().set(replacePair[1]);
					}

				}
			}	
		}
		return c;
	},

	preprocessMask: function(mask) {
		if (!mask) {
			return null;
		}
		// if its just a single color then its a simple straight mask
		if (mask instanceof Color) {
			mask = {
				mask: [mask],
				replace: null
			};
		}
		// if its got a mask, but only one color make into an array
		if (mask.mask instanceof Color) {
			mask.mask = [mask.mask];
		}
		if (Array.isArray(mask.replace) && mask.replace.length > 0) {
			if ( mask.replace[0] instanceof Color ) {
				// its not an array of arrays, so make it so
				mask.replace = [
					mask.replace
				];
			}
		}
		return mask;
	},

	getImagePixel: function(image, x,y) {
		var imageIndex = (x*4) + ((y)*image.width*4);
		var c = new Color();
				c.setRGB(image.data[imageIndex]/255,image.data[imageIndex+1]/255,image.data[imageIndex+2]/255);
		return c;
	},
	drawImage: function(image, x, y, mask, buffer, width, height) {
		if (!buffer) {
			buffer = this.leds;
			width = this.cols;
			height = this.rows;
		}

		mask = this.preprocessMask(mask);

		// draw the image data into the buffer at specified position
		for (var imageX = 0; imageX < image.width; imageX++) {
			for (var imageY = 0; imageY < image.height; imageY++) {

				var tmpX = x+imageX, tmpY = y+imageY;
				if (tmpX >= width || tmpY >= height ||
					tmpX < 0 || tmpY < 0) {
					continue;
				}

				var index = tmpX + tmpY * width;
				var imageIndex = (imageX*4) + ((imageY)*image.width*4);

				var c = new Color();
				c.setRGB(image.data[imageIndex]/255,image.data[imageIndex+1]/255,image.data[imageIndex+2]/255);

				if (this.isMasked(c, mask)) {
					continue;
				}
				c = this.replaceColor(c, mask);

				buffer[index] = c;
			}
		}
	},

	drawImageRegion: function(image, x, y, regionX, regionY, regionWidth, regionHeight, mask, buffer, width, height) {

		if (!buffer) {
			buffer = this.leds;
			width = this.cols;
			height = this.rows;
		}

		mask = this.preprocessMask(mask);

		for (var imageX = regionX; imageX < image.width && imageX < regionX+regionWidth; imageX++) {
			for (var imageY = regionY; imageY < image.height && imageY < regionY+regionHeight; imageY++) {

				var tmpX = x+(imageX-regionX), tmpY = y+(imageY-regionY);
				if (tmpX >= width || tmpY >= height ||
					tmpX < 0 || tmpY < 0) {
					continue;
				}

				var index = tmpX + (tmpY) * width;
				var imageIndex = ((imageX)*4) + ((imageY)*image.width*4);

				var c = new Color();
				c.setRGB(image.data[imageIndex]/255,image.data[imageIndex+1]/255,image.data[imageIndex+2]/255);

				if (this.isMasked(c, mask)) {
					continue;
				}

				c = this.replaceColor(c, mask);

				buffer[index] = c;
			}
		}
	},
	drawImageRegionMap: function(image, x, y, regionIndex, regionMap, mask, buffer, width, height) {
		var regionX, regionY, regionWidth, regionHeight;

		// lookup index in array or key in map
		regionEntry = regionMap[regionIndex];

		regionX = regionEntry.x;
		regionY = regionEntry.y;
		regionWidth = regionEntry.width;
		regionHeight = regionEntry.height;

		this.drawImageRegion(image,x,y,regionX,regionY,regionWidth,regionheight,mask,buffer,width,height);
	},

	drawImageTile: function(image, x,y, tileX, tileY, tileMap, mask, buffer, width, height) {
		// tilemap has width and height of each tile, an offset for all tiles globally, and then we just compute the values on the fly
		// this only works for regular tilesets, but is useful for fonts
		var regionX = tileMap.offsetX || 0,
			regionY = tileMap.offsetY || 0,
			regionWidth = tileMap.tileWidth,
			regionHeight = tileMap.tileHeight,
			tileBorder = tileMap.tileBorder || 0;

		regionX += tileX * (tileMap.tileWidth+tileBorder);
		regionY += tileY * (tileMap.tileHeight+tileBorder);

		this.drawImageRegion(image,x,y,regionX,regionY,regionWidth,regionHeight,mask,buffer,width,height);
	},
	cleanAnimation: function() {
		// prepare the display for the next animation

		// stop all our tweens
		TWEEN.removeAll();
		this.tweens = [];
	},

	tween: function(obj, params) {
		var t = new TWEEN.Tween(obj)
			.to(params.to, params.duration);

		if (params.repeat!==undefined) {
			t.repeat(params.repeat);
		}
		if (params.delay!==undefined) {
			t.delay(params.delay);
		}
		if (params.yoyo!==undefined) {
			t.yoyo(params.yoyo);
		}
		if (params.easing!==undefined) {
			t.easing(params.easing);
		}
		this.tweens.push(t);
		return t;
	},

	_setColorBlend: function(led, color, blendMode) {
		if (!BlendModes[blendMode]) {
			blendMode = 'normal';
		}
		var blendFunc = BlendModes[blendMode],
			r = blendFunc(color.r, led.r),
			g = blendFunc(color.g, led.g),
			b = blendFunc(color.b, led.b),
			c = new Color();
		c.r = r;
		c.g = g;
		c.b = b;
		return c;
	},
	clear: function(color) {
		var r = 0, g = 0, b = 0;
		if (color) {
			r = color.r, g = color.g, b = color.b;
		}
		for (var i=0; i < this.leds.length; ++i) {
			this.leds[i].setRGB(r,g,b);
		}
	},
	setColor: function(leds, color, blendMode) {
		if (!blendMode) {
			blendMode = 'normal';
		}
		// led can be array
		if (!Array.isArray(leds)) {
			leds = [leds];
		}
		// set all leds in array to color
		for (var i=0; i < leds.length; ++i) {
			// look up array index in leds
			var ledIndex = leds[i],
				led = this.leds[ledIndex];
			if (!led) {
				this.leds[ledIndex] = new Color(0);
				continue;
			}
			//this.leds[ledIndex] = color.clone();
			if (led.r===undefined) {
				// not a proper color object, best set it to black
				led = new Color(0);
			}
			if (color===undefined || color.r===undefined) {
				color = new Color(0);
			}
			this.leds[ledIndex] = this._setColorBlend(led, color, blendMode);
		}
	},
	getColor: function(leds,useOriginal) {
		// leds can be array
		if (!Array.isArray(leds)) {
			leds = [leds];
		}
		// set all leds in array to color
		var colors = [];
		for (var i=0; i < leds.length; ++i) {
			// look up array index in leds
			var ledIndex = leds[i];
			if (useOriginal) {
				colors.push(this.leds[ledIndex]);
			} else {
				colors.push(this.leds[ledIndex].clone());
			}
		}
		return colors;
	},


	reset: function() {
		// setup arrays of indices
		
		// initialise LED states to off
		TWEEN.removeAll();

		this.tweens = [];
	}
};

// map some shortcuts to make life easier
Display.Color = Color;

module.exports = Display;
