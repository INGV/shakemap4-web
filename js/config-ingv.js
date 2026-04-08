/**
 * INGV Environment Configuration
 *
 * INGV defaults are already defined in config-base.js.
 * This file is intentionally empty — it exists so that
 * SHAKEMAP_ENV=ingv works without a "profile not found" warning.
 */

Object.assign(config, {
    bBox: [
        { minlat: 36, maxlat: 72, minlon: -25, maxlon: 45 }
    ]
});
