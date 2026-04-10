
// Station List Logic

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

        // Sort stations by distance
        const stationsSorted = stations.sort((a, b) => {
            const distA = a.properties.distance || 0;
            const distB = b.properties.distance || 0;
            return distA > distB ? 1 : -1;
        });

        // Partition into seismic and macroseismic
        const seismicStations = stationsSorted.filter(s => s.properties.station_type !== 'macroseismic');
        const macroseismicStations = stationsSorted.filter(s => s.properties.station_type === 'macroseismic');

        renderSeismicTable(seismicStations);
        renderMacroseismicTable(macroseismicStations);

    } catch (error) {
        console.error('Error loading stations:', error);
        document.getElementById('seismicStationTable').innerHTML = '<div class="error">Could not load station list.</div>';
        document.getElementById('macroseismicStationTable').innerHTML = '';
    }
}

function renderSeismicTable(stations) {
    const container = document.getElementById('seismicStationTable');

    if (stations.length === 0) {
        container.innerHTML = '<div class="info">No seismic stations available.</div>';
        return;
    }

    let html = '';

    // Header
    html += `
        <button type="button" class="collapsible header-row">
            <div class="station-row-data">
                <span class="col-id">ID</span>
                <span class="col-mmi">Intensity</span>
                <span class="col-pga">PGA (%g)</span>
                <span class="col-pgv">PGV (cm/s)</span>
                <span class="col-dist">Distance (km)</span>
                <span class="col-dummy"></span>
            </div>
        </button>
    `;

    stations.forEach(station => {
        const props = station.properties;
        const getVal = (val, fixed) => (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Number(val).toFixed(fixed) : '-';
        const getRound = (val) => (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Math.round(val) : '-';

        const id = station.id || props.code || '-';
        const mmi = getRound(props.intensity);
        const color = getStationColor(mmi);
        const pga = getVal(props.pga, 4);
        const pgv = getVal(props.pgv, 4);
        const dist = getVal(props.distance, 1);

        const coords = station.geometry.coordinates;
        const lat = coords[1];
        const lon = coords[0];
        const vs30 = getVal(props.vs30, 2);

        // Build Channels Table
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

        html += `
            <button type="button" class="collapsible" style="background-color: ${color}; border-left: 5px solid rgba(0,0,0,0.2);">
                <div class="station-row-data">
                    <span class="col-id">${id}</span>
                    <span class="col-mmi">${mmi}</span>
                    <span class="col-pga">${pga}</span>
                    <span class="col-pgv">${pgv}</span>
                    <span class="col-dist">${dist}</span>
                    <span class="col-dummy"></span>
                </div>
            </button>
            <div class="content">
                <p>
                    <strong>Latitude:</strong> ${lat} &emsp; <strong>Longitude:</strong> ${lon} &emsp; <strong>Vs30 (m/s):</strong> ${vs30}
                    ${channelsHtml}
                </p>
            </div>
        `;
    });

    container.innerHTML = html;
    initCollapsible('seismicStationTable');
}

function renderMacroseismicTable(stations) {
    const container = document.getElementById('macroseismicStationTable');

    if (stations.length === 0) {
        container.innerHTML = '<div class="info">No reported intensity data available.</div>';
        return;
    }

    let html = '';

    // Header
    html += `
        <button type="button" class="collapsible header-row">
            <div class="station-row-data">
                <span class="col-id">ID</span>
                <span class="col-mmi">Intensity</span>
                <span class="col-stddev">Std Dev</span>
                <span class="col-nresp">N. Resp</span>
                <span class="col-dist">Distance (km)</span>
                <span class="col-dummy"></span>
            </div>
        </button>
    `;

    stations.forEach(station => {
        const props = station.properties;
        const getVal = (val, fixed) => (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Number(val).toFixed(fixed) : '-';
        const getRound = (val) => (val !== null && val !== undefined && val !== "null" && !isNaN(val)) ? Math.round(val) : '-';

        const id = station.id || props.code || '-';
        const mmi = getRound(props.intensity);
        const color = getStationColor(mmi);
        const stddev = getVal(props.intensity_stddev, 2);
        const nresp = (props.nresp !== null && props.nresp !== undefined && props.nresp !== "null") ? props.nresp : '-';
        const dist = getVal(props.distance, 1);

        const coords = station.geometry.coordinates;
        const lat = coords[1];
        const lon = coords[0];
        const vs30 = getVal(props.vs30, 2);

        // Distances detail
        let distancesHtml = '';
        if (props.distances) {
            distancesHtml = '<div style="margin-top:10px;"><b>Distances:</b></div><table class="channel-table"><thead><tr>';
            const keys = Object.keys(props.distances);
            keys.forEach(key => { distancesHtml += `<th>${key}</th>`; });
            distancesHtml += '</tr></thead><tbody><tr>';
            keys.forEach(key => { distancesHtml += `<td>${getVal(props.distances[key], 3)}</td>`; });
            distancesHtml += '</tr></tbody></table>';
        }

        html += `
            <button type="button" class="collapsible" style="background-color: ${color}; border-left: 5px solid rgba(0,0,0,0.2);">
                <div class="station-row-data">
                    <span class="col-id">${id}</span>
                    <span class="col-mmi">${mmi}</span>
                    <span class="col-stddev">${stddev}</span>
                    <span class="col-nresp">${nresp}</span>
                    <span class="col-dist">${dist}</span>
                    <span class="col-dummy"></span>
                </div>
            </button>
            <div class="content">
                <p>
                    <strong>Latitude:</strong> ${lat} &emsp; <strong>Longitude:</strong> ${lon} &emsp; <strong>Vs30 (m/s):</strong> ${vs30}
                    ${distancesHtml}
                </p>
            </div>
        `;
    });

    container.innerHTML = html;
    initCollapsible('macroseismicStationTable');
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
