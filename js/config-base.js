/**
 * ShakeMap Base Configuration
 * Shared runtime state, constants, and default configuration (INGV defaults).
 * Environment-specific overrides are applied by config-env.js (loaded after this file).
 */

// Path constants
const DATA_DIR = 'data';
const EVENTS_JSON = 'events.json';

// ShakeMap namespace for global shared state
const ShakeMap = {
    allEvents: [],      // Flat list of all events
    map: null,          // Leaflet map instance
    currentLayers: {},  // Active map layers
    basemapLayers: {},  // Basemap tile layers
    activeDataId: null, // Active data directory ID (differs from event.id when Reported Intensity is active)
    activeBasemap: 'street' // Currently selected basemap
};

const config = {
    version: "v2.6.0-dev",
    githubLink: "https://github.com/INGV/shakemap4-web",
    disclaimerPage: './disclaimer-ingv.md',
    contributorsPage: './contributors-ingv.md',
    scientificBackgroundPage: './scientific-background-ingv.md',
    bannerImage: './images/shakemapit_banner.png',

    // HTML banner configuration (takes precedence over bannerImage)
    // NOTE: Environment profiles replace this entire object via Object.assign (no deep merge)
    banner: {
        left: {
            type: 'logo',
            src: './images/contributors-ingv/INGV_without_footer.png',
            alt: 'INGV Logo',
            maxHeight: '80px'
        },
        right: {
            type: 'text',
            //content: 'ISTITUTO NAZIONALE DI GEOFISICA E VULCANOLOGIA',
            content: 'ShakeMap-INGV',
            //style: 'bold uppercase'
            style: 'bold',
            fontSize: '2rem'
        },
        backgroundColor: '#ffffff'
    },

    enableReportedIntensity: false,

    historicalCutOff: "1980-01-01",

    bBox: [
        { minlat: 34, maxlat: 49, minlon: 5, maxlon: 20 }
    ],

    // Information menu links - easily add/remove/modify links
    // type: "external" (opens in new tab), "internal" (hash route), "separator" (visual divider)
    informationLinks: [
        {
            text: "INGV Website",
            link: "https://www.ingv.it",
            type: "external"
        },
        {
            text: "Shakemap USGS",
            link: "https://earthquake.usgs.gov/data/shakemap/",
            type: "external"
        },
        {
            text: "Scientific Background",
            link: "#scientific-background",
            type: "internal"
        },
        { type: "separator" },
        {
            text: "Contributors",
            link: "#contributors",
            type: "internal"
        },
        {
            text: "Disclaimer",
            link: "#disclaimer",
            type: "internal"
        }
    ]
};

window.config = config;
