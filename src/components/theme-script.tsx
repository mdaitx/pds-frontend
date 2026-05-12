/** Script síncrono (antes da hidratação) para evitar flash ao carregar tema salvo */
export function ThemeScript() {
  const script = `(function(){try{
    var k=${JSON.stringify('pds-theme')};
    var t=localStorage.getItem(k);
    if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}
    else if(t==='light'){document.documentElement.removeAttribute('data-theme');}
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
