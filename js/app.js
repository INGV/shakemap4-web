/**
 * ShakeMap App - Core Module
 * 
 * Entry point for the ShakeMap web application.
 * Handles initialization, routing, and data loading.
 * 
 * Dependencies:
 * - config.js (must be loaded first)
 * - All other modules (home.js, archive.js, etc.)
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
});

/**
 * Initialize the application
 */
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

/**
 * Load all events from the events.json file
 */
async function loadEvents() {
    try {
        const response = await fetch(EVENTS_JSON);
        if (!response.ok) throw new Error('Failed to load events.json');

        const data = await response.json();

        // Flatten data
        ShakeMap.allEvents = [];
        for (const year in data) {
            for (const month in data[year]) {
                data[year][month].forEach(event => {
                    ShakeMap.allEvents.push(event);
                });
            }
        }

        // Apply mandatory bBox filter if defined
        if (typeof config !== 'undefined' && config.bBox && Array.isArray(config.bBox) && config.bBox.length > 0) {
            ShakeMap.allEvents = ShakeMap.allEvents.filter(event => {
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
        ShakeMap.allEvents.sort((a, b) => {
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

/**
 * Handle URL hash-based routing
 */
function handleRoute() {
    const hash = window.location.hash;

    // Hide all views
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-archive').classList.add('hidden');
    document.getElementById('view-details').classList.add('hidden');
    document.getElementById('view-markdown').classList.add('hidden');

    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    if (!hash || hash === '#') {
        document.getElementById('nav-home').classList.add('active');
        showHome();
    } else if (hash === '#archive') {
        document.getElementById('nav-archive').classList.add('active');
        showArchive();
    } else if (hash === '#disclaimer') {
        showMarkdownPage(config.disclaimerPage);
    } else if (hash === '#contributors') {
        showMarkdownPage(config.contributorsPage);
    } else if (hash.startsWith('#event/')) {
        const id = hash.split('/')[1];
        showEventDetails(id);
    } else {
        showHome();
    }
}

/**
 * Fetch a Markdown file, render it as HTML, and display it
 * @param {string} mdPath - Path to the Markdown file
 */
async function showMarkdownPage(mdPath) {
    const container = document.getElementById('markdown-content');
    const view = document.getElementById('view-markdown');

    try {
        const response = await fetch(mdPath);
        if (!response.ok) throw new Error(`Failed to load ${mdPath}`);

        const mdText = await response.text();
        container.innerHTML = marked.parse(mdText);
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p>Error loading content.</p>';
    }

    view.classList.remove('hidden');
}

/**
 * Switch between tabs in the event details view
 * @param {string} tabName - Name of the tab to switch to
 */
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
            const event = ShakeMap.allEvents.find(e => e.id == id);
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
        if (ShakeMap.map) {
            setTimeout(() => {
                ShakeMap.map.invalidateSize();
            }, 100);
        }
    }
};
