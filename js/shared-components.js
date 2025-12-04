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
    const headerHTML = `
        <div class="container header-content">
            <div class="logo">
                <h1>ShakeMap <span class="version">v4</span></h1>
            </div>
            <nav>
                <ul>
                    <li><a href="${currentPage === 'index' ? '#' : 'index.html'}" class="nav-link ${currentPage === 'index' ? 'active' : ''}" id="nav-home">HOME</a></li>
                    <li><a href="${currentPage === 'index' ? '#archive' : 'index.html#archive'}" class="nav-link" id="nav-archive">ARCHIVE</a></li>
                    <li><a href="#" class="nav-link">INFORMATION <i class="fas fa-caret-down"></i></a></li>
                    <li><button id="theme-toggle" class="nav-link" style="background:none; border:none; cursor:pointer;"><i class="fas fa-moon"></i></button></li>
                </ul>
            </nav>
        </div>
    `;

    const header = document.querySelector('header');
    if (header) {
        header.innerHTML = headerHTML;
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
 * Initialize theme toggle functionality
 */
function initTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    if (!icon) return;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.replace('fa-moon', 'fa-sun');
    }

    toggleBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            icon.classList.replace('fa-sun', 'fa-moon');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            icon.classList.replace('fa-moon', 'fa-sun');
        }
    });
}

/**
 * Render the footer with disclaimer, logos, and version info
 * Centralizes footer generation to avoid duplication
 */
function renderFooter() {
    if (typeof config === 'undefined') return;

    const footerContainer = document.querySelector('footer .container');
    if (!footerContainer) return;

    // Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'footer-toggle';
    toggleBtn.textContent = 'Show Disclaimer';
    toggleBtn.onclick = () => {
        const content = document.getElementById('disclaimer-content');
        content.classList.toggle('hidden');
        toggleBtn.textContent = content.classList.contains('hidden') ? 'Show Disclaimer' : 'Hide Disclaimer';
    };

    // Create Disclaimer Container
    const disclaimerDiv = document.createElement('div');
    disclaimerDiv.id = 'disclaimer-content';
    disclaimerDiv.className = 'hidden';
    disclaimerDiv.innerHTML = `
        <div id="disclaimer-container">
            <p class="disclaimer-text">${config.disclaimer.it}</p>
            <hr class="disclaimer-separator">
            <p class="disclaimer-text">${config.disclaimer.en}</p>
        </div>
    `;

    // Create Static Content (Logos + Info)
    const staticDiv = document.createElement('div');
    staticDiv.innerHTML = `
        <div id="logos-container">
            <img src="${config.logosPath}" alt="Participating Institutions">
        </div>
        <div class="footer-info">
            <span id="footer-version">Website Version: ${config.version}</span>
            <span id="footer-github">Development of this portal has been made by INGV and it is publicly available at <a href="${config.githubLink}" target="_blank">GitHub INGV/shakemap4-web</a></span>
        </div>
    `;

    footerContainer.innerHTML = '';
    footerContainer.appendChild(toggleBtn);
    footerContainer.appendChild(disclaimerDiv);
    footerContainer.appendChild(staticDiv);
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
    initTheme();
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
