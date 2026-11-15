/** Where the theme choice is kept: "dark", "light", or nothing (follow the system). */
export const THEME_KEY = "lighttime.theme";

/** Runs in the page head before the first paint: the saved theme, else the system's, so the page never flashes the wrong one. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
