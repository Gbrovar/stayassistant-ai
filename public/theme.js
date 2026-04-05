const THEME_KEY = "stayassistant_theme";

export function setTheme(theme) {

    if (!theme) theme = "default";

    document.documentElement.setAttribute("data-theme", theme);

    localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "default";
}

export function initTheme() {
    const saved = getTheme();
    setTheme(saved);
}