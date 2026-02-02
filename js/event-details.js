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

// Export to global scope
window.showEventDetails = showEventDetails;
