/**
 * Event Details Module - Event details page functionality
 *
 * Handles the display of event details and metadata.
 */

/**
 * Show the Event Details view for a specific event
 * @param {string} id - Event ID
 */
async function showEventDetails(id) {
    const view = document.getElementById('view-details');
    view.classList.remove('hidden');

    const event = ShakeMap.allEvents.find(e => e.id == id);
    if (!event) {
        view.innerHTML = '<div class="error">Event not found.</div>';
        return;
    }

    // Set the active data source to the base event ID
    ShakeMap.activeDataId = id;

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

    // Configure data source toggle
    const toggleContainer = document.getElementById('data-source-toggle');
    const toggleRI = document.getElementById('toggle-reported-intensity');
    const toggleInstr = document.getElementById('toggle-instrumental');

    toggleContainer.style.display = 'flex';
    toggleInstr.classList.add('active');
    toggleRI.classList.remove('active');
    toggleRI.disabled = true;

    // Check if Reported Intensity data exists
    try {
        const riCheckRes = await fetch(`${DATA_DIR}/${id}_ri/current/products/info.json`, { method: 'HEAD' });
        if (riCheckRes.ok) {
            toggleRI.disabled = false;
        }
    } catch (e) {
        // Reported Intensity data does not exist, button stays disabled
    }

    // Reset to Map tab
    switchTab('map');

    // Initialize Map
    initMap(event);
}

/**
 * Switch between Instrumental and Reported Intensity data sources
 * @param {string} source - 'instrumental' or 'reported-intensity'
 */
window.setDataSource = function (source) {
    const hash = window.location.hash;
    const baseId = hash.split('/')[1];
    const toggleRI = document.getElementById('toggle-reported-intensity');
    const toggleInstr = document.getElementById('toggle-instrumental');

    if (source === 'reported-intensity') {
        if (toggleRI.disabled) return;
        ShakeMap.activeDataId = baseId + '_ri';
        toggleRI.classList.add('active');
        toggleInstr.classList.remove('active');
    } else {
        ShakeMap.activeDataId = baseId;
        toggleInstr.classList.add('active');
        toggleRI.classList.remove('active');
    }

    // Reload the currently active tab with the new data source
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn) {
        const tabName = activeTabBtn.id.replace('tab-', '');

        if (tabName === 'map') {
            const event = ShakeMap.allEvents.find(e => e.id == baseId);
            if (event) {
                const mappedEvent = Object.assign({}, event, { id: ShakeMap.activeDataId });
                initMap(mappedEvent, { enableMacroseismic: source === 'reported-intensity' });
            }
        } else {
            switchTab(tabName);
        }
    }
};

// Export to global scope
window.showEventDetails = showEventDetails;
