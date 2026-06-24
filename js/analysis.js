// Analysis View JavaScript - Integrated Tab Version
// Modern implementation using D3.js v7

const ANALYSIS_DATA_DIR = 'data';

// Single source of truth for the data-selection thresholds used in the plots.
// Both the filtering logic and the user-facing "Applied filters" note read from
// here, so changing a value updates the plots and the note together.
const ANALYSIS_FILTERS = {
    distanceMinKm: 1,
    distanceMaxKm: 301,
    pgaMin: 0.0098,   // %g, applied to seismic (instrumental) stations only
    pgvMin: 0.00098,  // cm/s, applied to seismic (instrumental) stations only
};

// Coerce a station property to a finite number, or null. ShakeMap station lists
// encode "missing" as the literal string "null" (not JSON null) for macroseismic
// points without instrumental ground motion, so a plain truthiness check is not
// enough: "null" is truthy and would later blow up on .toFixed().
function toNum(value) {
    if (value === null || value === undefined || value === 'null') return null;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
}

// Build the per-tab "Applied filters" caption shown under each plot. Values are
// interpolated from ANALYSIS_FILTERS so the note never drifts from the logic.
function filtersNoteText(comp_id) {
    const f = ANALYSIS_FILTERS;
    const dist = `epicentral distance ${f.distanceMinKm}–${f.distanceMaxKm} km`;
    const gm = `PGA > ${f.pgaMin} %g and PGV > ${f.pgvMin} cm/s`;
    if (comp_id === 'intensity') {
        return `Applied filters: ${dist}. Seismic stations also require ${gm}; ` +
            `reported-intensity points are selected by intensity value only.`;
    }
    return `Applied filters: ${dist}, ${gm}. Instrumental (seismic) stations only.`;
}

let analysisEventId = null;
let analysisEventYear = null;
let currentAnalysisData = [];
let currentRegressionData = {};
let isAnalysisInitialized = false;

// Main function to load Analysis View (called from app.js when tab is clicked)
window.loadAnalysisView = function (eventid, eventyear) {
    analysisEventId = eventid;
    analysisEventYear = parseInt(eventyear);

    if (!analysisEventId) {
        console.error('No event ID provided for Analysis View');
        return;
    }

    // Initialize once
    if (!isAnalysisInitialized) {
        initializeAnalysisView();
        isAnalysisInitialized = true;
    }

    // Auto-check Reported Intensity for old events
    const dyfiCheck = document.getElementById('dyfiCheck');
    if (dyfiCheck && analysisEventYear && analysisEventYear < 1972) {
        dyfiCheck.checked = true;
    } else if (dyfiCheck) {
        dyfiCheck.checked = false;
    }

    // Reset to intensity tab and rock site class
    switchAnalysisTab('intensity');
    const selectRegrType = document.getElementById('selectRegrType');
    if (selectRegrType) selectRegrType.value = 'rock';

    // Load and plot data
    changePlot();
};

// Initialize Analysis View controls (only once)
function initializeAnalysisView() {
    // Set up radio button switching
    document.querySelectorAll('input[name="analysis-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            switchAnalysisTab(e.target.value);
        });
    });

    // Set up control listeners
    const selectRegrType = document.getElementById('selectRegrType');
    const dyfiCheck = document.getElementById('dyfiCheck');

    if (selectRegrType) {
        selectRegrType.addEventListener('change', changePlot);
    }
    if (dyfiCheck) {
        dyfiCheck.addEventListener('change', changePlot);
    }
}

// Switch between analysis sub-tabs (Intensity, PGA, PGV)
function switchAnalysisTab(tabName) {
    // Update radio buttons
    document.querySelectorAll('input[name="analysis-type"]').forEach(radio => {
        radio.checked = (radio.value === tabName);
    });

    // Update plot areas
    document.querySelectorAll('.plot-area').forEach(area => {
        area.classList.remove('active');
    });
    const plotArea = document.getElementById(tabName);
    if (plotArea) plotArea.classList.add('active');

    // The "Show Reported Intensity" toggle only affects the intensity plot, so
    // hide it on the PGA/PGV tabs where macroseismic points are never shown.
    // Null-safe: legacy pages without this wrapper simply keep the checkbox.
    const dyfiControlGroup = document.getElementById('dyfiControlGroup');
    if (dyfiControlGroup) {
        dyfiControlGroup.style.display = (tabName === 'intensity') ? '' : 'none';
    }
}

// Change plot based on controls
function changePlot() {
    const selectRegrType = document.getElementById('selectRegrType');
    const dyfiCheck = document.getElementById('dyfiCheck');

    const selectedType = selectRegrType ? selectRegrType.value : 'rock';
    const showDYFI = dyfiCheck ? dyfiCheck.checked : false;

    stationList(true, selectedType, showDYFI);
}

// Load station list and plot data
async function stationList(newPlot, regrType, showDYFI) {
    try {
        const response = await fetch(`${ANALYSIS_DATA_DIR}/${analysisEventId}/current/products/stationlist.json`);
        if (!response.ok) throw new Error('Station list not found');

        const json = await response.json();
        const stations = json.features || [];

        // Process station data
        const objArr = [];
        const f = ANALYSIS_FILTERS;

        stations.forEach(station => {
            const props = station.properties || {};
            const isMacro = props.station_type === 'macroseismic';

            // Normalize numeric fields up front: "null"/missing become real null.
            const distance = toNum(props.distance);
            const intensity = toNum(props.intensity);
            const pga = toNum(props.pga);
            const pgv = toNum(props.pgv);

            // Distance window applies to both station types.
            if (distance === null ||
                distance <= f.distanceMinKm ||
                distance >= f.distanceMaxKm) {
                return;
            }

            if (isMacro) {
                // Reported-intensity points: gated by the "Show Reported Intensity"
                // toggle and selected by intensity only (no PGA/PGV requirement).
                if (!showDYFI || intensity === null) return;
            } else {
                // Seismic (instrumental) stations: require minimum ground motion.
                if (!(pga > f.pgaMin) || !(pgv > f.pgvMin)) return;
            }

            objArr.push({
                id: station.id,
                distance: distance,
                intensity: intensity,
                pga: pga,
                pgv: pgv,
                color: intColors_USGS[Math.round(intensity)] || 'black',
                intensityPrediction: getPredictedValue('mmi', props.predictions),
                pgaPrediction: getPredictedValue('pga', props.predictions),
                pgvPrediction: getPredictedValue('pgv', props.predictions),
                vs30: toNum(props.vs30),
                obsType: props.station_type
            });
        });

        currentAnalysisData = objArr;

        // Check if attenuation curves exist
        if (await fileExists(`${ANALYSIS_DATA_DIR}/${analysisEventId}/current/products/attenuation_curves.json`)) {
            await getRegression(objArr, newPlot, regrType);
        } else {
            // Plot without regression. PGA/PGV are seismic-only (see getRegression).
            const seismicArr = objArr.filter(o => o.obsType === 'seismic');
            plot_data(clean_array(objArr, 'intensity'), [], 'intensity', newPlot);
            plot_data(clean_array(seismicArr, 'pga'), [], 'pga', false);
            plot_data(clean_array(seismicArr, 'pgv'), [], 'pgv', false);
        }

    } catch (error) {
        console.error('Error loading station list:', error);
        ['intensity', 'pga', 'pgv'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.innerHTML = '<p class="loading">No data available</p>';
        });
    }
}

// Get prediction value from predictions array
function getPredictedValue(component, predictions) {
    if (!predictions) return null;
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].name === component) {
            return predictions[i].value;
        }
    }
    return null;
}

// Check if file exists
async function fileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Get regression curves
async function getRegression(obsArr, newPlot, regrType) {
    try {
        const response = await fetch(`${ANALYSIS_DATA_DIR}/${analysisEventId}/current/products/attenuation_curves.json`);
        if (!response.ok) throw new Error('Attenuation curves not found');

        const regrPoints = await response.json();
        const distances = regrPoints.distances.repi;
        const gmpe = regrPoints.gmpe[regrType];

        // Per-plot observed datasets. Reported-intensity (macroseismic) points
        // appear only in the intensity plot; PGA/PGV show instrumental (seismic)
        // stations only, regardless of any derived pga/pgv they may carry.
        const seismicArr = obsArr.filter(o => o.obsType === 'seismic');
        const intensityObs = clean_array(obsArr, 'intensity');
        const pgaObs = clean_array(seismicArr, 'pga');
        const pgvObs = clean_array(seismicArr, 'pgv');

        // Each plot's regression curve spans only the distance range of the
        // points actually shown in that plot.
        plot_data(intensityObs, buildRegrArr(distances, gmpe, intensityObs), 'intensity', newPlot);
        plot_data(pgaObs, buildRegrArr(distances, gmpe, pgaObs), 'pga', false);
        plot_data(pgvObs, buildRegrArr(distances, gmpe, pgvObs), 'pgv', false);

    } catch (error) {
        console.error('Error loading regression:', error);
        // Plot without regression
        const seismicArr = obsArr.filter(o => o.obsType === 'seismic');
        plot_data(clean_array(obsArr, 'intensity'), [], 'intensity', newPlot);
        plot_data(clean_array(seismicArr, 'pga'), [], 'pga', false);
        plot_data(clean_array(seismicArr, 'pgv'), [], 'pgv', false);
    }
}

// Build the GMPE regression points limited to the distance range spanned by the
// observed points shown in a given plot. Returns [] when there are no points.
function buildRegrArr(distances, gmpe, obs) {
    if (!obs || obs.length === 0) return [];

    const distMin = Math.min(...obs.map(o => o.distance));
    const distMax = Math.max(...obs.map(o => o.distance));

    const regrArr = [];
    for (let i = 0; i < distances.length; i++) {
        if (distances[i] < ANALYSIS_FILTERS.distanceMaxKm &&
            distances[i] > distMin &&
            distances[i] < distMax) {

            regrArr.push({
                distance: distances[i],
                intensity: gmpe.MMI.mean[i],
                intensityStd: gmpe.MMI.stddev[i],
                pga: 100 * Math.exp(gmpe.PGA.mean[i]),
                pgaStd: Math.exp(gmpe.PGA.stddev[i]),
                pgv: Math.exp(gmpe.PGV.mean[i]),
                pgvStd: Math.exp(gmpe.PGV.stddev[i])
            });
        }
    }
    return regrArr;
}

// Clean array from null values
function clean_array(array, keyName) {
    return array.filter(item => item[keyName] !== null && item[keyName] !== "null");
}

// Main plot function using D3.js v7
function plot_data(data, regrArr, comp_id, newPlot) {
    const div_id = '#' + comp_id;
    const predID = comp_id + 'Prediction';
    const stdID = comp_id + 'Std';

    // CRITICAL FIX: Clear ALL content from the plot area (not just SVG and tooltips)
    const plotElement = d3.select(div_id);
    plotElement.html(''); // This removes everything including "No data available" text

    if (data.length === 0) {
        plotElement.html('<p class="loading">No data available</p>');
        return;
    }

    // Calculate standard deviation array
    let stdArr = [];
    if (regrArr.length > 0) {
        stdArr = regrArr.map(item => ({ [stdID]: item[stdID], distance: item.distance }));
        const stdArrRev = stdArr.map(a => Object.assign({}, a)).reverse();

        for (let i = 0; i < stdArrRev.length; i++) {
            if (stdID === 'intensityStd') {
                stdArr[i][stdID] = regrArr[i][comp_id] + stdArr[i][stdID];
                stdArrRev[i][stdID] = regrArr[regrArr.length - 1 - i][comp_id] - stdArrRev[i][stdID];
            } else {
                stdArr[i][stdID] = regrArr[i][comp_id] * stdArr[i][stdID];
                stdArrRev[i][stdID] = regrArr[regrArr.length - 1 - i][comp_id] / stdArrRev[i][stdID];
            }
            stdArr.push(stdArrRev[i]);
        }
    }

    // Set dimensions
    const margin = { top: 10, right: 30, bottom: 60, left: 70 };
    const width = 1100 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(div_id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip at body level (not inside plot div) for proper positioning
    let tooltip = d3.select("body").select(".analysis-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "analysis-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "rgba(50, 50, 50, 0.95)")
            .style("color", "#ffffff")
            .style("padding", "12px")
            .style("border-radius", "6px")
            .style("font-size", "14px")
            .style("line-height", "1.6")
            .style("pointer-events", "none")
            .style("z-index", "10000")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)");
    }

    // Debounce timer for tooltip hide (prevents flickering)
    let hideTooltipTimer = null;

    // Set scales
    const x = d3.scaleLog().range([0, width]);

    let y, tickNumber;
    if (div_id === "#intensity") {
        y = d3.scaleLinear().range([height, 0]);
        tickNumber = 10;
    } else {
        y = d3.scaleLog().range([height, 0]);
        tickNumber = 4;
    }

    // Define axes domains
    const distance_max = Math.max(...data.map(o => o.distance), 0);
    const distance_minData = Math.min(...data.map(o => o.distance), distance_max);

    let distance_min = 1;
    if (distance_minData < 2.05) {
        distance_min = 1;
    } else if (distance_minData < 10) {
        distance_min = distance_minData - 1;
    } else {
        distance_min = Math.floor(distance_minData / 10) * 10;
    }

    let yMax = Math.max(...data.map(o => o[comp_id]), 0);
    let yMin = Math.min(...data.map(o => o[comp_id]), yMax);

    if (stdArr.length > 0) {
        const stdMax = Math.max(...stdArr.map(o => o[stdID]), 0);
        const stdMin = Math.min(...stdArr.map(o => o[stdID]), stdMax);
        if (stdMax > yMax) yMax = stdMax;
        if (stdMin < yMin) yMin = stdMin;
    }

    x.domain([Math.round(distance_min), distance_max]);
    y.domain([yMin - 0.1 * yMin, yMax + 0.1 * yMax]);

    // Light gray grid lines (drawn first so they sit behind the data)
    svg.append("g")
        .attr("class", "grid grid-x")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(""))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").attr("stroke", "#d3d3d3").attr("stroke-width", 0.5));

    svg.append("g")
        .attr("class", "grid grid-y")
        .call(d3.axisLeft(y).ticks(tickNumber).tickSize(-width).tickFormat(""))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").attr("stroke", "#d3d3d3").attr("stroke-width", 0.5));

    // Regression standard deviation band (gray filled area)
    if (stdArr.length > 0) {
        // Create area generator for the standard deviation band
        const areaGenerator = d3.area()
            .x(d => x(d.distance))
            .y0(d => {
                // Lower bound of std dev
                const index = regrArr.findIndex(r => r.distance === d.distance);
                if (index !== -1) {
                    if (stdID === 'intensityStd') {
                        return y(regrArr[index][comp_id] - regrArr[index][stdID]);
                    } else {
                        return y(regrArr[index][comp_id] / regrArr[index][stdID]);
                    }
                }
                return y(d[stdID]);
            })
            .y1(d => {
                // Upper bound of std dev
                const index = regrArr.findIndex(r => r.distance === d.distance);
                if (index !== -1) {
                    if (stdID === 'intensityStd') {
                        return y(regrArr[index][comp_id] + regrArr[index][stdID]);
                    } else {
                        return y(regrArr[index][comp_id] * regrArr[index][stdID]);
                    }
                }
                return y(d[stdID]);
            });

        // Draw the filled standard deviation band
        svg.append("path")
            .datum(regrArr)
            .attr("class", "std-band")
            .attr("fill", "rgba(224, 214, 224, 0.6)")  // Light gray/purple
            .attr("stroke", "none")
            .attr("d", areaGenerator);

        // Regression line (on top of the band)
        const regrLine = d3.line()
            .x(d => x(d.distance))
            .y(d => y(d[comp_id]));

        svg.append("path")
            .datum(regrArr)
            .attr("class", "regression-line")
            .attr("stroke", "#A971A8")
            .attr("stroke-width", 3)
            .attr("fill", "none")
            .attr("d", regrLine);
    }

    // Observed data scatter plot
    const symbolGenerator = d3.symbol();

    svg.selectAll(".point")
        .data(data)
        .enter().append("path")
        .attr("class", "point")
        .style("fill", d => d.color)
        .style("stroke", "#000000")
        .style("stroke-width", "1.5px")
        .style("cursor", "pointer")
        .attr("d", d => {
            if (d.obsType === 'seismic') {
                return symbolGenerator.type(d3.symbolTriangle).size(64)();
            } else {
                return symbolGenerator.type(d3.symbolCircle).size(64)();
            }
        })
        .attr("transform", d => `translate(${x(d.distance)},${y(d[comp_id])})`)
        .on("mouseover", function (event, d) {
            // Cancel any pending tooltip hide
            if (hideTooltipTimer) {
                clearTimeout(hideTooltipTimer);
                hideTooltipTimer = null;
            }

            // Highlight the point
            d3.select(this)
                .style("stroke-width", "3px")
                .style("fill-opacity", "0.7");

            // Show tooltip - Update content
            tooltip.html(
                `<strong>Station ID:</strong> ${d.id}<br/>` +
                `<strong>Station type:</strong> ${d.obsType}<br/>` +
                `<strong>Distance:</strong> ${d.distance.toFixed(3)} km<br/>` +
                `<strong>Intensity:</strong> ${d.intensity ? d.intensity.toFixed(1) : 'N/A'}<br/>` +
                `<strong>Intensity predicted:</strong> ${d.intensityPrediction ? d.intensityPrediction.toFixed(4) : 'N/A'}<br/>` +
                `<strong>PGA:</strong> ${d.pga ? d.pga.toFixed(4) : 'N/A'} %g<br/>` +
                `<strong>PGA pred:</strong> ${d.pgaPrediction ? d.pgaPrediction.toFixed(4) : 'N/A'} %g<br/>` +
                `<strong>PGV:</strong> ${d.pgv ? d.pgv.toFixed(4) : 'N/A'} cm/s<br/>` +
                `<strong>PGV pred:</strong> ${d.pgvPrediction ? d.pgvPrediction.toFixed(4) : 'N/A'} cm/s<br/>` +
                `<strong>Vs30:</strong> ${d.vs30 || 'N/A'} m/s`
            );

            // Move to current position immediately to avoid overlap with previous location
            // Use same offset logic as mousemove (simplified)
            const left = event.pageX + 20;
            const top = event.pageY - 20;

            tooltip
                .style("top", top + "px")
                .style("left", left + "px")
                .style("visibility", "visible");
        })
        .on("mousemove", function (event) {
            // Position tooltip near mouse with smart positioning to avoid cutoff
            const tooltipNode = tooltip.node();
            const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 200;
            const tooltipHeight = tooltipNode ? tooltipNode.offsetHeight : 150;

            // Increased offset to prevent cursor overlap/flickering
            let left = event.pageX + 20;
            let top = event.pageY - 20;

            // Check if tooltip would go off right edge of screen
            if (left + tooltipWidth > window.innerWidth + window.scrollX) {
                left = event.pageX - tooltipWidth - 20;
            }

            // Check if tooltip would go off bottom edge of screen
            if (top + tooltipHeight > window.innerHeight + window.scrollY) {
                top = event.pageY - tooltipHeight - 20;
            }

            // Check if tooltip would go off top edge
            if (top < window.scrollY) {
                top = event.pageY + 30; // Push it down below cursor if hit top
            }

            tooltip
                .style("top", top + "px")
                .style("left", left + "px");
        })
        .on("mouseout", function () {
            const self = this;
            // Debounce: delay hiding to absorb flicker cycles
            hideTooltipTimer = setTimeout(function () {
                d3.select(self)
                    .style("stroke-width", "1.5px")
                    .style("fill-opacity", "1");
                tooltip.style("visibility", "hidden");
                hideTooltipTimer = null;
            }, 100);
        });

    // Legend. The "Reported Intensity" (circle) entry is only meaningful in the
    // intensity plot; PGA/PGV show seismic stations only, so we drop that row and
    // shrink the box accordingly.
    const legendX = width - width * 0.21;
    const showReportedRow = comp_id === 'intensity';
    // Vertical anchor of the "Predicted" row depends on whether the reported row
    // is present.
    const predictedY = showReportedRow ? 65 : 40;
    const legendHeight = showReportedRow ? 90 : 65;

    svg.append("rect")
        .attr("x", legendX)
        .attr("y", 0)
        .attr("width", 200)
        .attr("height", legendHeight)
        .style("stroke", "#000000")
        .attr("stroke-width", 2)
        .style("fill", "#F0E0C0");

    svg.append("path")
        .attr("d", symbolGenerator.type(d3.symbolTriangle).size(64)())
        .style("fill", "#FFFFFF")
        .style("stroke", "#000000")
        .attr("transform", `translate(${legendX + 15}, 15)`);

    svg.append("text")
        .attr("x", legendX + 35)
        .attr("y", 15)
        .text("Seismic")
        .style("font-size", "15px")
        .attr("alignment-baseline", "middle");

    if (showReportedRow) {
        svg.append("path")
            .attr("d", symbolGenerator.type(d3.symbolCircle).size(64)())
            .style("fill", "#FFFFFF")
            .style("stroke", "#000000")
            .attr("transform", `translate(${legendX + 15}, 40)`);

        svg.append("text")
            .attr("x", legendX + 35)
            .attr("y", 40)
            .text("Reported Intensity")
            .style("font-size", "15px")
            .attr("alignment-baseline", "middle");
    }

    svg.append("rect")
        .attr("x", legendX + 8)
        .attr("y", predictedY + 4)
        .attr("width", 20)
        .attr("height", 4)
        .style("fill", "#A971A8");

    svg.append("text")
        .attr("x", legendX + 35)
        .attr("y", predictedY)
        .text("Predicted")
        .style("font-size", "15px")
        .attr("alignment-baseline", "middle");

    svg.append("text")
        .attr("x", legendX + 35)
        .attr("y", predictedY + 13)
        .text("(+/- 1 std dev)")
        .style("font-size", "15px")
        .attr("alignment-baseline", "middle");

    // Add X Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));

    svg.append("text")
        .attr("transform", `translate(${width / 2},${height + margin.top + 40})`)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Distance (km)");

    // Add Y Axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(tickNumber));

    let yVar = 'Intensity';
    if (comp_id === 'pga') {
        yVar = 'Peak ground acceleration (%g)';
    } else if (comp_id === 'pgv') {
        yVar = 'Peak ground velocity (cm/s)';
    }

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yVar);

    // Per-tab "Applied filters" caption under the plot, describing the exact
    // data-selection rules used for this component. Text is derived from
    // ANALYSIS_FILTERS so it stays in sync with the filtering logic above.
    plotElement.append("div")
        .attr("class", "analysis-filters-note")
        .style("margin-top", "8px")
        .style("font-size", "12px")
        .style("color", "#666")
        .style("font-style", "italic")
        .style("text-align", "center")
        .text(filtersNoteText(comp_id));
}
