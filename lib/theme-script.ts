export const THEME_STORAGE_KEY = "theme";

/** Runs before first paint so the stored or system theme never flashes. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="ink"&&t!=="paper"){t=matchMedia("(prefers-color-scheme: light)").matches?"paper":"ink"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="ink"}})()`;
