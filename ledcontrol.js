
// Settings ===================================================
const ServerPort = 7890;
const ServerUri = '127.0.0.1';

const MaxPixels = 512;


// Initialization =============================================

// Socket management 
var Socket = require("net").Socket;
var socket = new Socket();
socket.setNoDelay();
socket.connect(ServerPort, ServerUri);

// Create an Open Pixel Control stream and pipe it to the server 
var createOPCStream = require("opc");
var stream = createOPCStream();
stream.pipe(socket);

// Leds Definition ============================================

// Create a strand representing connected lights 
var createStrand = require("opc/strand");
var strand = createStrand(MaxPixels);

var rows = [
    { s: strand.slice(0, 30), r: false, bo: 0, eo: 0 },
    { s: strand.slice(30, 60), r: true, bo: 0, eo: 0 },
    { s: strand.slice(64, 94), r: false, bo: 0, eo: 0 },
    { s: strand.slice(94, 124), r: true, bo: 0, eo: 0 },
    { s: strand.slice(128, 158), r: false, bo: 0, eo: 0 },
    { s: strand.slice(158, 188), r: true, bo: 0, eo: 0 },
    { s: strand.slice(192, 222), r: false, bo: 0, eo: 0 },
    { s: strand.slice(222, 252), r: true, bo: 0, eo: 0 },
    { s: strand.slice(256, 283), r: false, bo: 2, eo: 1 },
    { s: strand.slice(283, 313), r: true, bo: 0, eo: 0 }
];

// Methods ====================================================

module.exports.fillColor = function(r, g, b) {    
    animations['fillColor'].updateFrame(r, g, b);
}

module.exports.drawRandom = function() {
    animations['rowColor'].updateFrame();
}

module.exports.reset = function(r, g, b) {    
    strandReset();
}

// Animation management =======================================
var animanager = require('./animanager')

var animationInterval, animationFunction;

module.exports.animate = function(animName, fps) {
    
    strandReset();
    
    // Recupero animazione
    var tmpAnim = animations[animName];
    
    var tmpResult;
    
    if(tmpAnim)
    {
        // Inizializzazione animazioni
        tmpResult = tmpAnim.init();        
        
        // Avvio animazione
        animationFunction = tmpAnim.updateFrame;
        setAnimation(fps);
    }
    
    return tmpResult;
}

function setAnimation(fps) {
    // Calcolo intervallo
    var tmpInterval = 1000 / fps;
    
    // Avvio generazione frames
    animationInterval = setInterval(animationFunction, tmpInterval);
}

module.exports.updateFps = function(fps) {
    
    if(animationInterval)
    {
        clearInterval(animationInterval);
        
        setAnimation(fps);
    }
}

function strandReset() {
    
    if(animationInterval)
    {
        clearInterval(animationInterval);
        animationInterval = null;
        animationFunction = null;
    }    
    
    for (var i = 0; i < strand.length; i++) {       
        strand.setPixel(i, 0, 0, 0);
    }
         
    stream.writePixels(0, strand.buffer);
}

// Tools ===================================================================

function random(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

// Animations definition ==========================================

var animations = {
    
    'randAnim': {
        init: function() {
            return animanager.setAnimation();
        },
        updateFrame: function() {
            
            // Recupero array colori pixels
            var pixels = animanager.updateFrame();
            
            var pixelOffset = 0;
            
            // Aggiornamento stato pixels
            for (var i = 0; i < rows.length; i++) { 
                    
                var row = rows[i];        
                
                // Aggiunta offset iniziale
                pixelOffset += row.bo;
                
                if(!row.r) 
                {
                    for (var j = 0; j < row.s.length; j++) {            
                        
                        var r = pixels[pixelOffset * 3];
                        var g = pixels[pixelOffset * 3 + 1];
                        var b = pixels[pixelOffset * 3 + 2];
                        
                        rows[i].s.setPixel(j, r, g, b);            
                        
                        pixelOffset++;
                    }                     
                }
                else 
                {                                
                    for (var j = row.s.length - 1; j >= 0; j--)  
                    {  
                        var r = pixels[pixelOffset * 3];
                        var g = pixels[pixelOffset * 3 + 1];
                        var b = pixels[pixelOffset * 3 + 2];
                        
                        rows[i].s.setPixel(j, r, g, b);            
                        
                        pixelOffset++; 
                    }
                }   
                
                // Aggiunta offset finale
                pixelOffset += row.eo;     
            }
                
            stream.writePixels(0, strand.buffer);  
        }
    },
    
    'fillColor': {
        init: function() {},
        updateFrame: function(r, g, b) {
            // Direct color matrix fit ===============================            
            for (var i = 0; i < rows.length; i++) {       
                for (var j = 0; j < rows[i].s.length; j++) {
                    rows[i].s.setPixel(j, r, g, b);
                }            
            }
                
            stream.writePixels(0, strand.buffer);
        }
    },
    
    'rowColor' : {
        init: function() {},
        updateFrame: function() {
            // Random color (by row) ==================================        
            for (var i = 0; i < rows.length; i++) {
                var r = random(0, 256);
                var g = random(0, 256);
                var b = random(0, 256);
                
                for (var j = 0; j < rows[i].s.length; j++) {
                    rows[i].s.setPixel(j, r, g, b);
                }            
            }
            
            stream.writePixels(0, strand.buffer);
        }
    }
        
};
