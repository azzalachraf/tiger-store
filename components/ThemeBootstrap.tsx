export function ThemeBootstrap() {
  const script = `(()=>{try{const p=localStorage.getItem('tiger-store-theme');const theme=['light','dark','system'].includes(p||'')?p:'system';document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));}catch{}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
