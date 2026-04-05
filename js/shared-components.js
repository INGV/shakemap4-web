/**
 * Shared Components Module
 * Centralizes common HTML elements shared across multiple pages
 * Single source of truth for headers, banners, and other duplicated content
 * 
 * Note: Configuration values are loaded from config.js
 */


/**
 * Inject common stylesheets into the head
 */
function injectCommonStylesheets() {
    const head = document.head;

    // Style CSS
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = 'css/style.css';
    head.appendChild(styleLink);

    // Analysis CSS
    const analysisLink = document.createElement('link');
    analysisLink.rel = 'stylesheet';
    analysisLink.href = 'css/analysis.css';
    head.appendChild(analysisLink);

    // Font Awesome
    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    head.appendChild(fontAwesomeLink);
}

/**
 * Create and inject the header navigation
 * @param {string} currentPage - 'index' or 'analysis'
 */
function injectHeader(currentPage = 'index') {
    // Generate dropdown items from informationLinks config
    let dropdownItemsHTML = '';
    if (typeof informationLinks !== 'undefined' && informationLinks.length > 0) {
        dropdownItemsHTML = informationLinks.map(item => {
            if (item.type === 'separator') {
                return '<hr class="nav-dropdown-divider">';
            } else if (item.type === 'internal') {
                return `<a href="${item.link}" class="nav-dropdown-item">${item.text}</a>`;
            }
            return `<a href="${item.link}" class="nav-dropdown-item" target="_blank" rel="noopener noreferrer">${item.text}</a>`;
        }).join('');
    }

    const headerHTML = `
        <div class="container header-content">
            <div class="logo">
                <h1>ShakeMap <span class="version">v4</span></h1>
            </div>
            <nav>
                <ul>
                    <li><a href="${currentPage === 'index' ? '#' : 'index.html'}" class="nav-link ${currentPage === 'index' ? 'active' : ''}" id="nav-home">HOME</a></li>
                    <li><a href="${currentPage === 'index' ? '#archive' : 'index.html#archive'}" class="nav-link" id="nav-archive">ARCHIVE</a></li>
                    <li class="nav-dropdown">
                        <a href="#" class="nav-link nav-dropdown-toggle" id="nav-information">
                            INFORMATION <i class="fas fa-caret-down"></i>
                        </a>
                        <div class="nav-dropdown-menu">
                            ${dropdownItemsHTML}
                        </div>
                    </li>
                </ul>
            </nav>
        </div>
    `;

    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = headerHTML;

        // Add dropdown toggle functionality
        const dropdownToggle = header.querySelector('.nav-dropdown-toggle');
        const dropdownMenu = header.querySelector('.nav-dropdown-menu');

        if (dropdownToggle && dropdownMenu) {
            dropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                dropdownMenu.classList.toggle('show');
                dropdownToggle.classList.toggle('open');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-dropdown')) {
                    dropdownMenu.classList.remove('show');
                    dropdownToggle.classList.remove('open');
                }
            });
        }
    }
}

/**
 * Create and inject the banner section
 */
function injectBanner() {
    const bannerHTML = `
        <img src="${config.bannerImage}" alt="ShakeMap4 Banner" onerror="this.style.display='none'">
    `;

    const banner = document.querySelector('.banner');
    if (banner) {
        banner.innerHTML = bannerHTML;
    }
}


/**
 * Render the footer with disclaimer, logos, and version info
 * Centralizes footer generation to avoid duplication
 */
function renderFooter() {
    if (typeof config === 'undefined') return;

    const footerContainer = document.querySelector('footer .container');
    if (!footerContainer) return;

    footerContainer.innerHTML = `
        <div class="footer-info">
            <span id="footer-version">Website Version: ${config.version}</span>
            <span id="footer-github">Development of this portal has been made by INGV and it is publicly available at <a href="${config.githubLink}" target="_blank">GitHub INGV/shakemap4-web</a></span>
        </div>
    `;
}

/**
 * Initialize all shared components
 * Call this function when the DOM is ready
 * @param {string} currentPage - 'index' or 'analysis'
 */
function initSharedComponents(currentPage = 'index') {
    injectCommonStylesheets();
    injectHeader(currentPage);
    injectBanner();

    renderFooter();
}

// Auto-initialize when DOM is loaded if not already initialized
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Determine current page from filename
        const currentPage = window.location.pathname.includes('analysis.html') ? 'analysis' : 'index';
        initSharedComponents(currentPage);
    });
} else {
    // DOM already loaded
    const currentPage = window.location.pathname.includes('analysis.html') ? 'analysis' : 'index';
    initSharedComponents(currentPage);
}
