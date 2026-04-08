/**
 * Static View Module - Static image viewer functionality
 * 
 * Handles the display of static ShakeMap images.
 */

let currentStaticEventId = null;

/**
 * Initialize the static view for an event
 * @param {string} id - Event ID
 */
function initStaticView(id) {
    currentStaticEventId = id;

    // Set default image (intensity)
    loadStaticImage('intensity');

    // Initialize event listeners if not already done
    if (!window.staticViewInitialized) {
        window.staticViewInitialized = true;

        // Image selector buttons
        document.querySelectorAll('.static-view-btn:not(.dropdown-toggle)').forEach(btn => {
            btn.addEventListener('click', function () {
                const imageType = this.getAttribute('data-image');
                if (imageType) {
                    loadStaticImage(imageType);

                    // Update active state
                    document.querySelectorAll('.static-view-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });

        // Dropdown toggle
        const dropdownToggle = document.getElementById('sa-dropdown');
        const dropdownMenu = document.getElementById('sa-menu');

        dropdownToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
            dropdownToggle.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.static-view-dropdown')) {
                dropdownMenu.classList.remove('show');
                dropdownToggle.classList.remove('open');
            }
        });

        // Dropdown items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function () {
                const imageType = this.getAttribute('data-image');
                loadStaticImage(imageType);

                // Update active state
                document.querySelectorAll('.static-view-btn').forEach(b => b.classList.remove('active'));
                dropdownToggle.classList.add('active');

                // Close dropdown
                dropdownMenu.classList.remove('show');
                dropdownToggle.classList.remove('open');
            });
        });
    }
}

/**
 * Load a static image
 * @param {string} imageType - Image type (intensity, pga, pgv, etc.)
 */
function loadStaticImage(imageType) {
    const img = document.getElementById('static-view-image');
    const imagePath = `${DATA_DIR}/${currentStaticEventId}/current/products/${imageType}.jpg`;

    // Set loading state
    img.style.opacity = '0.5';
    img.alt = 'Loading...';

    // Create a new image to preload
    const preloadImg = new Image();
    preloadImg.onload = function () {
        img.src = imagePath;
        img.style.opacity = '1';
        img.alt = `ShakeMap ${imageType} view`;
    };
    preloadImg.onerror = function () {
        img.src = '';
        img.alt = 'Image not available';
        img.style.opacity = '1';
    };
    preloadImg.src = imagePath;
}

// Export to global scope
window.initStaticView = initStaticView;
window.loadStaticImage = loadStaticImage;
