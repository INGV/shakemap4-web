/**
 * Utils Module - Shared utility functions
 * 
 * This module contains helper functions used across multiple modules.
 */

/**
 * Helper to format unit strings
 * Converts "cms" -> "cm/s"
 * Converts "pctg" -> "%g"
 */
function formatUnit(unit) {
    if (!unit) return '';
    let u = unit.toLowerCase();
    if (u.includes('cms')) {
        return u.replace('cms', 'cm/s');
    }
    if (u.includes('pctg')) {
        return u.replace('pctg', '%g');
    }
    return unit;
}

// Export to global scope
window.formatUnit = formatUnit;
