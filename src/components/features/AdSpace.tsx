
interface AdSpaceProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para espacios publicitarios (Banners 300x250 de Adsterra)
 */
interface AdSpaceProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para espacios publicitarios (Banners 300x250 de Adsterra)
 * Usa un iframe con srcDoc para aislar el script legacy y permitir su ejecución
 * sin interferir con el ciclo de vida de React.
 */
function AdSpace({ className = "", style }: AdSpaceProps) {
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 250px;
            background: transparent;
          }
        </style>
      </head>
      <body>
        <script type="text/javascript">
          atOptions = {
            'key': 'd1c3f3974459f71dfabd40e46ad89a97',
            'format': 'iframe',
            'height': 250,
            'width': 300,
            'params': {}
          };
        </script>
        <script type="text/javascript" src="https://www.highperformanceformat.com/d1c3f3974459f71dfabd40e46ad89a97/invoke.js"></script>
      </body>
    </html>
  `;

  return (
    <div
      className={`bg-transparent rounded-lg flex items-center justify-center overflow-hidden ${className}`}
      style={{ minHeight: "250px", width: "100%", ...style }}
    >
      <iframe
        srcDoc={iframeSrcDoc}
        width="300"
        height="250"
        frameBorder="0"
        scrolling="no"
        style={{ border: "none", overflow: "hidden", display: "block" }}
      />
    </div>
  );
}

export default AdSpace;
