/**
 * EU Environment Configuration
 * Applied when SHAKEMAP_ENV=eu
 */

Object.assign(config, {
    disclaimerPage: './disclaimer-eu.md',
    contributorsPage: './contributors-eu.md',
    scientificBackgroundPage: './scientific-background-eu.md',
    bannerImage: './images/shakemapeu_banner.png',
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
