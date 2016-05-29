$(".anims").on("click", function (s, e) {    
    $.post('api/drawer/animate', {
        anim_name: this.id,
        fps: $('#fpsSetting').val()
    }).done(function(data) {
        var tmpDesc;
        
        try {
            tmpDesc = data.a.name;
        }
        finally {
            setAnimationDescription(tmpDesc);
        }
    });
});

function setAnimationDescription(text){
    
    if(text)
        text = 'Current Animation: ' + text;
    else
        text = '';
        
    $("#animDescription").text(text);
}

$("#re-setter").on("click", function () {
    $.get('api/drawer/reset');
    
    setAnimationDescription(null);
});

var slider = $('#fpsSetting').slider({
    tooltip_position:'bottom',
    scale: 'logarithmic'    
});


// Modifica rate fps
var tmpFpsTimeout, running;
slider.on('slideStop', function(slideEvt) {
    
    if(!running)
    {
        clearFpsTimeout();
        
        tmpFpsTimeout = setTimeout(function() {
            transmitFps(slideEvt.value);
        }, 2000);
    }
    
});

function transmitFps(FpsValue) {
    
    running = 1
    
    try {
        $.post('api/drawer/fps', {
            fps: FpsValue
        });
    }
    finally{
        clearFpsTimeout();
        running = null;        
    }
}

function clearFpsTimeout() {
    if(tmpFpsTimeout)
    {
        clearTimeout(tmpFpsTimeout);
        tmpFpsTimeout = null;
    }
}
