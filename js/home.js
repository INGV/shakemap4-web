/**
 * Home Module - Home page functionality
 * 
 * Handles the display of latest events on the home page.
 */

/**
 * Show the Home view with latest events
 */
function showHome() {
    const view = document.getElementById('view-home');
    view.classList.remove('hidden');

    // Show latest 12 events for better grid alignment
    const latestEvents = ShakeMap.allEvents.slice(0, 12);
    renderCards(latestEvents, 'latest-events-cards');
}

/**
 * Render event cards into a container
 * @param {Array} events - Array of event objects
 * @param {string} containerId - ID of the container element
 */
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

        const riBadge = (event.hasRI === true && config.enableReportedIntensity)
            ? '<span class="ri-badge" title="Reported Intensity data available">RI</span>'
            : '';

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
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="event-id">Event ID: ${event.id}</div>
                            ${riBadge}
                        </div>
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

// Export to global scope
window.showHome = showHome;
window.renderCards = renderCards;
