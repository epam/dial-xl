package com.epam.deltix.quantgrid.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class ColorUtil {

    public int hslColor(float h, float s, float l) {
        float r;
        float g;
        float b;

        if (s == 0f) {
            r = g = b = l; // achromatic
        } else {
            float q = l < 0.5f ? (l * (1f + s)) : (l + s - l * s);
            float p = 2f * l - q;
            r = hue2rgb(p, q, h + 1.0f / 3f);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1.0f / 3f);
        }
        return (Math.round(r * 255) << 16) | ((Math.round(g * 255)) << 8) | (Math.round(b * 255));
    }

    public float hue2rgb(float p, float q, float h) {
        if (h < 0f) {
            h += 1f;
        }

        if (h > 1f) {
            h -= 1f;
        }

        if (6f * h < 1f) {
            return p + ((q - p) * 6f * h);
        }

        if (2f * h < 1f) {
            return q;
        }

        if (3f * h < 2f) {
            return p + ((q - p) * 6f * ((2.0f / 3.0f) - h));
        }

        return p;
    }

    public double generateUniqueHue(long index) {
        long idx = index;

        double hue = 0d;
        double factor = 0.5d;

        while (idx != 0) {
            hue += (idx % 2) * factor;
            factor /= 2;
            idx /= 2;
        }

        return hue;
    }

    public int generateUniqueColor(long index) {
        double hue = generateUniqueHue(index);
        double saturation = 0.6d + 0.1d * (index % 4);
        return hslColor((float) hue, (float) saturation, (float) saturation);
    }
}
