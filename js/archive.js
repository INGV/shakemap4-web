/**
 * Archive Module - Archive page functionality
 * 
 * Handles the archive view with filtering capabilities.
 */

/**
 * Show the Archive view
 */
function showArchive() {
    const view = document.getElementById('view-archive');
    view.classList.remove('hidden');

    // Show all events initially (or filtered)
    applyArchiveFilters();
}

/**
 * Apply filters to the archive view
 */
function applyArchiveFilters() {
    const year = document.getElementById('year-filter').value;
    const minMag = parseFloat(document.getElementById('mag-filter').value);

    let filtered = ShakeMap.allEvents;

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
                if (period === 'instrumental') {
                    return eventDate >= cutOffDate;
                } else {
                    return eventDate < cutOffDate;
                }
            });
        }
    }

    renderCards(filtered, 'archive-events-cards');
}

/**
 * Populate the year filter dropdown based on available events
 */
function populateYearFilter() {
    const select = document.getElementById('year-filter');
    const period = document.getElementById('period-filter').value;

    // Clear existing options except "All"
    select.innerHTML = '<option value="">All</option>';

    if (period === 'historical') {
        // If historical, we only show "All" (which is already there)
        return;
    }

    // Instrumental events: Filter valid years
    let relevantEvents = ShakeMap.allEvents;
    if (typeof config !== 'undefined' && config.historicalCutOff) {
        const parts = config.historicalCutOff.split('-'); // e.g. "2000-01-01"
        if (parts.length === 3) {
            const cutOffYear = parseInt(parts[0]);
            const cutOffMonth = parseInt(parts[1]) - 1;
            const cutOffDay = parseInt(parts[2]);
            const cutOffDate = new Date(cutOffYear, cutOffMonth, cutOffDay);

            relevantEvents = ShakeMap.allEvents.filter(e => {
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

// Export to global scope
window.showArchive = showArchive;
window.applyArchiveFilters = applyArchiveFilters;
window.populateYearFilter = populateYearFilter;
