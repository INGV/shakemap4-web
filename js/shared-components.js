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
    if (typeof config !== 'undefined' && config.informationLinks && config.informationLinks.length > 0) {
        dropdownItemsHTML = config.informationLinks.map(item => {
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
                <a href="${currentPage === 'index' ? '#' : 'index.html'}" class="logo-link"><h1>ShakeMap <span class="version">v4</span></h1></a>
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

            // Close dropdown when clicking on a dropdown item
            dropdownMenu.querySelectorAll('.nav-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    dropdownMenu.classList.remove('show');
                    dropdownToggle.classList.remove('open');
                });
            });
        }
    }
}

/**
 * Render a single banner slot (left or right) based on its type.
 * @param {Object} slot - Slot configuration { type, ... }
 * @returns {string} HTML string
 */
function renderBannerSlot(slot) {
    if (!slot) return '';

    switch (slot.type) {
        case 'logo':
            return `<img class="banner-logo" src="${slot.src}" alt="${slot.alt || ''}"
                         style="max-height: ${slot.maxHeight || '80px'}">`;

        case 'text': {
            const classes = ['banner-text'];
            if (slot.style) {
                if (slot.style.includes('bold')) classes.push('banner-text--bold');
                if (slot.style.includes('uppercase')) classes.push('banner-text--uppercase');
            }
            const fontSize = slot.fontSize ? `font-size: ${slot.fontSize};` : '';
            return `<span class="${classes.join(' ')}" style="${fontSize}">${slot.content}</span>`;
        }

        case 'logos-grid': {
            const cols = slot.columns || 2;
            const logosHTML = slot.logos.map(logo =>
                `<img class="banner-grid-logo" src="${logo.src}" alt="${logo.alt || ''}">`
            ).join('');
            return `<div class="banner-logos-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
                        ${logosHTML}
                    </div>`;
        }

        case 'logos-row': {
            const logosHTML = slot.logos.map(logo =>
                `<img class="banner-row-logo" src="${logo.src}" alt="${logo.alt || ''}">`
            ).join('');
            return `<div class="banner-logos-row">${logosHTML}</div>`;
        }

        default:
            return '';
    }
}

/**
 * Create and inject the banner section.
 * Supports two modes:
 *   1. HTML banner (config.banner) - declarative layout with text and logos
 *   2. Legacy image banner (config.bannerImage) - single image fallback
 */
function injectBanner() {
    const bannerEl = document.querySelector('.banner');
    if (!bannerEl) return;

    // New HTML banner mode (5-slot: up/left/center/right/down)
    if (config.banner) {
        const banner = config.banner;

        if (banner.backgroundColor) {
            bannerEl.style.backgroundColor = banner.backgroundColor;
        }

        const upHTML = renderBannerSlot(banner.up);
        const leftHTML = renderBannerSlot(banner.left);
        const centerHTML = renderBannerSlot(banner.center);
        const rightHTML = renderBannerSlot(banner.right);
        const downHTML = renderBannerSlot(banner.down);
        const hasMiddle = leftHTML || centerHTML || rightHTML;

        let html = '<div class="banner-content">';

        if (upHTML) {
            html += `<div class="banner-row banner-row--top">
                        <div class="banner-slot banner-up">${upHTML}</div>
                     </div>`;
        }
        if (hasMiddle) {
            html += '<div class="banner-row banner-row--middle">';
            if (leftHTML)   html += `<div class="banner-slot banner-left">${leftHTML}</div>`;
            if (centerHTML) html += `<div class="banner-slot banner-center">${centerHTML}</div>`;
            if (rightHTML)  html += `<div class="banner-slot banner-right">${rightHTML}</div>`;
            html += '</div>';
        }
        if (downHTML) {
            html += `<div class="banner-row banner-row--bottom">
                        <div class="banner-slot banner-down">${downHTML}</div>
                     </div>`;
        }

        html += '</div>';
        bannerEl.innerHTML = html;
        return;
    }

    // Legacy fallback: single image mode
    if (config.bannerImage) {
        bannerEl.innerHTML = `
            <img src="${config.bannerImage}" alt="ShakeMap4 Banner" onerror="this.style.display='none'">
        `;
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
            <span id="footer-version">${config.version}</span>
            <span class="footer-separator">·</span>
            <span id="footer-github">Developed by INGV · <a href="${config.githubLink}" target="_blank">GitHub</a></span>
            <span class="footer-separator">·</span>
            |
            <span class="footer-separator">·</span>
            <span id="footer-license"><a rel="license" href="https://creativecommons.org/licenses/by/4.0/"><span class="cnt-cc-88x31"></span></a></span>
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
