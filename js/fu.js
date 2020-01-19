/**
 * Created by bjcullinan on 9/3/14.
 */

jQuery(document).ready(function () {

    var lastHue = 0;

    function HSVtoRGB(h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (h && s === undefined && v === undefined) {
            s = h.s, v = h.v, h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.floor(r * 255),
            g: Math.floor(g * 255),
            b: Math.floor(b * 255)
        };
    }

    function randomColor()
    {
        var color = Math.floor((Math.random()*225)+30);
        lastHue = (lastHue + color) % 256;
        var rgb = HSVtoRGB(lastHue/256, 200/256, 128/256);
        return rgb.r.toString(16) +
            rgb.g.toString(16) +
            rgb.b.toString(16);
    }

});
