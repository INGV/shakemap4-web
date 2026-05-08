/**
 * INGV Environment Configuration
 *
 * INGV defaults are already defined in config-base.js.
 * This file is intentionally empty — it exists so that
 * SHAKEMAP_ENV=ingv works without a "profile not found" warning.
 */

Object.assign(config, {
    bBox: [
        { minlat: 35.0, maxlat: 49.0, minlon: 5.0, maxlon: 20.0 }
    ]
});
