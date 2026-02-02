/**
 * Metadata Module - Metadata tab functionality
 * 
 * Handles the display of event metadata from info.json.
 */

/**
 * Show metadata for an event
 * @param {string} id - Event ID
 */
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

/**
 * Render a metadata section
 * @param {HTMLElement} container - Container element
 * @param {string} title - Section title
 * @param {Object} data - Section data
 */
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

/**
 * Recursively render metadata content
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Data to render
 */
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

// Export to global scope
window.showMetadata = showMetadata;
