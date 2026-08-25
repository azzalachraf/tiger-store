export function ThemeBootstrap() {
  const script = `(()=>{try{const l=localStorage.getItem('tiger-store-locale');const locale=['ar','en','fr'].includes(l||'')?l:(navigator.language||'en').toLowerCase().startsWith('ar')?'ar':(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en';document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';const p=localStorage.getItem('tiger-store-theme');const theme=['light','dark','system'].includes(p||'')?p:'system';document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));}catch{}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
