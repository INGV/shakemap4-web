/**
 * ShakeMap Configuration
 * Global configuration and shared state namespace
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
    activeDataId: null  // Active data directory ID (differs from event.id when Reported Intensity is active)
};

// Information menu links - easily add/remove/modify links
// type: "external" (opens in new tab), "internal" (hash route), "separator" (visual divider)
const informationLinks = [
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
    //{
    //    text: "ShakeMap Config. GitHub Repository",
    //    link: "https://github.com/INGV/shakemap-conf-eu",
    //    type: "external"
    //},
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
];

const config = {
    version: "v2.0.0",
    githubLink: "https://github.com/INGV/shakemap4-web",
    disclaimerPage: './disclaimer-ingv.md',
    contributorsPage: './contributors-ingv.md',
    scientificBackgroundPage: './scientific-background-ingv.md',
    bannerImage: './images/shakemapit_banner.png',
    //bannerImage: './images/shakemapeu_banner.png',

    enableReportedIntensity: false,

    historicalCutOff: "1980-01-01",

    // Regions removed as per user request
    bBox: [
        { minlat: 35, maxlat: 49, minlon: 5, maxlon: 20 }
    //    { minlat: -90, maxlat: 90, minlon: -180, maxlon: 180 }
    ]
};

window.config = config;
