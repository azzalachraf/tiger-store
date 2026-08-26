export function ThemeBootstrap() {
  const script = `(()=>{try{const p=localStorage.getItem('tiger-store-theme');const dark=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark);}catch{}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
