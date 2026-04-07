/**
 * Map Module - Leaflet map integration
 * 
 * Handles the map visualization with layers, basemaps, and station markers.
 */

/**
 * Initialize the ShakeMap Leaflet map for an event
 * @param {Object} event - Event object
 */
async function initMap(event, options = {}) {
    if (ShakeMap.map) {
        ShakeMap.map.remove();
        ShakeMap.map = null;
    }

    let bounds = [[event.lat - 0.5, event.lon - 0.5], [event.lat + 0.5, event.lon + 0.5]];

    try {
        const infoRes = await fetch(`${DATA_DIR}/${event.id}/current/products/info.json`);
        if (infoRes.ok) {
            const info = await infoRes.json();
            const minLat = parseFloat(info.output.map_information.min.latitude);
            const minLon = parseFloat(info.output.map_information.min.longitude);
            const maxLat = parseFloat(info.output.map_information.max.latitude);
            const maxLon = parseFloat(info.output.map_information.max.longitude);
            bounds = [[minLat, minLon], [maxLat, maxLon]];
        }
    } catch (e) {
        console.warn('Could not load info.json for bounds', e);
    }

    ShakeMap.map = L.map('shakemap').fitBounds(bounds);

    // Create basemap layers
    ShakeMap.basemapLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        })
    };

    // Add default basemap (street)
    ShakeMap.basemapLayers.street.addTo(ShakeMap.map);

    // Custom epicenter star icon with pulsing animation
    const epicenterIcon = L.divIcon({
        className: 'epicenter-marker',
        html: `<div class="epicenter-container">
                <div class="epicenter-pulse"></div>
                <div class="epicenter-pulse pulse-2"></div>
                <img src="images/epicenterIconStar.png" class="epicenter-star">
              </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    L.marker([event.lat, event.lon], { icon: epicenterIcon }).addTo(ShakeMap.map).bindPopup('Epicenter');

    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';
    ShakeMap.currentLayers = {};

    // Add basemap radio buttons
    const basemapDiv = document.createElement('div');
    basemapDiv.style.marginBottom = '10px';
    basemapDiv.innerHTML = `
        <label style="display: block; margin-bottom: 8px;">
            <input type="radio" name="basemap" value="street" checked onchange="switchBasemap('street')">
            Street
        </label>
        <label style="display: block; margin-bottom: 8px;">
            <input type="radio" name="basemap" value="satellite" onchange="switchBasemap('satellite')">
            Satellite
        </label>
    `;
    layerList.appendChild(basemapDiv);

    // Add separator line between basemap and data layers
    const separator = document.createElement('hr');
    separator.style.margin = '15px 0';
    separator.style.border = '0';
    separator.style.borderTop = '1px solid var(--border-color)';
    layerList.appendChild(separator);

    // Data Layers Group Name
    const DATA_LAYER_GROUP = 'datalayer';
    const dataLayers = [
        { name: 'Intensity', file: 'cont_mi.json', color: '#ff0000' },
        { name: 'PGA', file: 'cont_pga.json', color: '#0000ff' },
        { name: 'PGV', file: 'cont_pgv.json', color: '#008000' },
        { name: 'PSA 0.3s', file: 'cont_psa0p3.json', color: '#ffa500' },
        { name: 'PSA 1.0s', file: 'cont_psa1p0.json', color: '#800080' },
        { name: 'PSA 3.0s', file: 'cont_psa3p0.json', color: '#a52a2a' }
    ];

    const addLayer = async (name, filename, color, inputType = 'checkbox', groupName = null, checked = false) => {
        try {
            const res = await fetch(`${DATA_DIR}/${event.id}/current/products/${filename}`);
            if (!res.ok) return;
            const geojson = await res.json();

            const layer = L.geoJSON(geojson, {
                style: function (feature) {
                    return {
                        color: feature.properties.color || color,
                        weight: feature.properties.weight || 2,
                        opacity: 1
                    };
                },
                onEachFeature: function (feature, layer) {
                    if (feature.properties && feature.properties.value) {
                        let label = name;
                        let val = feature.properties.value;
                        let unit = formatUnit(feature.properties.units || '');

                        // Fix for Intensity label and unit
                        if (name.includes('Intensity')) {
                            label = 'Intensity';
                            if (unit.toLowerCase() === 'mmi') {
                                unit = '';
                            }
                        }

                        let content = `${label}: ${val} ${unit}`;
                        layer.bindPopup(content.trim());
                    }
                }
            });

            if (checked) layer.addTo(ShakeMap.map);
            ShakeMap.currentLayers[name] = layer;

            const div = document.createElement('div');
            // If radio, use onchange="switchDataLayer(...)", if checkbox calculate toggle
            let onChangeCall = '';
            if (inputType === 'radio') {
                onChangeCall = `switchDataLayer('${name}')`;
            } else {
                onChangeCall = `toggleLayer('${name}')`;
            }

            div.innerHTML = `
                <label>
                    <input type="${inputType}" ${groupName ? `name="${groupName}"` : ''} ${checked ? 'checked' : ''} onchange="${onChangeCall}">
                    ${name}
                </label>
            `;
            layerList.appendChild(div);

        } catch (e) {
            console.warn(`Failed to load layer ${name}`, e);
        }
    };

    // Load all data layers
    // The first one is checked by default
    for (let i = 0; i < dataLayers.length; i++) {
        const item = dataLayers[i];
        const isFirst = (i === 0);
        await addLayer(item.name, item.file, item.color, 'radio', DATA_LAYER_GROUP, isFirst);
    }

    // Add separator line after data layers
    const separator2 = document.createElement('hr');
    separator2.style.margin = '15px 0';
    separator2.style.border = '0';
    separator2.style.borderTop = '1px solid var(--border-color)';
    layerList.appendChild(separator2);

    try {
        const res = await fetch(`${DATA_DIR}/${event.id}/current/products/stationlist.json`);
        if (res.ok) {
            const geojson = await res.json();

            // --- 1. Macroseismic Stations Layer ---
            const macroseismicLayer = L.geoJSON(geojson, {
                filter: function (feature) {
                    return feature.properties.station_type === 'macroseismic';
                },
                pointToLayer: function (feature, latlng) {
                    // Color based on intensity using intColors_USGS
                    let stationColorIndex = Math.round(feature.properties.intensity);
                    let color = intColors_USGS[stationColorIndex] || 'black';

                    return L.circleMarker(latlng, {
                        radius: 4,
                        fillColor: color,
                        color: 'black',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 1
                    });
                },
                onEachFeature: function (feature, layer) {
                    bindStationPopup(feature, layer);
                }
            });

            ShakeMap.currentLayers['Macroseismic'] = macroseismicLayer;
            // Add Checkbox for Macroseismic (Show Reported Intensity)
            // Only if there are features
            if (macroseismicLayer.getLayers().length > 0) {
                const autoEnable = options.enableMacroseismic === true;
                if (autoEnable) {
                    macroseismicLayer.addTo(ShakeMap.map);
                }
                const div = document.createElement('div');
                div.innerHTML = `
                    <label>
                        <input type="checkbox" ${autoEnable ? 'checked' : ''} onchange="toggleLayer('Macroseismic')">
                        Show Reported Intensity
                    </label>
                `;
                layerList.appendChild(div);
            }


            // --- 2. Seismic Stations Layer ---
            const seismicLayer = L.geoJSON(geojson, {
                filter: function (feature) {
                    return feature.properties.station_type !== 'macroseismic';
                },
                pointToLayer: function (feature, latlng) {
                    let stationColorIndex = 1;

                    // If intensity < 5 use PGA, else use PGV from mmi_from_pgm if available
                    let useComplexLogic = false;

                    if (feature.properties.mmi_from_pgm && Array.isArray(feature.properties.mmi_from_pgm)) {
                        try {
                            if (feature.properties.intensity < 5) {
                                const result = feature.properties.mmi_from_pgm.find(obj => obj.name === 'pga');
                                if (result) {
                                    stationColorIndex = Math.round(result.value);
                                    useComplexLogic = true;
                                }
                            } else {
                                const result = feature.properties.mmi_from_pgm.find(obj => obj.name === 'pgv');
                                if (result) {
                                    stationColorIndex = Math.round(result.value);
                                    useComplexLogic = true;
                                }
                            }
                        } catch (err) {
                            console.warn('Error in station color logic', err);
                        }
                    }

                    if (!useComplexLogic) {
                        // Fallback to simple intensity
                        stationColorIndex = Math.round(feature.properties.intensity || 1);
                    }

                    const fillColor = intColors_USGS[stationColorIndex] || '#FFFFFF';

                    // Triangle marker
                    const triangleIcon = L.divIcon({
                        className: 'triangle-marker',
                        html: `<div style="width: 14px; height: 12px; position: relative; background-color: rgba(255, 255, 255, 0.01);">
                            <div style="
                                width: 0;
                                height: 0;
                                border-left: 7px solid transparent;
                                border-right: 7px solid transparent;
                                border-bottom: 12px solid #000;
                                position: absolute;
                                left: 0;
                                top: 0;
                            ">
                                <div style="
                                    width: 0;
                                    height: 0;
                                    border-left: 6px solid transparent;
                                    border-right: 6px solid transparent;
                                    border-bottom: 10px solid ${fillColor};
                                    position: absolute;
                                    left: -6px;
                                    top: 2px;
                                "></div>
                            </div>
                        </div>`,
                        iconSize: [14, 12],
                        iconAnchor: [7, 12]
                    });

                    return L.marker(latlng, { icon: triangleIcon });
                },
                onEachFeature: function (feature, layer) {
                    bindStationPopup(feature, layer);
                }
            });

            ShakeMap.currentLayers['Stations'] = seismicLayer;
            const divSt = document.createElement('div');
            divSt.innerHTML = `
                <label>
                    <input type="checkbox" onchange="toggleLayer('Stations')">
                    Show Stations
                </label>
            `;
            layerList.appendChild(divSt);

        }
    } catch (e) {
        console.warn('Failed to load stations', e);
    }

    // --- 3. Fault/Rupture Layer ---
    try {
        const ruptureRes = await fetch(`${DATA_DIR}/${event.id}/current/products/rupture.json`);
        if (ruptureRes.ok) {
            const ruptureJson = await ruptureRes.json();

            // Logic check: "Show fault" only if there is more than one point
            let isValidFault = false;
            if (ruptureJson.features && ruptureJson.features.length > 0) {
                const geometry = ruptureJson.features[0].geometry;
                if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates)) {
                    if (Array.isArray(geometry.coordinates[0])) {
                        isValidFault = true;
                    }
                }
            }

            if (isValidFault) {
                const ruptureLayer = L.geoJSON(ruptureJson, {
                    style: {
                        color: 'black',
                        weight: 3,
                        opacity: 1
                    }
                });

                ShakeMap.currentLayers['Fault'] = ruptureLayer;

                const divFault = document.createElement('div');
                divFault.innerHTML = `
                    <label>
                        <input type="checkbox" onchange="toggleLayer('Fault')">
                        Show fault
                    </label>
                `;
                layerList.appendChild(divFault);
            }
        }
    } catch (e) {
        console.warn('Failed to load rupture.json', e);
    }

    // Add Legend Control
    let legendControl = null;
    let legendExists = false;
    try {
        const legendRes = await fetch(`${DATA_DIR}/${event.id}/current/products/mmi_legend.png`, { method: 'HEAD' });
        if (legendRes.ok) {
            // Create custom control for legend
            L.Control.Legend = L.Control.extend({
                onAdd: function (map) {
                    const div = L.DomUtil.create('div', 'legend-control');
                    div.innerHTML = `<img src="${DATA_DIR}/${event.id}/current/products/mmi_legend.png" alt="MMI Legend" style="max-width: 700px; display: block; background: white; padding: 5px; border: 2px solid rgba(0,0,0,0.2); border-radius: 4px;">`;
                    return div;
                },
                onRemove: function (map) {
                    // Nothing to do here
                }
            });

            L.control.legend = function (opts) {
                return new L.Control.Legend(opts);
            }

            legendControl = L.control.legend({ position: 'bottomleft' });
            legendControl.addTo(ShakeMap.map);
            ShakeMap.currentLayers['Legend'] = legendControl;
            legendExists = true;
        }
    } catch (e) {
        console.warn('Failed to load legend', e);
    }

    // Always add checkbox control
    const div = document.createElement('div');
    div.innerHTML = `
        <label>
            <input type="checkbox" ${legendExists ? 'checked' : ''} onchange="toggleLayer('Legend')">
            Show Legend
        </label>
    `;
    layerList.appendChild(div);
}

/**
 * Helper function for station popups
 */
function bindStationPopup(feature, layer) {
    if (feature.properties) {
        const props = feature.properties;
        const code = props.code || props.id || 'Unknown';
        const network = props.network || props.name?.split('.')[0] || 'N/A';
        const stationName = code.includes('.') ? code.split('.').slice(1).join('.') : code;

        const formatNumber = (val, decimals) => {
            return (val !== null && val !== undefined && !isNaN(val)) ? Number(val).toFixed(decimals) : 'N/A';
        };

        const popupContent = `
            <div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6;">
                <strong>Station:</strong> ${stationName}<br>
                <strong>Network:</strong> ${network}<br>
                <strong>Type:</strong> ${props.station_type || 'N/A'}<br>
                <strong>Distance:</strong> ${formatNumber(props.distance, 3)} km<br>
                <strong>Intensity:</strong> ${formatNumber(props.intensity, 1)}<br>
                <strong>PGA:</strong> ${formatNumber(props.pga, 4)}<br>
                <strong>PGV:</strong> ${formatNumber(props.pgv, 4)}<br>
                <strong>Vs30:</strong> ${props.vs30 && !isNaN(props.vs30) ? Math.round(props.vs30) : 'N/A'} m/s
            </div>
        `;
        layer.bindPopup(popupContent);
    }
}

/**
 * Switch between data layers (radio button behavior)
 */
window.switchDataLayer = function (selectedName) {
    const dataKeys = [
        'Intensity', 'PGA', 'PGV',
        'PSA 0.3s', 'PSA 1.0s', 'PSA 3.0s'
    ];

    dataKeys.forEach(name => {
        if (ShakeMap.currentLayers[name]) {
            if (name === selectedName) {
                if (!ShakeMap.map.hasLayer(ShakeMap.currentLayers[name])) {
                    ShakeMap.map.addLayer(ShakeMap.currentLayers[name]);
                }
            } else {
                if (ShakeMap.map.hasLayer(ShakeMap.currentLayers[name])) {
                    ShakeMap.map.removeLayer(ShakeMap.currentLayers[name]);
                }
            }
        }
    });
};

/**
 * Toggle a layer on/off (checkbox behavior)
 */
window.toggleLayer = function (name) {
    if (ShakeMap.currentLayers[name]) {
        // Check if it's a Control (like legend) or a Layer
        if (ShakeMap.currentLayers[name] instanceof L.Control) {
            // Toggle control
            const container = ShakeMap.currentLayers[name].getContainer();
            if (container && container.parentNode) {
                ShakeMap.map.removeControl(ShakeMap.currentLayers[name]);
            } else {
                ShakeMap.currentLayers[name].addTo(ShakeMap.map);
            }
        } else {
            // Toggle regular layer
            if (ShakeMap.map.hasLayer(ShakeMap.currentLayers[name])) {
                ShakeMap.map.removeLayer(ShakeMap.currentLayers[name]);
            } else {
                ShakeMap.map.addLayer(ShakeMap.currentLayers[name]);
            }
        }
    }
};

/**
 * Switch between basemap layers
 */
window.switchBasemap = function (basemapType) {
    // Remove all basemap layers
    Object.values(ShakeMap.basemapLayers).forEach(layer => {
        if (ShakeMap.map.hasLayer(layer)) {
            ShakeMap.map.removeLayer(layer);
        }
    });

    // Add selected basemap layer
    if (ShakeMap.basemapLayers[basemapType]) {
        ShakeMap.basemapLayers[basemapType].addTo(ShakeMap.map);
    }
};

// Export to global scope
window.initMap = initMap;
window.bindStationPopup = bindStationPopup;
