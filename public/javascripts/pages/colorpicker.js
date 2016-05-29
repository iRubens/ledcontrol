$(document).ready(function() {
    $(".pick-a-color").ColorPickerSliders({
        color: '#000000',
        flat: true,
        swatches: false,
        order: {
            hsl: 2,
            preview: 1
        },
        onchange: function(s, e) {              
            // Chiamata impostazione colore
            $.post('api/drawer/color', e.rgba);  
        }
    });
});

$("#randomize").on("click", function () {
    // Chiamata randomizzazione colore
    $.get('api/drawer/random');
});

$("#rainbow").on("click", function () {
    // Chiamata arcobaleno colore
    $.get('api/drawer/rainbow');
});

$("#colorandom").on("click", function () {
    // Creazione colore
    var color = tinycolor.random();
    // Inizializzazione controlli con colori random
    $(".pick-a-color").trigger("colorpickersliders.updateColor", color.toHex());
});