
const animsPath = './public/animations';

var fs = require('fs');
var vm = require('vm');

var Animator = require('./animator');
var Display = require('./display');

// Animations list management ==================================================
var animFiles = fs.readdirSync(animsPath);

var anims = [];
var animsMap = {};

for (var i = 0; i < animFiles.length; i++) {
    
    var tmpFileName = animFiles[i];
    var tmpData = fs.readFileSync(animsPath + '/' + tmpFileName);
    
    ParseAnim(JSON.parse(tmpData), tmpFileName);
}

function ParseAnim(data, filename) {
    try {
        var wrappedCode = "val = function() { " + data.code + " }"
        var script = vm.createScript(wrappedCode, filename);

        data.filename = filename;
        data.script = script;

        anims.push(filename);
        animsMap[filename] = data;
    } 
    catch (ex) {
        console.log(ex.stack);
    }
}

// Animation execution ==================================================

const FRAME_RATE = 30;
var intervalDelay = Math.max(Math.floor(1000/FRAME_RATE) - 5,10);

var display = new Display();

// create a buffer to hold our RGB data for streaming to clients
var buffer = [];
for (var i=0; i < display.MAX_LEDS * 3; i++) {
	buffer[i] = 255;
}

animator = new Animator(buffer, display);

var data = {
    available: function() { return false; },
    subscribe: function() {},
    unsubscribe: function() {}
};

var lastAnimIndex = 0;
function getNextAnim() {    
    
    if(lastAnimIndex >= anims.length)
        lastAnimIndex = 0;
     
    var animRef = anims[lastAnimIndex];
    
    lastAnimIndex++;
    
    return animsMap[animRef];
}

module.exports.setAnimation = function() {
         
    // Selezione animazione
    var tmpAnim = getNextAnim();
    
    // Impostazione animazione
    animator.next(tmpAnim, data);
    
    // Avvio
    animator.play();
    
    return tmpAnim;
}

module.exports.updateFrame = function() {
    
    // Aggiornamento frame animazione
	animator.update(data);
    
    return buffer;
}