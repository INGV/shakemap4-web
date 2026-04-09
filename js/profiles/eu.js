/**
 * EU Environment Configuration
 * Applied when SHAKEMAP_ENV=eu
 */

Object.assign(config, {
    disclaimerPage: './disclaimer-eu.md',
    contributorsPage: './contributors-eu.md',
    scientificBackgroundPage: './scientific-background-eu.md',
    bannerImage: './images/shakemapeu_banner.png',
    banner: {
        left: {
            type: 'text',
            content: 'ShakeMap-EU',
            style: 'bold',
            fontSize: '2rem'
        },
        right: {
            type: 'logos-grid',
            columns: 3,
            logos: [
                { src: './images/contributors-eu/RISE.png', alt: 'RISE' },
                { src: './images/contributors-eu/Geo-INQUIRE.jpg', alt: 'Geo-INQUIRE' },
                { src: './images/contributors-eu/Sera.jpg', alt: 'SERA' },
                { src: './images/contributors-eu/DTGEO.png', alt: 'DT-GEO' },
                { src: './images/contributors-eu/EPOS_IP_TCS_S.png', alt: 'EPOS' },
                { src: './images/contributors-eu/orfeus.png', alt: 'Orfeus' },
                { src: './images/contributors-eu/EMSC.png', alt: 'EMSC' },
                { src: './images/contributors-eu/efehr.png', alt: 'EFEHR' }
            ]
        },
        backgroundColor: '#ffffff'
    },
    enableReportedIntensity: true,

    bBox: [
        { minlat: -90, maxlat: 90, minlon: -180, maxlon: 180 }
    ],

    informationLinks: [
        {
            text: "EFEHR Website",
            link: "https://www.efehr.org",
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
});
