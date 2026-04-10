/**
 * Products Module - Products tab functionality
 * 
 * Handles the display and download of ShakeMap products.
 */

/**
 * Show products for an event
 * @param {string} id - Event ID
 */
async function showProducts(id) {
    const container = document.getElementById('products-list');
    container.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        // Load static products list
        const res = await fetch('productsListToProcess.json');
        if (!res.ok) throw new Error('Products list not found');

        const allProducts = await res.json();

        // Check which files exist and group by category
        const categories = {};
        const existenceChecks = [];

        // Create promises for all file existence checks
        for (const product of allProducts) {
            const fileUrl = `${DATA_DIR}/${id}/current/products/${product.name}`;

            // Use HEAD request to check if file exists
            const checkPromise = fetch(fileUrl, { method: 'HEAD' })
                .then(checkRes => {
                    if (checkRes.ok) {
                        // File exists, add to category
                        if (!categories[product.cat]) {
                            categories[product.cat] = [];
                        }
                        categories[product.cat].push({
                            name: product.name,
                            desc: product.desc
                        });
                    }
                })
                .catch(() => {
                    // File doesn't exist or error, skip silently
                });

            existenceChecks.push(checkPromise);
        }

        // Wait for all checks to complete
        await Promise.all(existenceChecks);

        // Clear loading message
        container.innerHTML = '';

        // Check if any products were found
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p>No products available for this event</p>';
            return;
        }

        // Define category order
        const order = [
            "Peak Ground Motion Maps",
            "Contours and shape files",
            "Rasters and grid",
            "Regressions",
            "Other files"
        ];

        // Render ordered categories
        order.forEach(catName => {
            if (categories[catName]) {
                renderCategory(container, id, catName, categories[catName]);
                delete categories[catName];
            }
        });

        // Render remaining categories (if any)
        for (const catName in categories) {
            renderCategory(container, id, catName, categories[catName]);
        }

    } catch (e) {
        console.warn('Failed to load products', e);
        container.innerHTML = '<p>Could not load product list.</p>';
    }
}

/**
 * Helper function to determine if file is viewable in browser
 * @param {string} filename - File name
 * @returns {boolean}
 */
function isViewableInBrowser(filename) {
    const viewableExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',  // Images
        'pdf',                                        // PDF
        'json', 'geojson',                           // JSON
        'txt', 'xml', 'html', 'css', 'js',          // Text files
        'csv'                                         // CSV
    ];
    const ext = filename.split('.').pop().toLowerCase();
    return viewableExtensions.includes(ext);
}

/**
 * Render a category of products
 * @param {HTMLElement} container - Container element
 * @param {string} id - Event ID
 * @param {string} catName - Category name
 * @param {Array} items - Array of product items
 */
function renderCategory(container, id, catName, items) {
    const section = document.createElement('div');
    section.className = 'product-category';

    const header = document.createElement('h3');
    header.className = 'category-header collapsed'; // Closed by default
    header.innerHTML = `<span>${catName}</span> <i class="fas fa-chevron-down"></i>`;

    const content = document.createElement('div');
    content.className = 'category-body hidden'; // Hidden by default

    const table = document.createElement('table');
    table.className = 'product-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>File name</th>
                <th>Description</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');
    items.forEach(item => {
        const tr = document.createElement('tr');
        const fileUrl = `${DATA_DIR}/${id}/current/products/${item.name}`;
        const isViewable = isViewableInBrowser(item.name);

        // Build action buttons with consistent alignment
        const viewButton = isViewable
            ? `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="btn-view" title="Preview in browser"><i class="fas fa-eye"></i></a>`
            : `<span class="btn-placeholder"></span>`;
        const downloadButton = `<a href="${fileUrl}" download class="btn-download" title="Download"><i class="fas fa-download"></i></a>`;

        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.desc}</td>
            <td class="actions-cell">${viewButton}${downloadButton}</td>
        `;
        tbody.appendChild(tr);
    });

    content.appendChild(table);

    // Collapsible logic
    header.addEventListener('click', () => {
        content.classList.toggle('hidden');
        header.classList.toggle('collapsed');
    });

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
}

// Export to global scope
window.showProducts = showProducts;
