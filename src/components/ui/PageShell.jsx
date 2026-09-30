/**
 * Contenedor de pagina con ancho maximo y padding alineados al sistema Viruflix.
 * Usa la clase `viru-page-shell` (tokens en variables.css / viru-ui.css).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {boolean} [props.asMain] Si true, renderiza <main> (accesibilidad en paginas sin Layout).
 */
function PageShell({ children, className = '', asMain = false }) {
  const cls = `viru-page-shell ${className}`.trim();
  if (asMain) {
    return <main className={cls}>{children}</main>;
  }
  return <div className={cls}>{children}</div>;
}

export default PageShell;
