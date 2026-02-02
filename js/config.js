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
    basemapLayers: {}   // Basemap tile layers
};

const config = {
    version: "v2.0.0",
    githubLink: "https://github.com/INGV/shakemap4-web",
    logosPath: "images/shakemapit_partners.jpg",
    //logosPath: "images/shakemapeu_partners.jpg",
    bannerImage: './images/shakemapit_banner.png',
    //bannerImage: './images/shakemapeu_banner.png',

    historicalCutOff: "1980-01-01",

    disclaimer: {
        it: "Le mappe di scuotimento (shakemaps) pubblicate in questo sito sono determinate automaticamente e forniscono stime preliminari ed incomplete dello scuotimento causato dal terremoto. Le mappe vengono aggiornate man mano che ulteriori dati registrati dalle stazioni sismiche diventano disponibili. Le stazioni appartengono alla Rete Sismica Nazionale Italiana o ad altre reti locali, regionali e nazionali di altre istituzioni italiane o estere, come indicato dai loghi sottostanti. Le mappe non hanno alcun valore ufficiale e INGV declina qualsiasi responsabilità sull'utilizzo che viene fatto da un uso improprio delle informazioni in esse contenute. Questo sito utilizza la nuova configurazione per l'Italia del software ShakeMap descritta in <a href='#'>Scientific Background</a>. Il sito della versione precedente è raggiungibile al <a href='#'>seguente link</a> e sarà aggiornato fino al 31/12/2020. A partire dal 6 marzo 2023, le mappe di scuotimento vengono calcolate utilizzando le relazioni tra i parametri di scuotimento e l'intensità macrosismica di <a href='#'>Olivieri et al. (2022)</a>.",
        en: "The maps of ground shaking - ShakeMap - published in this web site have been determined only for research purposes and provide preliminary and incomplete estimates of the experienced shaking. They have been determined automatically from the instrumentally recorded data by the seismic stations and are updated as more data become available. The stations belong to the Italian National Seismic Network or to other local, regional and national networks of other Italian or foreign institutions, as indicated by the logos below. The maps do not have any official value and INGV declines any responsibility from an improper use of the information therein represented. This site shows the shakemaps calculated using the configuration described in the <a href='#'>Scientific Background</a>. The previous version of the site is available at at the <a href='#'>following link</a> and it will be updated until 12/31/2020. Since March 6, 2023, the ShakeMaps have been generated using the ground motion intensity conversion equations (GMICE) of <a href='#'>Olivieri et al. (2022)</a>."
    },
    // Regions removed as per user request
    bBox: [
        { minlat: 35, maxlat: 49, minlon: 5, maxlon: 20 }
    ]
};

window.config = config;
