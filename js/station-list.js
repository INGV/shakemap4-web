
// Station List Logic

// Value formatting helpers (shared by both tables)
function getStationVal(val, fixed) {
    return (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Number(val).toFixed(fixed) : '-';
}

function getStationRound(val) {
    return (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Math.round(val) : '-';
}

// Column descriptors: drive both rendering and sorting.
// type 'number' sorts numerically (missing values rank as lowest),
// type 'string' sorts alphabetically.
const SEISMIC_COLUMNS = [
    { key: 'id', label: 'ID', type: 'string', cls: 'col-id', format: s => s.id || s.properties.code || '-' },
    { key: 'intensity', label: 'Intensity', type: 'number', cls: 'col-mmi', format: s => getStationRound(s.properties.intensity) },
    { key: 'pga', label: 'PGA (%g)', type: 'number', cls: 'col-pga', format: s => getStationVal(s.properties.pga, 4) },
    { key: 'pgv', label: 'PGV (cm/s)', type: 'number', cls: 'col-pgv', format: s => getStationVal(s.properties.pgv, 4) },
    { key: 'distance', label: 'Distance (km)', type: 'number', cls: 'col-dist', format: s => getStationVal(s.properties.distance, 1) }
];

const MACRO_COLUMNS = [
    { key: 'id', label: 'ID', type: 'string', cls: 'col-id', format: s => s.id || s.properties.code || '-' },
    { key: 'intensity', label: 'Intensity', type: 'number', cls: 'col-mmi', format: s => getStationRound(s.properties.intensity) },
    { key: 'intensity_stddev', label: 'Std Dev', type: 'number', cls: 'col-stddev', format: s => getStationVal(s.properties.intensity_stddev, 2) },
    { key: 'nresp', label: 'N. Resp', type: 'number', cls: 'col-nresp', format: s => {
        const v = s.properties.nresp;
        return (v !== null && v !== undefined && v !== "null") ? v : '-';
    } },
    { key: 'distance', label: 'Distance (km)', type: 'number', cls: 'col-dist', format: s => getStationVal(s.properties.distance, 1) }
];

// Per-table runtime state: loaded stations + current sort.
// Default sort is distance ascending (preserves the historical behaviour).
const stationState = {
    seismic: {
        containerId: 'seismicStationTable',
        columns: SEISMIC_COLUMNS,
        detail: buildSeismicDetail,
        emptyMsg: 'No seismic stations available.',
        stations: [],
        sort: { column: 'distance', direction: 'asc' }
    },
    macro: {
        containerId: 'macroseismicStationTable',
        columns: MACRO_COLUMNS,
        detail: buildMacroDetail,
        emptyMsg: 'No reported intensity data available.',
        stations: [],
        sort: { column: 'distance', direction: 'asc' }
    }
};

function initStationList(eventId) {
    document.getElementById('seismicStationTable').innerHTML = '<div class="loading">Loading stations...</div>';
    document.getElementById('macroseismicStationTable').innerHTML = '<div class="loading">Loading stations...</div>';
    loadStationData(eventId);
}

async function loadStationData(eventId) {
    try {
        const response = await fetch(`${DATA_DIR}/${eventId}/current/products/stationlist.json`);
        if (!response.ok) {
            throw new Error('Failed to load station list.');
        }
        const json = await response.json();
        const stations = json.features;

        // Partition into seismic and macroseismic
        stationState.seismic.stations = stations.filter(s => s.properties.station_type !== 'macroseismic');
        stationState.macro.stations = stations.filter(s => s.properties.station_type === 'macroseismic');

        // Reset to default sort on each (re)load
        stationState.seismic.sort = { column: 'distance', direction: 'asc' };
        stationState.macro.sort = { column: 'distance', direction: 'asc' };

        renderStationTable('seismic');
        renderStationTable('macro');

    } catch (error) {
        console.error('Error loading stations:', error);
        document.getElementById('seismicStationTable').innerHTML = '<div class="error">Could not load station list.</div>';
        document.getElementById('macroseismicStationTable').innerHTML = '';
    }
}

// Resolve the raw (non-formatted) value used for sorting.
// Missing numeric values become -Infinity so they rank lowest.
function getSortValue(station, col) {
    if (col.type === 'string') {
        return (station.id || station.properties.code || '').toString().toLowerCase();
    }
    const raw = station.properties[col.key];
    if (raw === null || raw === undefined || raw === "null" || isNaN(raw)) {
        return -Infinity;
    }
    return Number(raw);
}

function sortStations(stations, col, direction) {
    const dir = direction === 'desc' ? -1 : 1;
    return [...stations].sort((a, b) => {
        const va = getSortValue(a, col);
        const vb = getSortValue(b, col);
        if (col.type === 'string') {
            return va.localeCompare(vb) * dir;
        }
        return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
}

function renderStationTable(which) {
    const cfg = stationState[which];
    const container = document.getElementById(cfg.containerId);

    if (!cfg.stations || cfg.stations.length === 0) {
        container.innerHTML = `<div class="info">${cfg.emptyMsg}</div>`;
        return;
    }

    const col = cfg.columns.find(c => c.key === cfg.sort.column) || cfg.columns[0];
    const sorted = sortStations(cfg.stations, col, cfg.sort.direction);

    let html = renderHeaderRow(cfg.columns, cfg.sort);
    sorted.forEach(station => { html += renderStationRow(station, cfg.columns, cfg.detail); });
    container.innerHTML = html;

    // Wire up click-to-sort on header cells
    container.querySelectorAll('.sortable-col').forEach(el => {
        el.addEventListener('click', () => {
            const key = el.getAttribute('data-sort-key');
            if (cfg.sort.column === key) {
                cfg.sort.direction = cfg.sort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                cfg.sort.column = key;
                cfg.sort.direction = 'asc';
            }
            renderStationTable(which);
        });
    });

    initCollapsible(cfg.containerId);
}

function renderHeaderRow(columns, sort) {
    let cells = '';
    columns.forEach(col => {
        const active = sort.column === col.key;
        let icon = 'fa-sort';
        if (active) icon = sort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
        cells += `<span class="${col.cls} sortable-col${active ? ' active-sort' : ''}" data-sort-key="${col.key}">${col.label} <i class="fas ${icon}"></i></span>`;
    });
    return `
        <button type="button" class="collapsible header-row">
            <div class="station-row-data">
                ${cells}
                <span class="col-dummy"></span>
            </div>
        </button>
    `;
}

function renderStationRow(station, columns, detailBuilder) {
    const mmi = getStationRound(station.properties.intensity);
    const color = getStationColor(mmi);

    let cells = '';
    columns.forEach(col => { cells += `<span class="${col.cls}">${col.format(station)}</span>`; });

    return `
        <button type="button" class="collapsible" style="background-color: ${color}; border-left: 5px solid rgba(0,0,0,0.2);">
            <div class="station-row-data">
                ${cells}
                <span class="col-dummy"></span>
            </div>
        </button>
        <div class="content">
            <p>${detailBuilder(station)}</p>
        </div>
    `;
}

function buildSeismicDetail(station) {
    const props = station.properties;
    const coords = station.geometry.coordinates;
    const lat = coords[1];
    const lon = coords[0];
    const vs30 = getStationVal(props.vs30, 2);

    let channelsHtml = '';
    if (props.channels && props.channels.length > 0) {
        channelsHtml += `
            <div style="margin-top:10px;"><b>Channels:</b></div>
            <table class="channel-table">
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>PGA (%g)</th>
                        <th>PGV (cm/s)</th>
                        <th>SA(0.3) (%g)</th>
                        <th>SA(1.0) (%g)</th>
                        <th>SA(3.0) (%g)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        props.channels.forEach(channel => {
            const findAmp = (name) => {
                const amp = channel.amplitudes.find(a => a.name === name);
                return amp ? amp.value : '-';
            };

            channelsHtml += `
                <tr>
                    <td>${channel.name}</td>
                    <td>${findAmp('pga')}</td>
                    <td>${findAmp('pgv')}</td>
                    <td>${findAmp('sa(0.3)')}</td>
                    <td>${findAmp('sa(1.0)')}</td>
                    <td>${findAmp('sa(3.0)')}</td>
                </tr>
            `;
        });
        channelsHtml += `</tbody></table>`;
    }

    return `
        <strong>Latitude:</strong> ${lat} &emsp; <strong>Longitude:</strong> ${lon} &emsp; <strong>Vs30 (m/s):</strong> ${vs30}
        ${channelsHtml}
    `;
}

function buildMacroDetail(station) {
    const props = station.properties;
    const coords = station.geometry.coordinates;
    const lat = coords[1];
    const lon = coords[0];
    const vs30 = getStationVal(props.vs30, 2);

    let distancesHtml = '';
    if (props.distances) {
        distancesHtml = '<div style="margin-top:10px;"><b>Distances:</b></div><table class="channel-table"><thead><tr>';
        const keys = Object.keys(props.distances);
        keys.forEach(key => { distancesHtml += `<th>${key}</th>`; });
        distancesHtml += '</tr></thead><tbody><tr>';
        keys.forEach(key => { distancesHtml += `<td>${getStationVal(props.distances[key], 3)}</td>`; });
        distancesHtml += '</tr></tbody></table>';
    }

    return `
        <strong>Latitude:</strong> ${lat} &emsp; <strong>Longitude:</strong> ${lon} &emsp; <strong>Vs30 (m/s):</strong> ${vs30}
        ${distancesHtml}
    `;
}

function initCollapsible(containerId) {
    const container = document.getElementById(containerId);
    const coll = container.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        if (coll[i].classList.contains('header-row')) continue;

        coll[i].addEventListener("click", function () {
            this.classList.toggle("activeCol");
            const content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    }
}

function getStationColor(intensity) {
    if (intensity === null || intensity === undefined) return '#ffffff';

    if (typeof intColors !== 'undefined') {
        const rounded = Math.round(intensity * 2) / 2;
        if (intColors[rounded]) return intColors[rounded];
        if (intColors[Math.round(intensity)]) return intColors[Math.round(intensity)];
    } else if (typeof intColors_USGS !== 'undefined') {
        return intColors_USGS[Math.round(intensity)] || '#ffffff';
    }

    return '#ffffff';
}
