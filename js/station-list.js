
// Station List Logic

function initStationList(eventId) {
    // Clear previous data
    document.getElementById('stationTable').innerHTML = '<div class="loading">Loading stations...</div>';
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

        // Determine isHistoric based on config and event year
        // We need to look up the event year from the global allEvents list or another source
        // Since we passed eventId, let's find the event in allEvents to get the date
        let isHistoric = false;
        if (typeof allEvents !== 'undefined' && typeof config !== 'undefined' && config.historicalCutOff) {
            const event = allEvents.find(e => e.id == eventId);
            if (event) {
                const eventDate = new Date(event.year, event.month - 1, event.day, event.h, event.m, event.s);
                const parts = config.historicalCutOff.split('-');
                const cutOffDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

                // If event is OLDER than cutoff, it is HISTORIC
                if (eventDate < cutOffDate) {
                    isHistoric = true;
                }
            }
        }

        // Sort stations by distance
        const stationsSorted = stations.sort((a, b) => {
            const distA = a.properties.distance || 0;
            const distB = b.properties.distance || 0;
            return distA > distB ? 1 : -1;
        });

        renderStationTable(stationsSorted, isHistoric);

    } catch (error) {
        console.error('Error loading stations:', error);
        document.getElementById('stationTable').innerHTML = '<div class="error">Could not load station list.</div>';
    }
}

function renderStationTable(stations, isHistoric) {
    const container = document.getElementById('stationTable');
    let html = '';

    // Define Header
    // Columns: ID, MMI, PGA (%g), PGV (cm/s), Distance (km)
    html += `
        <button type="button" class="collapsible header-row">
            <div class="station-row-data">
                <span class="col-id">ID</span>
                <span class="col-mmi">MMI</span>
                <span class="col-pga">PGA (%g)</span>
                <span class="col-pgv">PGV (cm/s)</span>
                <span class="col-dist">Distance (km)</span>
                <span class="col-dummy"></span>
            </div>
        </button>
    `;

    // Filter Logic from user snippet: "dontUseStationType = 'macroseismic'" if NOT historic
    // If Historic, use ALL. If Modern, exclude 'macroseismic' ??
    // User snippet: 
    // var dontUseStationType = 'macroseismic';
    // if (historic == true) { dontUseStationType = '' };
    // if (stations[i].properties.station_type != dontUseStationType) ...

    // So if Modern (historic=false), exclude 'macroseismic'. 
    // If Historic (historic=true), exclude '' (which means include everything basically).

    const excludeType = isHistoric ? '' : 'macroseismic';

    stations.forEach(station => {
        const props = station.properties;

        if (props.station_type === excludeType && excludeType !== '') {
            return; // Skip
        }

        // Helpers
        const getVal = (val, fixed) => (val !== null && val !== undefined && !isNaN(val)) ? Number(val).toFixed(fixed) : '-';
        const getRound = (val) => (val !== null && val !== undefined && !isNaN(val)) ? Math.round(val) : '-';

        // Intensity Color
        // Use intColors from js/colors.js (assuming simple integer index or handled otherwise)
        // User snippet used `intColors[Math.round(...)]`.
        // We have `intColors` object in colors.js now.
        const id = station.id || props.code || '-';
        const mmi = getRound(props.intensity);
        const color = getStationColor(mmi);
        const pga = getVal(props.pga, 4);
        const pgv = getVal(props.pgv, 4);
        const dist = getVal(props.distance, 1);

        let coords = station.geometry.coordinates; // [lon, lat]
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
                            <th>PGV (cm/s)</th> <!-- Label says m/s in snippet but dataset usually has specific units, user snippet says cm/s in header but m/s in subtable? let's stick to consistent units or user snippet. Header said (cm/s) -->
                            <th>SA(0.3) (%g)</th>
                            <th>SA(1.0) (%g)</th>
                            <th>SA(3.0) (%g)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            props.channels.forEach(channel => {
                // Find amplitudes
                const findAmp = (name) => {
                    const amp = channel.amplitudes.find(a => a.name === name);
                    return amp ? amp.value : '-'; // Value is raw string/number
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
    initCollapsible();
}

function initCollapsible() {
    const coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        // Skip header row
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

    // intColors is an OBJECT now: { 1: '#...', 1.5: '#...', ... }
    // We should round to nearest key or floor/ceil? 
    // User snippet was `Math.round`. 
    // `colors.js` keys are 1, 1.5, 2, 2.5...
    // Let's use exact match or round to nearest 0.5?
    // Actually the user snippet used `Math.round(stations[i].properties.intensity)` which implies Integers.
    // If intColors keys are 1, 1.5, 2... and we have Integer intensity (e.g. 5), it matches.

    // Check if intColors is defined
    if (typeof intColors !== 'undefined') {
        const rounded = Math.round(intensity * 2) / 2; // Round to nearest 0.5
        // Or just Round to integer as per user snippet? 
        // User snippet: `intColors[Math.round(stations[i].properties.intensity)]`
        // But the new `intColors` object has 0.5 steps.
        // I will try to find exact match for nearest 0.5, fallback to integer match.

        if (intColors[rounded]) return intColors[rounded];
        if (intColors[Math.round(intensity)]) return intColors[Math.round(intensity)];
    } else if (typeof intColors_USGS !== 'undefined') {
        // Fallback to array config if object not found (legacy support)
        return intColors_USGS[Math.round(intensity)] || '#ffffff';
    }

    return '#ffffff';
}
