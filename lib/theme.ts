export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

// 첫 페인트 전에 동기 실행되는 인라인 스크립트. 저장된 테마(없으면 시스템 설정)를 <html>에 적용해
// 새로고침 시 깜빡임을 막는다. hooks/use-theme.ts의 applyTheme과 같은 로직을 유지해야 한다.
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
