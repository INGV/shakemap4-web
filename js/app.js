// App Logic

const DATA_DIR = 'data';
const EVENTS_JSON = 'events.json';

let allEvents = []; // Flat list of events
let map = null;
let currentLayers = {};
let basemapLayers = {}; // Store basemap tile layers

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // Navigation Listeners
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '';
    });
    document.getElementById('nav-archive').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'archive';
    });

    // Filter Listeners
    document.getElementById('period-filter').addEventListener('change', () => {
        populateYearFilter();
        applyArchiveFilters();
    });
    document.getElementById('year-filter').addEventListener('change', applyArchiveFilters);
    document.getElementById('mag-filter').addEventListener('change', applyArchiveFilters);

    // Handle routing
    window.addEventListener('hashchange', handleRoute);

    // Load Data
    await loadEvents();

    // Initial Route
    handleRoute();
}

async function loadEvents() {
    try {
        const response = await fetch(EVENTS_JSON);
        if (!response.ok) throw new Error('Failed to load events.json');

        const data = await response.json();

        // Flatten data
        allEvents = [];
        for (const year in data) {
            for (const month in data[year]) {
                data[year][month].forEach(event => {
                    allEvents.push(event);
                });
            }
        }

        // Apply mandatory bBox filter if defined
        if (typeof config !== 'undefined' && config.bBox && Array.isArray(config.bBox) && config.bBox.length > 0) {
            allEvents = allEvents.filter(event => {
                const lat = parseFloat(event.lat);
                const lon = parseFloat(event.lon);

                if (isNaN(lat) || isNaN(lon)) return false; // Exclude invalid data

                return config.bBox.some(box =>
                    lat >= box.minlat && lat <= box.maxlat &&
                    lon >= box.minlon && lon <= box.maxlon
                );
            });
        }

        // Sort by time descending
        allEvents.sort((a, b) => {
            const dateA = new Date(a.year, a.month - 1, a.day, a.h, a.m, a.s);
            const dateB = new Date(b.year, b.month - 1, b.day, b.h, b.m, b.s);
            return dateB - dateA;
        });

        // Populate Year Filter
        populateYearFilter();



    } catch (error) {
        console.error(error);
        alert('Error loading events data.');
    }
}

function populateYearFilter() {
    const select = document.getElementById('year-filter');
    const period = document.getElementById('period-filter').value;

    // Clear existing options except "All"
    select.innerHTML = '<option value="">All</option>';

    if (period === 'historical') {
        // If historical, we only show "All" (which is already there)
        return;
    }

    // Modern events: Filter valid years
    let relevantEvents = allEvents;
    if (typeof config !== 'undefined' && config.historicalCutOff) {
        const parts = config.historicalCutOff.split('-'); // e.g. "2000-01-01"
        if (parts.length === 3) {
            const cutOffYear = parseInt(parts[0]);
            const cutOffMonth = parseInt(parts[1]) - 1;
            const cutOffDay = parseInt(parts[2]);
            const cutOffDate = new Date(cutOffYear, cutOffMonth, cutOffDay);

            relevantEvents = allEvents.filter(e => {
                const eventDate = new Date(e.year, e.month - 1, e.day, e.h, e.m, e.s);
                return eventDate >= cutOffDate;
            });
        }
    }

    const years = [...new Set(relevantEvents.map(e => e.year))].sort().reverse();
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    });

    // Set the most recent year as default if available
    if (years.length > 0) {
        select.value = years[0];
    }
}



function handleRoute() {
    const hash = window.location.hash;

    // Hide all views
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-archive').classList.add('hidden');
    document.getElementById('view-details').classList.add('hidden');

    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    if (!hash || hash === '#') {
        document.getElementById('nav-home').classList.add('active');
        showHome();
    } else if (hash === '#archive') {
        document.getElementById('nav-archive').classList.add('active');
        showArchive();
    } else if (hash.startsWith('#event/')) {
        const id = hash.split('/')[1];
        showEventDetails(id);
    } else {
        showHome();
    }
}

window.switchTab = function (tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    // Activate selected button
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Load content if needed
    const hash = window.location.hash;
    const id = hash.split('/')[1];
    if (tabName === 'products') {
        showProducts(id);
    } else if (tabName === 'metadata') {
        showMetadata(id);
    } else if (tabName === 'analysis') {
        // Load Analysis View
        if (typeof loadAnalysisView === 'function') {
            const event = allEvents.find(e => e.id == id);
            loadAnalysisView(id, event ? event.year : null);
        }
    } else if (tabName === 'stations') {
        // Load Station List
        if (typeof initStationList === 'function') {
            initStationList(id);
        }
    } else if (tabName === 'static') {
        // Load Static View
        initStaticView(id);
    } else if (tabName === 'map') {
        // Map resize fix
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }
};

function showHome() {
    const view = document.getElementById('view-home');
    view.classList.remove('hidden');

    // Show latest 10 events
    const latestEvents = allEvents.slice(0, 12); // Show 12 for better grid alignment
    renderCards(latestEvents, 'latest-events-cards');
}

function renderCards(events, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">No events found.</p>';
        return;
    }

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.onclick = () => window.location.hash = `event/${event.id}`;

        const date = new Date(event.year, event.month - 1, event.day, event.h, event.m, event.s);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = `${String(event.h).padStart(2, '0')}:${String(event.m).padStart(2, '0')}`;

        // Determine color based on magnitude (optional visual cue)
        const magColor = event.mag >= 6 ? '#d32f2f' : (event.mag >= 4 ? 'var(--accent-color)' : 'var(--text-secondary)');

        card.innerHTML = `
            <div class="event-card-body">
                <div class="event-intro">
                    <div class="event-card-header">
                        <div class="event-magnitude" style="color: ${magColor}">${parseFloat(event.mag).toFixed(1)}</div>
                         <div class="event-date">
                            <div>${dateStr}</div>
                            <div>${timeStr}</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div class="event-location">${event.description}</div>
                        <div class="event-depth" style="white-space: nowrap; margin-left: 10px; color: var(--text-secondary); font-size: 0.9rem;"><i class="fas fa-layer-group"></i> ${Math.round(event.depth)} km</div>
                    </div>
                    <div class="event-footer">
                        <div class="event-id">eventid: ${event.id}</div>
                        <div class="event-more">More Info <i class="fas fa-arrow-right"></i></div>
                    </div>
                </div>
                <div class="event-image">
                     <img src="${DATA_DIR}/${event.id}/current/products/intensity.jpg" alt="ShakeMap Intensity" onerror="this.style.display='none'">
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function showArchive() {
    const view = document.getElementById('view-archive');
    view.classList.remove('hidden');

    // Show all events initially (or filtered)
    applyArchiveFilters();
}

function applyArchiveFilters() {
    const year = document.getElementById('year-filter').value;
    const minMag = parseFloat(document.getElementById('mag-filter').value);

    let filtered = allEvents;

    if (year) {
        filtered = filtered.filter(e => e.year == year);
    }

    if (!isNaN(minMag)) {
        filtered = filtered.filter(e => e.mag >= minMag);
    }



    // Apply Historical/Modern Filter
    if (typeof config !== 'undefined' && config.historicalCutOff) {
        const period = document.getElementById('period-filter').value;

        // Parse cutoff date
        const parts = config.historicalCutOff.split('-');
        if (parts.length === 3) {
            const cutOffYear = parseInt(parts[0]);
            const cutOffMonth = parseInt(parts[1]) - 1; // Months are 0-indexed
            const cutOffDay = parseInt(parts[2]);
            const cutOffDate = new Date(cutOffYear, cutOffMonth, cutOffDay);

            filtered = filtered.filter(e => {
                const eventDate = new Date(e.year, e.month - 1, e.day, e.h, e.m, e.s);
                if (period === 'modern') {
                    return eventDate >= cutOffDate;
                } else {
                    return eventDate < cutOffDate;
                }
            });
        }
    }

    renderCards(filtered, 'archive-events-cards');
}


async function showEventDetails(id) {
    const view = document.getElementById('view-details');
    view.classList.remove('hidden');

    const event = allEvents.find(e => e.id == id);
    if (!event) {
        view.innerHTML = '<div class="error">Event not found.</div>';
        return;
    }

    // Populate Meta
    document.getElementById('event-title').textContent = `Event: ${event.description}`;
    const dateStr = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')} ${String(event.h).padStart(2, '0')}:${String(event.m).padStart(2, '0')}:${String(event.s).padStart(2, '0')}`;

    document.getElementById('event-meta').innerHTML = `
        <div class="meta-item"><label>Time (UTC)</label><span>${dateStr}</span></div>
        <div class="meta-item"><label>Magnitude</label><span>${parseFloat(event.mag).toFixed(1)}</span></div>
        <div class="meta-item"><label>Depth</label><span>${Math.round(event.depth)} km</span></div>
        <div class="meta-item"><label>Lat/Lon</label><span>${parseFloat(event.lat).toFixed(2)}, ${parseFloat(event.lon).toFixed(2)}</span></div>
        <div class="meta-item"><label>Event ID</label><span>${event.id}</span></div>
    `;

    // Reset to Map tab
    switchTab('map');

    // Initialize Map
    initMap(event);
}

async function initMap(event) {
    if (map) {
        map.remove();
        map = null;
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

    map = L.map('shakemap').fitBounds(bounds);

    // Create basemap layers
    basemapLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        })
    };

    // Add default basemap (street)
    basemapLayers.street.addTo(map);

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

    L.marker([event.lat, event.lon], { icon: epicenterIcon }).addTo(map).bindPopup('Epicenter');

    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';
    currentLayers = {};

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
                        // usage of formatUnit
                        layer.bindPopup(`${name}: ${feature.properties.value} ${formatUnit(feature.properties.units || '')}`);
                    }
                }
            });

            if (checked) layer.addTo(map);
            currentLayers[name] = layer;

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
                    // Logic from user requirement:
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

            currentLayers['Macroseismic'] = macroseismicLayer;
            // Add Checkbox for Macroseismic (Show DYFI observations)
            // Only if there are features
            if (macroseismicLayer.getLayers().length > 0) {
                const div = document.createElement('div');
                div.innerHTML = `
                    <label>
                        <input type="checkbox" onchange="toggleLayer('Macroseismic')">
                        Show DYFI observations
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
                    // Logic from user requirement:
                    let stationColorIndex = 1;

                    // If intensity < 5 use PGA, else use PGV from mmi_from_pgm if available
                    // Fallback to direct intensity if complex logic fails or properties missing
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

            currentLayers['Stations'] = seismicLayer;
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

            // Logic check: "Show fault" only if there is more than one point (i.e., not just a scalar point)
            // Check first feature's geometry coordinates
            let isValidFault = false;
            if (ruptureJson.features && ruptureJson.features.length > 0) {
                const geometry = ruptureJson.features[0].geometry;
                if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates)) {
                    // Check if coordinates[0] is an Array (LineString/Polygon) vs Number (Point)
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

                currentLayers['Fault'] = ruptureLayer;

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
    // Helper for popups
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
            legendControl.addTo(map);
            currentLayers['Legend'] = legendControl;
            legendExists = true;
        }
    } catch (e) {
        console.warn('Failed to load legend', e);
    }

    // Always add checkbox control (User requirement: must be always visible)
    const div = document.createElement('div');
    div.innerHTML = `
        <label>
            <input type="checkbox" ${legendExists ? 'checked' : ''} onchange="toggleLayer('Legend')">
            Show Legend
        </label>
    `;
    layerList.appendChild(div);
}


window.switchDataLayer = function (selectedName) {
    // Defined data keys that are part of the radio group
    const dataKeys = [
        'Intensity', 'PGA', 'PGV',
        'PSA 0.3s', 'PSA 1.0s', 'PSA 3.0s'
    ];

    dataKeys.forEach(name => {
        if (currentLayers[name]) {
            if (name === selectedName) {
                if (!map.hasLayer(currentLayers[name])) {
                    map.addLayer(currentLayers[name]);
                }
            } else {
                if (map.hasLayer(currentLayers[name])) {
                    map.removeLayer(currentLayers[name]);
                }
            }
        }
    });
};

window.toggleLayer = function (name) {
    if (currentLayers[name]) {
        // Check if it's a Control (like legend) or a Layer
        if (currentLayers[name] instanceof L.Control) {
            // Toggle control
            const container = currentLayers[name].getContainer();
            if (container && container.parentNode) {
                map.removeControl(currentLayers[name]);
            } else {
                currentLayers[name].addTo(map);
            }
        } else {
            // Toggle regular layer
            if (map.hasLayer(currentLayers[name])) {
                map.removeLayer(currentLayers[name]);
            } else {
                map.addLayer(currentLayers[name]);
            }
        }
    }
};

window.switchBasemap = function (basemapType) {
    // Remove all basemap layers
    Object.values(basemapLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });

    // Add selected basemap layer
    if (basemapLayers[basemapType]) {
        basemapLayers[basemapType].addTo(map);
    }
};

async function showProducts(id) {
    const container = document.getElementById('products-list');
    container.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        // Load static products list
        const res = await fetch('productsListToProcess.json');
        if (!res.ok) throw new Error('Products list not found');

        const allProducts = await res.json();



        // Check which files exist and group by category
        const categories = {};
        const existenceChecks = [];

        // Create promises for all file existence checks
        for (const product of allProducts) {
            const fileUrl = `${DATA_DIR}/${id}/current/products/${product.name}`;

            // Use HEAD request to check if file exists
            const checkPromise = fetch(fileUrl, { method: 'HEAD' })
                .then(checkRes => {
                    if (checkRes.ok) {
                        // File exists, add to category
                        if (!categories[product.cat]) {
                            categories[product.cat] = [];
                        }
                        categories[product.cat].push({
                            name: product.name,
                            desc: product.desc
                        });
                    }
                })
                .catch(() => {
                    // File doesn't exist or error, skip silently
                });

            existenceChecks.push(checkPromise);
        }

        // Wait for all checks to complete
        await Promise.all(existenceChecks);

        // Clear loading message
        container.innerHTML = '';

        // Check if any products were found
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p>No products available for this event</p>';
            return;
        }

        // Define category order
        const order = [
            "Peak Ground Motion Maps",
            "Contours and shape files",
            "Rasters and grid",
            "Regressions",
            "Other files"
        ];

        // Render ordered categories
        order.forEach(catName => {
            if (categories[catName]) {
                renderCategory(container, id, catName, categories[catName]);
                delete categories[catName];
            }
        });

        // Render remaining categories (if any)
        for (const catName in categories) {
            renderCategory(container, id, catName, categories[catName]);
        }

    } catch (e) {
        console.warn('Failed to load products', e);
        container.innerHTML = '<p>Could not load product list.</p>';
    }
}

// Helper function to determine if file is viewable in browser
function isViewableInBrowser(filename) {
    const viewableExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',  // Images
        'pdf',                                        // PDF
        'json', 'geojson',                           // JSON
        'txt', 'xml', 'html', 'css', 'js',          // Text files
        'csv'                                         // CSV
    ];
    const ext = filename.split('.').pop().toLowerCase();
    return viewableExtensions.includes(ext);
}

function renderCategory(container, id, catName, items) {
    const section = document.createElement('div');
    section.className = 'product-category';

    const header = document.createElement('h3');
    header.className = 'category-header collapsed'; // Closed by default
    header.innerHTML = `<span>${catName}</span> <i class="fas fa-chevron-down"></i>`;

    const content = document.createElement('div');
    content.className = 'category-body hidden'; // Hidden by default

    const table = document.createElement('table');
    table.className = 'product-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>File name</th>
                <th>Description</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');
    items.forEach(item => {
        const tr = document.createElement('tr');
        const fileUrl = `${DATA_DIR}/${id}/current/products/${item.name}`;
        const isViewable = isViewableInBrowser(item.name);

        // Build action buttons
        let actionButtons = '';
        if (isViewable) {
            actionButtons += `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn-view" title="Preview in browser"><i class="fas fa-eye"></i></a> `;
        }
        actionButtons += `<a href="${fileUrl}" download class="btn-download" title="Download"><i class="fas fa-download"></i></a>`;

        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.desc}</td>
            <td style="text-align:right;">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });

    content.appendChild(table);

    // Collapsible logic
    header.addEventListener('click', () => {
        content.classList.toggle('hidden');
        header.classList.toggle('collapsed');
    });

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
}

async function showMetadata(id) {
    const container = document.getElementById('metadata-content');
    container.innerHTML = '<div class="loading">Loading metadata...</div>';

    try {
        const res = await fetch(`${DATA_DIR}/${id}/current/products/info.json`);
        if (!res.ok) throw new Error('Metadata not found');

        const data = await res.json();
        container.innerHTML = '';

        // Define specific order
        const order = ['input', 'output', 'processing', 'multigmpe', 'strec'];

        // Render ordered sections
        order.forEach(key => {
            if (data[key]) {
                renderMetadataSection(container, key, data[key]);
                delete data[key];
            }
        });

        // Render remaining sections
        for (const key in data) {
            renderMetadataSection(container, key, data[key]);
        }

    } catch (e) {
        console.warn(e);
        container.innerHTML = '<p>Could not load metadata.</p>';
    }
}

function renderMetadataSection(container, title, data) {
    const section = document.createElement('div');
    section.className = 'metadata-section';

    const header = document.createElement('h3');
    header.className = 'metadata-header collapsed';
    // Add chevron icon
    header.innerHTML = `<span>${title.charAt(0).toUpperCase() + title.slice(1)}</span> <i class="fas fa-chevron-down"></i>`;

    const content = document.createElement('div');
    content.className = 'metadata-body hidden'; // Default hidden

    renderMetadataRecursive(content, data);

    // Collapsible logic
    header.addEventListener('click', () => {
        content.classList.toggle('hidden');
        header.classList.toggle('collapsed');
    });

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
}

function renderMetadataRecursive(container, data) {
    if (typeof data === 'object' && data !== null) {
        const ul = document.createElement('ul');
        ul.className = 'metadata-list';

        for (const key in data) {
            const li = document.createElement('li');
            const value = data[key];

            const keySpan = document.createElement('span');
            keySpan.className = 'metadata-key';
            keySpan.textContent = key + ': ';
            li.appendChild(keySpan);

            if (typeof value === 'object' && value !== null) {
                renderMetadataRecursive(li, value);
            } else {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'metadata-value';
                valueSpan.textContent = value;
                li.appendChild(valueSpan);
            }
            ul.appendChild(li);
        }
        container.appendChild(ul);
    } else {
        const span = document.createElement('span');
        span.textContent = data;
        container.appendChild(span);
    }
}

// Static View Functions
let currentStaticEventId = null;

function initStaticView(id) {
    currentStaticEventId = id;

    // Set default image (intensity)
    loadStaticImage('intensity');

    // Initialize event listeners if not already done
    if (!window.staticViewInitialized) {
        window.staticViewInitialized = true;

        // Image selector buttons
        document.querySelectorAll('.static-view-btn:not(.dropdown-toggle)').forEach(btn => {
            btn.addEventListener('click', function () {
                const imageType = this.getAttribute('data-image');
                if (imageType) {
                    loadStaticImage(imageType);

                    // Update active state
                    document.querySelectorAll('.static-view-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });

        // Dropdown toggle
        const dropdownToggle = document.getElementById('sa-dropdown');
        const dropdownMenu = document.getElementById('sa-menu');

        dropdownToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
            dropdownToggle.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.static-view-dropdown')) {
                dropdownMenu.classList.remove('show');
                dropdownToggle.classList.remove('open');
            }
        });

        // Dropdown items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function () {
                const imageType = this.getAttribute('data-image');
                loadStaticImage(imageType);

                // Update active state
                document.querySelectorAll('.static-view-btn').forEach(b => b.classList.remove('active'));
                dropdownToggle.classList.add('active');

                // Close dropdown
                dropdownMenu.classList.remove('show');
                dropdownToggle.classList.remove('open');
            });
        });
    }
}

function loadStaticImage(imageType) {
    const img = document.getElementById('static-view-image');
    const imagePath = `${DATA_DIR}/${currentStaticEventId}/current/products/${imageType}.jpg`;

    // Set loading state
    img.style.opacity = '0.5';
    img.alt = 'Loading...';

    // Create a new image to preload
    const preloadImg = new Image();
    preloadImg.onload = function () {
        img.src = imagePath;
        img.style.opacity = '1';
        img.alt = `ShakeMap ${imageType} view`;
    };
    preloadImg.onerror = function () {
        img.src = '';
        img.alt = 'Image not available';
        img.style.opacity = '1';
    };
    preloadImg.src = imagePath;
}

/**
 * Helper to format unit strings
 * Converts "cms" -> "cm/s"
 * Converts "pctg" -> "%g"
 */
function formatUnit(unit) {
    if (!unit) return '';
    let u = unit.toLowerCase();
    if (u.includes('cms')) {
        return u.replace('cms', 'cm/s');
    }
    if (u.includes('pctg')) {
        return u.replace('pctg', '%g');
    }
    return unit;
}
