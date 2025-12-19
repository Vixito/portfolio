- **Componentes**
  No pongas componentes propios, porque ya hay librerías con diseños que sí me han gustado, excepto cuando yo te diga.
  - Descargar CV
    Que quede tal cual así y que esté ubicado en la página de Work Experience:
    ![image.png](attachment:58ab9072-c535-44b6-9c49-5e958c997d64:image.png)
  - Estado actual
    Habrá algo parecido a esto:
    ![image.png](attachment:2d5e5638-f1a6-4692-96e6-0629b9c351f0:image.png)
    Entonces ese botón verde tendrá distintos colores: verde para indicar que estoy disponible para nuevos proyectos, amarillo porque estoy ausente o afk, y rojo para indicar que no estoy disponible.
    Al hacer click a todo el cuadro (no solo el botón):
    - Cuando esté en verde que mande a la página de la Tienda
    - Cuando esté en amarillo que mande un aviso con un modal preguntando más o menos ¿Estás seguro? Puede que tarde en responder por distintos motivos.
    - Cuando esté en rojo que se provoque un shake en el hero con luces rojas alrededor y que no haya redirección, incluso directamente sin mostrar una indicación del mouse para hacer click (usualmente se ve en los hover).
  - Languages
    - Español (predeterminado)
    - Inglés
      El cómo cambiarlo quiero que haya en todo el proyecto el logotipo de un globo terraqueo (creo que era ese ícono pero se entiende la idea) girando horizontalmente y al lado el idioma, y tendrá un dropdown (hacia arriba o hacia abajo) para elegir uno.
  - Donaciones
    Así como los Languages, también irá en todo el proyecto en una esquina un círculo decorativo que represente un dropdown (hacia arriba o hacia abajo) de los enlaces para donar.
  - Hero
    Digamos que todo el tiempo habrá un Hero en la Home, porque el desplazamiento no será vertical sino horizontal de forma fluida (esto sería gracias a una librería de animación), donde cada parte del desplazamiento será enfocada en el nav.
    En cuanto al nav, que quede así como este (tal cual): https://codepen.io/gh-o-st/pen/QWerXVy
  - Pricing
    Solo usaremos Airtm, por ahora el pago será de forma manual y al final de hacer del submit que salga confetti y se le redirija a un envío de correo y a dos links (que nunca se redirija a un about:blank por favor): https://airtm.me/Vixis y https://app.airtm.com/ivt/vixis.
    Todo esto será después de hacer checking en el carrito.
    Pero, si es de forma automática (ya no manual):
    No será de acceso público y será adaptativo, es decir, los productos de la tienda es todo lo que yo ofrezco para vender pero no se podrá pagar (incluso ni se podrá ver los precios). Esto porque para los precios se adaptan a la región, divisa, etc. Por ejemplo, el precio el cliente lo puede cambiar a cualquier divisa si éste lo quiere (COP, USD, BTC, etc.) pero habrá un precio base después de ciertos filtros (un ejemplo sería que un cliente quiera una eCommerce, entonces en el Checkout estaría registrando la región, el email, etc., datos así al comprar; entonces con eso se tendría un precio adaptado a ciertos parámetros así que supongamos que el precio base de una eCommerce para la región de Colombia serían 1000 dólares entonces el precio final se adaptaría a 1 dólar = $4000 COP así que 4000 _ 1000 = $4000000 COP; pero, eso sería para el precio base del dólar así que se adaptará también al precio del dólar en tiempo real o lo máximo posible así que por ejemplo hoy el dolar estaría a 3750 y mañana a 3850 así que se calcula con esos valores; lo mismo pero en vez de Colombia sería Estados Unidos, ya no serían 1000 dólares de precio final sino 1500 teniendo en cuenta el precio base del dólar = $4000 COP siempre, entonces si el día actual el dolar cuesta 3900 entonces se calcula 3900 _ 1500 = precio en Estados Unidos para esa eCommerce). Es algo que siempre quise hacer para mis Pricing porque incluso será diferente ya que directamente en la Tienda (o Store) no se pagará sino que se enviará la "Petición" como si fuera el formulario que está en Status pero ya directamente, luego yo le estaría enviando el link del Pricing con el precio ya adaptado totalmente teniendo en cuenta los datos enviados por el cliente en el Checkout antes de enviar la petición. Ya con eso se procede al pago por medio de la API de Airtm.
  - Provenientes de SmoothUI
    - Carrousel
    - Button
    - Input
    - Progress Bar
    - Dropdown
    - Modal
    - Toast
    - Scramble Hover
    - Typewriter Text
      - En el título de la pestaña
    - AI Input
    - Cursor Follow
      - No quiero que se muestre el puntero del mouse por defecto, una personalización a esto me encantaría mucho y mejor si queda de color azul.
    - Dynamic Island
    - Expandable Cards
    - Phototab
    - User Account Avatar
  - Loading
    Si en dado caso en cada ruta del proyecto se tenga que cargar algo, que presente este loading: https://codepen.io/aaroniker/pen/gOwEjBr.
    Pero en principio, quiero que haya transición en las páginas o rutas para que haya un cambio fluido.
    Hay diseños que también me gustaría implementar pero no sabría de qué forma:
  - Este no sería para tarjetas sino para cosas valiosas del proyecto: https://codepen.io/blacklead-studio/pen/xbwaqxE
  - Esto me gustaría ver cuando se añada algo al carrito (obviamente será en la página de la Tienda): https://codepen.io/jh3y/pen/emJdWYE
  - https://codepen.io/Cubiq-ish/pen/RNrwdBW
  - Me encantaría tabular elementos pequeños con esto: https://codepen.io/osmosupply/pen/vEBeKJz
- **Pages**
  Todas las páginas (menos la Home) tendrán desplazamiento vertical.
  - About.tsx
    Aquí habría un Título y un texto estilo Lorem Ipsum, una foto a la derecha que debajo tenga un botón sin background que rediriga a la página Socials con texto “Sígueme en las redes sociales”, es todo.
  - Blog.tsx
    No será un blog propio sino que tendrán links para redireccionar a las aplicaciones que yo uso para hacer blogs (un ejemplo sería Medium), así que quiero que como “muestra” se muestre el título, la miniatura, y un contenido incompleto para causar ese “enganche”.
    La lista será vertical, sin aplicar estilo Pinterest pero que sí sea paginado para no aplicar scroll infinito.
  - Clients.tsx
    Aquí tendrá un título en el centro y una lista como si fuese tabla, pero que no tenga borde sino como una lista paginada que en cada área tenga el logo, el nombre, la descripción, y el link del enlace de cada cliente.
    También un Carrousel con los distintos logos, no sabría darte más detalles.
    Y un apartado de Testimonios estilo Pinterest, más o menos así:
    ![image.png](attachment:4d3c6bcd-9ce4-473a-b73b-f4f5e5c8affb:image.png)
  - Socials.tsx
    Tendré mis redes sociales y contacto para que se comunique cada persona directamente conmigo: `https://vixis.dev/socials`
    - El dominio `https://vixis.dev/contact` será redirigido a `/socials`
    - Cada enlace tendrá si título, descripción, logo, y el link del enlace.
    - Será una lista páginada pero sin bordes ni páginas ni estilo Pinterest, que haya ese “scroll infinito” o algo así.
  - Studies.tsx
  - Studio.tsx
    Aquí tendrá una transición al entrar a esta página de forma épica y que contenga en logo de perfil y el banner.
    Luego el Título “Vixis Studio” y una descripción.
    Otra sección donde diga la misión y la visión.
    Lo demás ya te lo ingeniarías tú.
    Porque en principio quise hacer como otro portafolio teniendo otros servicios, clientes, etc; pero me pareció redundante así que lo dejaré integrado en mi portafolio.
  - Projects.tsx
    Aquí me gustaría una lista paginada (y los botones para trasladarse estén en el centro abajo y arriba) donde aparezca una miniatura o thumbnail de cada link del enlace, el título, el mes y el año, dos botones: repositorio y el link del enlace.
    ![image.png](attachment:b9dd4a60-5b90-4c81-aed2-038bf4e8ec56:image.png)
    Más o menos así lo quiero, estilo Pinterest. Donde haya un borde pero con la diferencia de que los proyectos especiales que yo seleccione tengan una animación que se traslade en sentido de las agujas del reloj.
    Los botones que se mostrarán debajo será dependiendo el caso porque por ejemplo no tiene sentido tener un botón de repositorio si en realidad no hay repositorio.
    Los títulos y las fechas (mes y año) estarán como en la imagen, abajo integrado en el thumbnail.
  - Work experience.tsx
  - Stack.tsx
  - Status.tsx
    https://vixis.dev/status (será el status de mi persona como profesional, el estado de cada proyecto mío sería https://status.project.domain/)
  - NotFound.tsx
    Solo quiero que salga así jajajajajaja (y también la capacidad para volver al Home con un botón)
    https://codepen.io/josfabre/pen/BEVajm
  - Home.tsx
    En una de las secciones tiene que estar una lista de los próximos eventos y un botón de una redirección a la página Radio si se quiere saber más.
    Me gustaría este estilo para la palabra “Vixis” en el lado izquierdo del Footer que estará al final del Hero en la Home y a la derecha distintos enlaces y debajo de esos enlaces este texto “Developed by **Vixis**” y debajo otro texto “2025 - {currentYear}” (obviamente el currentyear sería distinto al 2025 porque no tiene sentido que aparezca ese año dos veces).
    [SaveThreads.io_Threads_Media_001_3662974486191969112.mp4](attachment:70e3a5ac-021a-4216-a8c7-2aff0ed5f4f3:SaveThreads.io_Threads_Media_001_3662974486191969112.mp4)
  - Store.tsx
    Aquí habrá una lista paginada que tendrán thumbnail, título, descripción, y precio.
    Al hacer click en cada uno que salga un modal como si fuera para hacer agregar al carrito y esas cosas, como en Amazon.
  - Radio.tsx
    Allí estará mi radio que tendrán funciones más entretenidas, como un chat para esa misma radio en tiempo real. Y bueno, muchos otros datos relacionados más.
    Sería el mismo caso que la página Studio pero sería nuevamente redundante.
    Aquí estarán los eventos míos alojados en passline.com
  - Admin.tsx
    Por supuesto, también habrá un Panel Admin para controlar desde la GUI todo el portafolio, incluyendo estadísticas y muchas cosas.
    Con esto he pensado en Jarvis, el asistente de Ironman JAJAJAJAJA.
- **Styles**
  - animations.css
  - components.css
  - globals.css
  ***
  - Background cuadriculado
    ```html
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {/* Blue Corner Glow Background */} <div className="absolute inset-0 z-0"
      style={{ backgroundImage: ` radial-gradient(circle 600px at 0% 200px,
      #bfdbfe, transparent), radial-gradient(circle 600px at 100% 200px,
      #bfdbfe, transparent) `, }} /> {/* Your Content Here */}
    </div>
    ```
  - Estilo de las fuentes
    - Poppins (https://fonts.google.com/specimen/Poppins/tester)
  - Estilo de los colores
    - #2093c4 → Principal
    - #331d83 → Secundario
    - Vixis Studio
      - #19bfb7
      - #00cfc8
      - #0d0d0d
      - #28e3da
      - #13928c
      - #03fff6

## Animación NotFound

### HTML

<div id="skybox" class="skybox">
	<div class="txt">Game over
		<br><span>404 FILE NOT FOUND</span></div>
	<div id="player" class="idle"></div>
	<div class="ground"></div>
</div>

### CSS

@import url('https://fonts.googleapis.com/css?family=Press+Start+2P');

/\*\*

- Hey viewer,
- your challenge is to get rid of the Javascript and
- make this fully CSS based. Yes, that is possible!
  \*/

$leftPos: 15%;
$rightPos: 85%;
$walkSpeed: 0.2s;

@keyframes blinker {
75% {
opacity: 0;
}
}

@keyframes walk-left-loop {
0% { background-position: 0; }
100% { background-position: -2 _ 32px; }
}
@keyframes walk-right-loop {
0% { background-position: -4 _ 32px; }
100% { background-position: -6 _ 32px; }
}
@keyframes search {
0% { background-position: -2 _ 32px; }
100% { background-position: -4 _ 32px; }
}
@keyframes walk-left {
0% { left:$rightPos; }
	100% { left:$leftPos; }
}
@keyframes walk-right {
0% { left:$leftPos; }
	100% { left:$rightPos; }
}
.walk-left {
animation: walk-left-loop $walkSpeed steps(2) infinite, walk-left 1s linear;
}
.walk-right {
animation: walk-right-loop $walkSpeed steps(2) infinite, walk-right 1s linear;
}
.idle {
animation:none;
background-position:-6 _ 32px;
}
.search-left {
animation:search 2s steps(2) infinite;
left: $leftPos !important;
}
.search-right {
animation:search 2s steps(2) infinite;
left: $rightPos !important;
}

body {
font-family: 'Press Start 2P', sans-serif;
text-rendering: optimizeSpeed;
color:#fff;
background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjQ3OThENjIxNjM0NTExRTlBRDcxODhCMzQyM0FCN0EwIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjQ3OThENjIyNjM0NTExRTlBRDcxODhCMzQyM0FCN0EwIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NDc5OEQ2MUY2MzQ1MTFFOUFENzE4OEIzNDIzQUI3QTAiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NDc5OEQ2MjA2MzQ1MTFFOUFENzE4OEIzNDIzQUI3QTAiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4nvDvOAAAABlBMVEXcuUXCjk1OwG03AAAARUlEQVR42mJgJAAYSFDAAATUUoCskH4KUJ1HuQJkMWIVYA1kihWQHpvUVwAJemIVYEssA6sAa3QTUIAtmihRQOfYBAgwAFtpA5VFMQvIAAAAAElFTkSuQmCC');
}

.skybox {
position:relative;
width:100%;
height:70vh;
background-color:#63B4F5;
.txt {
position:absolute;
width:90%;
text-align:center;
left:50%;
top:50%;
transform: translate(-50%, -50%);
text-transform: uppercase;
font-size: 1.4em;
line-height:1.1em;
span {
display:block;
margin-top:1vh;
animation: blinker 2s steps(1) infinite;
font-size: 0.5em;
line-height:1.2em;
}
}
#player {
position:absolute;
width:32px;
height:48px;
left:50%;
bottom:32px;
animation-fill-mode: forwards;  
 background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAwCAYAAAD+f6R/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjgwNTk2MTRCNjM0NTExRTlBMEY2QkI4RDA0MzNGN0M3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjgwNTk2MTRDNjM0NTExRTlBMEY2QkI4RDA0MzNGN0M3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6ODA1OTYxNDk2MzQ1MTFFOUEwRjZCQjhEMDQzM0Y3QzciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6ODA1OTYxNEE2MzQ1MTFFOUEwRjZCQjhEMDQzM0Y3QzciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4GPpTbAAAHmUlEQVR42uxd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');
}
.ground {
position:absolute;
left:0;
bottom:0;
width:100%;
height:32px;
background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjJFRkNENjRENjM0NTExRTk5RDQwQUQ5N0EyM0RBM0JDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjJFRkNENjRFNjM0NTExRTk5RDQwQUQ5N0EyM0RBM0JDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MkVGQ0Q2NEI2MzQ1MTFFOTlENDBBRDk3QTIzREEzQkMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MkVGQ0Q2NEM2MzQ1MTFFOTlENDBBRDk3QTIzREEzQkMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7Mv2hcAAAAElBMVEXcuUUAbT1tXRIAwgAAAADCjk0qQzGwAAAAYklEQVR42szRUQrAIAwD0LZr73/lbVZw8cMUHGP5asNDUMVJhIKD5AugioW2jJkDdyzycsn6OxBghoW1JLunCsBiDgcRzzV6xlYB6+wAuVIHufwJwFwE8+G74K2/KIJTgAEALaUOscCas1sAAAAASUVORK5CYII=');
}
}

### JS

var player = document.getElementById('player');

// adjust skybox height to multiple of 32
document.addEventListener("DOMContentLoaded", function() {
var h = document.getElementById('skybox').offsetHeight;
var s_h = Math.round(h/32) \* 32;
document.getElementById('skybox').style.height = `${s_h}px`;
});

function walkLeft() {
player.className = "walk-left";
setTimeout(searchLeft, 1000);
}
function searchLeft() {
player.className = "search-left";
// player.style.left = "40%";
setTimeout(walkRight, 3000);
}
function walkRight() {
player.className = "walk-right";
setTimeout(searchRight, 1000);
}
function searchRight() {
player.className = "search-right";
// player.style.left = "60%";
setTimeout(walkLeft, 3000);
}

walkLeft();

## Loading

### HTML

<div class="loading">
    <div class="skate">
        <div class="body">
            <div class="arm back"></div>
            <div class="arm front"></div>
            <div class="leg back"></div>
            <div class="leg front"></div>
        </div>
        <div class="board">
            <svg viewBox="0 0 34 8">
                <path d="M0.897306 0.911767C1.22218 0.30263 1.97934 0.072188 2.58848 0.397061L2.91936 0.573532C3.75214 1.01768 4.68144 1.25 5.62525 1.25H28.3752C29.3191 1.25 30.2484 1.01768 31.0811 0.573532L31.412 0.397061C32.0212 0.072188 32.7783 0.30263 33.1032 0.911767C33.4281 1.5209 33.1976 2.27807 32.5885 2.60294L32.2576 2.77941C31.0627 3.41667 29.7294 3.75 28.3752 3.75H27.9692C28.5841 4.09118 29.0002 4.747 29.0002 5.5C29.0002 6.60457 28.1048 7.5 27.0002 7.5C25.8957 7.5 25.0002 6.60457 25.0002 5.5C25.0002 4.747 25.4164 4.09118 26.0312 3.75H7.96925C8.5841 4.09118 9.00025 4.747 9.00025 5.5C9.00025 6.60457 8.10482 7.5 7.00025 7.5C5.89568 7.5 5.00025 6.60457 5.00025 5.5C5.00025 4.747 5.41639 4.09118 6.03124 3.75H5.62525C4.27109 3.75 2.93774 3.41667 1.74289 2.77941L1.41201 2.60294C0.802874 2.27807 0.572432 1.5209 0.897306 0.911767Z" />
            </svg>
        </div>
        <div class="line top"></div>
        <div class="line bottom"></div>
    </div>
</div>

<div id="keyboard">
    <button class="up">
        <svg viewBox="0 0 8 8">
            <path d="M3.99953 1C3.83653 1 3.68353 1.0795 3.59003 1.2135L0.0900328 6.2135C-0.0169672 6.366 -0.0289672 6.5655 0.0560328 6.731C0.142533 6.8965 0.313033 7 0.499533 7H7.50003C7.68653 7 7.85753 6.8965 7.94353 6.731C8.02853 6.5655 8.01653 6.366 7.90953 6.2135L4.40953 1.2135C4.31653 1.0795 4.16353 1 4.00053 1C4.00003 1 4.00003 1 3.99953 1C4.00003 1 4.00003 1 3.99953 1Z" />
        </svg>
    </button>
    <button class="left">
        <svg viewBox="0 0 8 8">
            <path d="M1 4.00053C1 4.16353 1.0795 4.31653 1.2135 4.41003L6.2135 7.91003C6.366 8.01703 6.5655 8.02903 6.731 7.94403C6.8965 7.85753 7 7.68703 7 7.50053V0.499533C7 0.313033 6.8965 0.142033 6.731 0.0560328C6.5655 -0.0289672 6.366 -0.0169672 6.2135 0.0900328L1.2135 3.59003C1.0795 3.68353 1 3.83653 1 3.99953C1 4.00003 1 4.00003 1 4.00053C1 4.00003 1 4.00003 1 4.00053Z" />
        </svg>
    </button>
    <button class="right">
        <svg viewBox="0 0 8 8">
            <path d="M7 3.99953C7 3.83653 6.9205 3.68353 6.7865 3.59003L1.7865 0.0900328C1.6345 -0.0169672 1.4345 -0.0289672 1.269 0.0560328C1.1035 0.142533 1 0.313033 1 0.499533V7.50003C1 7.68653 1.1035 7.85753 1.269 7.94353C1.4345 8.02853 1.634 8.01653 1.7865 7.90953L6.7865 4.40953C6.9205 4.31653 7 4.16353 7 4.00053C7 4.00003 7 4.00003 7 3.99953C7 4.00003 7 4.00003 7 3.99953Z" />
        </svg>
    </button>
    <button class="down">
        <svg viewBox="0 0 8 8">
            <path d="M4.00053 7C4.16353 7 4.31653 6.9205 4.41003 6.7865L7.91003 1.7865C8.01703 1.634 8.02903 1.4345 7.94403 1.269C7.85753 1.1035 7.68703 1 7.50053 1H0.499533C0.313033 1 0.142533 1.1035 0.0560328 1.269C-0.0289672 1.4345 -0.0169672 1.634 0.0900328 1.7865L3.59003 6.7865C3.68353 6.9205 3.83653 7 3.99953 7C4.00003 7 4.00003 7 4.00053 7C4.00003 7 4.00003 7 4.00053 7Z" />
        </svg>
    </button>
    <span class="hide">Please don't press <strong>C</strong></span>
</div>

<a class="link" href="https://check.so/" target="_blank"><svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M57.1286 32C57.1286 36.0179 56.8608 40.0357 56.459 43.5179C55.7893 50.3482 50.4768 55.6607 43.6911 56.3304C40.1643 56.7321 36.1465 57 32.1286 57C28.1108 57 24.0929 56.7321 20.6108 56.3304C13.7804 55.6607 8.51256 50.3482 7.79827 43.5179C7.39649 40.0357 7.12863 36.0179 7.12863 32C7.12863 27.9821 7.39649 23.9643 7.79827 20.4375C8.51256 13.6518 13.7804 8.33929 20.6108 7.66964C24.0929 7.26786 28.1108 7 32.1286 7C36.1465 7 40.1643 7.26786 43.6911 7.66964C47.363 8.032 50.6035 9.75383 52.9104 12.3329C44.3215 17.7863 36.9127 24.9293 31.1504 33.2947C28.9284 30.3478 26.4965 27.5686 23.8835 24.9786C22.6451 23.7511 20.646 23.76 19.4185 24.9984C18.191 26.2369 18.1998 28.2359 19.4383 29.4635C22.8748 32.8697 25.9661 36.6281 28.6359 40.6779C29.2334 41.5842 30.2546 42.12 31.3399 42.0966C32.4252 42.0732 33.4224 41.4939 33.9803 40.5627C39.4638 31.4101 47.0078 23.6326 55.9692 17.872C56.2063 18.6976 56.3719 19.5551 56.459 20.4375C56.8608 23.9643 57.1286 27.9821 57.1286 32ZM52.9104 12.3329C54.8687 11.0895 56.8883 9.93399 58.9638 8.87182C60.516 8.07741 62.4183 8.69175 63.2128 10.244C64.0072 11.7962 63.3928 13.6986 61.8406 14.493C59.8241 15.525 57.8649 16.6534 55.9692 17.872C55.3695 15.7842 54.3124 13.9002 52.9104 12.3329Z" fill="#F9A28E"/>
</svg></a>

### CSS

.loading {
--arm-front: 24deg;
--arm-front-end: -48deg;
--arm-back: 164deg;
--arm-back-end: -50deg;
--leg-front: 40deg;
--leg-front-end: 30deg;
--leg-back: 120deg;
--leg-back-end: -36deg;
--board-r: 0deg;
--board-x: 0px;
--body-r: 12deg;
--body-y: -65%;
--body-x: -85%;
--skate-x: 0px;
--skate-y: 0px;
--color: #F9A28E;
--line-top-x: 0%;
--line-bottom-x: 0%;
position: relative;
.skate {
position: relative;
width: 40px;
height: 46px;
transform: translate(var(--skate-x), var(--skate-y)) translateZ(0);
.body {
background: var(--color);
height: 15px;
width: 7px;
border-radius: 4px;
transform-origin: 4px 11px;
position: absolute;
left: 50%;
top: 50%;
transform: translate(var(--body-x), var(--body-y)) rotate(var(--body-r)) translateZ(0);
&:before {
content: '';
width: 8px;
height: 8px;
border-radius: 4px;
bottom: 16px;
left: 0;
position: absolute;
background: var(--color);
transform: translateY(-.5px);
}
.arm,
.arm:before,
.leg,
.leg:before {
content: '';
width: var(--w, 11px);
height: 4px;
top: var(--t, 0);
left: var(--l, 2px);
border-radius: 2px;
transform-origin: 2px 2px;
position: absolute;
background: var(--color);
transform: rotate(var(--r, 0deg));
}
.arm {
&:before {
--l: 8px;
}
&.front {
--r: var(--arm-front);
&:before {
--r: var(--arm-front-end);
}
}
&.back {
--r: var(--arm-back);
&:before {
--r: var(--arm-back-end);
}
}
}
.leg {
--w: 11px;
--t: 11px;
&:before {
--t: 0;
--l: 8px;
}
&.front {
--r: var(--leg-front);
&:before {
--r: var(--leg-front-end);
}
}
&.back {
--l: 1px;
--r: var(--leg-back);
&:before {
--r: var(--leg-back-end);
}
}
}
}
.board {
position: absolute;
left: 2px;
bottom: -1px;
transform: translateX(var(--board-x)) rotate(var(--board-r)) translateZ(0);
transform-origin: 7px 5.5px;
svg {
display: block;
width: 34px;
height: 8px;
fill: var(--color);
}
}
}
.line {
height: 3px;
border-radius: 1px;
overflow: hidden;
position: absolute;
right: 105%;
top: 18px;
width: 16px;
transform: scaleY(.75);
&:before {
content: '';
position: absolute;
left: 0;
top: 0;
right: 0;
bottom: 0;
border-radius: inherit;
background: var(--color);
transform: translateX(var(--x, var(--line-top-x)));
}
&.bottom {
--x: var(--line-bottom-x);
width: 13px;
top: 24px;
}
}
}

.link {
position: absolute;
right: 32px;
top: 32px;
svg {
display: block;
width: 32px;
height: 32px;
}
}

#keyboard {
display: grid;
grid-gap: 8px;
position: absolute;
left: 50%;
bottom: 48px;
user-select: none;
transform: translateX(-50%);
button {
appearance: none;
height: 36px;
width: 40px;
border-radius: 7px;
background: #2C2C31;
border: none;
outline: none;
display: flex;
justify-content: center;
align-items: center;
transform: scale(var(--scale, 1)) translateZ(0);
transition: transform .15s;
svg {
display: block;
width: 8px;
height: 8px;
fill: var(--color, #7F7F85);
transition: fill .15s;
}
&.up {
grid-row: 1;
grid-column: 2;
}
&.left {
grid-row: 2;
grid-column: 1;
}
&.right {
grid-row: 2;
grid-column: 3;
}
&.down {
grid-row: 2;
grid-column: 2;
}
&.pressed {
--scale: .95;
--color: #fff;
}
}
span {
display: block;
position: absolute;
left: 0;
right: 0;
bottom: -24px;
line-height: 16px;
font-size: 12px;
font-weight: 500;
color: #7F7F85;
text-align: center;
transition: opacity .25s;
strong {
transition: color .15s;
color: var(--color, #7F7F85);
}
&.hide {
opacity: 0;
pointer-events: none;
}
&.pressed {
--color: #fff;
}
}
}

html {
box-sizing: border-box;
-webkit-font-smoothing: antialiased;
}

- {
  box-sizing: inherit;
  &:before,
  &:after {
  box-sizing: inherit;
  }
  }

// Center & dribbble
body {
min-height: 100vh;
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
background: #242428;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
}

### JS

const { to, set } = gsap;

document.querySelectorAll('.loading').forEach(loading => {
loading.count = 0
let lines = to(loading, {
keyframes: [{
'--line-top-x': '-100%',
'--line-bottom-x': '-200%',
onComplete() {
set(loading, {
'--line-top-x': '200%',
'--line-bottom-x': '100%',
})
}
}, {
'--line-top-x': '0%',
'--line-bottom-x': '0%'
}],
duration: 1,
repeat: -1
})

    const keyboard = document.querySelector('#keyboard')
    const arrowUp = keyboard.querySelector('.up')
    const arrowLeft = keyboard.querySelector('.left')
    const arrowRight = keyboard.querySelector('.right')
    const arrowDown = keyboard.querySelector('.down')
    const spanHidden = keyboard.querySelector('span')

    document.body.onkeyup = e => {
        if(e.keyCode == 32 || e.keyCode == 38) {
            jump(loading, lines)
            arrowUp.classList.add('pressed')
            setTimeout(() => arrowUp.classList.remove('pressed'), 400)
        }
        if(e.keyCode == 40 || e.keyCode == 39 || e.keyCode == 37) {
            if(!loading.ouch) {
                reset(loading, lines)
            }
            keyboard.querySelector('.pressed').classList.remove('pressed')
        }
        if(loading.ouch && (e.keyCode == 32 || e.keyCode == 38)) {
            loading.ouch = false
            reset(loading, lines)
        }
    }

    document.body.onkeydown = e => {
        if(e.keyCode == 39){
            fast(loading, lines)
            arrowRight.classList.add('pressed')
        }
        if(e.keyCode == 40){
            down(loading, lines)
            arrowDown.classList.add('pressed')
        }
        if(e.keyCode == 37) {
            slow(loading, lines)
            arrowLeft.classList.add('pressed')
        }
        if(e.keyCode == 67) {
            fall(loading, lines)
            spanHidden.classList.add('pressed')
            setTimeout(() => spanHidden.classList.remove('pressed'), 400)
        }
    }

    if(('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
        spanHidden.innerHTML = "Please don't click here"
    }

    arrowUp.addEventListener('click', e => {
        if(loading.ouch) {
            loading.ouch = false
            reset(loading, lines)
        }
        jump(loading, lines)
    })
    arrowLeft.addEventListener('pointerdown', e => slow(loading, lines))
    arrowRight.addEventListener('pointerdown', e => fast(loading, lines))
    arrowDown.addEventListener('pointerdown', e => down(loading, lines))
    spanHidden.addEventListener('click', e => fall(loading, lines))

    arrowLeft.addEventListener('pointerup', e => !loading.ouch && reset(loading, lines))
    arrowRight.addEventListener('pointerup', e => !loading.ouch && reset(loading, lines))
    arrowDown.addEventListener('pointerup', e => !loading.ouch && reset(loading, lines))

})

const jump = (loading, lines) => {
if(loading.active) {
return
}
loading.active = true
loading.count += 1
if(loading.count > 3) {
document.querySelector('#keyboard span').classList.remove('hide')
}
lines.timeScale(2)
to(loading, {
keyframes: [{
'--skate-x': '-12px',
duration: .3
}, {
'--skate-x': '12px',
duration: .5
}, {
'--skate-x': '0px',
duration: .5
}]
})
to(loading, {
keyframes: [{
'--skate-y': '-32px',
duration: .4,
delay: .2
}, {
'--skate-y': '0px',
duration: .2
}]
})
to(loading, {
keyframes: [{
duration: .2,
delay: .2,
'--arm-front': '40deg',
'--arm-front-end': '-12deg',
'--arm-back': '172deg',
'--arm-back-end': '38deg',
'--leg-front': '-8deg',
'--leg-front-end': '102deg',
'--leg-back': '103deg',
'--leg-back-end': '-16deg',
'--board-r': '-40deg',
'--body-r': '7deg',
'--body-y': '-90%',
'--body-x': '-160%',
}, {
duration: .2,
'--arm-front': '24deg',
'--arm-front-end': '-48deg',
'--arm-back': '172deg',
'--arm-back-end': '15deg',
'--leg-front': '22deg',
'--leg-front-end': '55deg',
'--leg-back': '142deg',
'--leg-back-end': '-58deg',
'--board-r': '3deg',
'--body-r': '12deg',
'--body-y': '-56%',
'--body-x': '-60%',
}, {
duration: .2,
'--arm-front': '24deg',
'--arm-front-end': '-48deg',
'--arm-back': '164deg',
'--arm-back-end': '-36deg',
'--leg-front': '-4deg',
'--leg-front-end': '66deg',
'--leg-back': '111deg',
'--leg-back-end': '-36deg',
'--board-r': '0deg',
'--body-r': '34deg',
'--body-y': '-53%',
'--body-x': '-28%',
}, {
'--arm-front': '24deg',
'--arm-front-end': '-48deg',
'--arm-back': '164deg',
'--arm-back-end': '-50deg',
'--leg-front': '40deg',
'--leg-front-end': '30deg',
'--leg-back': '120deg',
'--leg-back-end': '-36deg',
'--board-r': '0deg',
'--body-r': '12deg',
'--body-y': '-65%',
'--body-x': '-85%',
duration: .4,
onComplete() {
loading.active = false
lines.timeScale(1)
}
}]
})
}

const fast = (loading, lines) => {
if(loading.active) {
return
}
loading.active = true
loading.count += 1
if(loading.count > 3) {
document.querySelector('#keyboard span').classList.remove('hide')
}
lines.timeScale(2.5)
to(loading, {
'--skate-x': '12px',
duration: .3
})
to(loading, {
duration: .2,
'--arm-front': '24deg',
'--arm-front-end': '-48deg',
'--arm-back': '164deg',
'--arm-back-end': '-36deg',
'--leg-front': '-4deg',
'--leg-front-end': '66deg',
'--leg-back': '111deg',
'--leg-back-end': '-36deg',
'--board-r': '0deg',
'--body-r': '34deg',
'--body-y': '-53%',
'--body-x': '-28%',
})
}

const reset = (loading, lines) => {
if(!loading.active) {
return
}
to(loading, {
'--skate-x': '0px',
duration: .3
})
to(loading, {
duration: .2,
'--arm-front': '24deg',
'--arm-front-end': '-48deg',
'--arm-back': '164deg',
'--arm-back-end': '-50deg',
'--leg-front': '40deg',
'--leg-front-end': '30deg',
'--leg-back': '120deg',
'--leg-back-end': '-36deg',
'--board-r': '0deg',
'--board-x': '0px',
'--body-r': '12deg',
'--body-y': '-65%',
'--body-x': '-85%',
onComplete() {
loading.active = false
lines.play()
lines.timeScale(1)
}
})
}

const slow = (loading, lines) => {
if(loading.active) {
return
}
loading.active = true
loading.count += 1
if(loading.count > 3) {
document.querySelector('#keyboard span').classList.remove('hide')
}
lines.timeScale(.5)
to(loading, {
'--skate-x': '-12px',
duration: .3
})
to(loading, {
duration: .2,
'--arm-front': '32deg',
'--arm-front-end': '20deg',
'--arm-back': '156deg',
'--arm-back-end': '-22deg',
'--leg-front': '19deg',
'--leg-front-end': '74deg',
'--leg-back': '134deg',
'--leg-back-end': '-29deg',
'--board-r': '-15deg',
'--body-r': '-8deg',
'--body-y': '-65%',
'--body-x': '-110%',
})
}

const down = (loading, lines) => {
if(loading.active) {
return
}
loading.active = true
loading.count += 1
if(loading.count > 3) {
document.querySelector('#keyboard span').classList.remove('hide')
}
to(loading, {
duration: .2,
'--arm-front': '-26deg',
'--arm-front-end': '-58deg',
'--arm-back': '204deg',
'--arm-back-end': '60deg',
'--leg-front': '40deg',
'--leg-front-end': '80deg',
'--leg-back': '150deg',
'--leg-back-end': '-96deg',
'--body-r': '180deg',
'--body-y': '-100%',
})
}

const fall = (loading, lines) => {
if(loading.active) {
return
}
loading.active = true
loading.ouch = true
lines.pause()
to(loading, {
duration: .5,
'--board-x': '60px'
})
to(loading, {
keyframes: [{
'--board-r': '-40deg',
duration: .15
}, {
'--board-r': '0deg',
duration: .3
}]
})
to(loading, {
keyframes: [{
'--line-top-x': '-100%',
'--line-bottom-x': '-200%',
'--body-r': '-8deg',
'--leg-back-end': '24deg',
'--leg-back': '60deg',
'--leg-front-end': '30deg',
'--leg-front': '10deg',
'--arm-back-end': '-40deg',
'--arm-back': '54deg',
'--arm-front-end': '-28deg',
'--arm-front': '24deg',
duration: .2
}, {
'--body-x': '-85%',
'--body-y': '36%',
'--body-r': '-26deg',
'--leg-back-end': '24deg',
'--leg-back': '20deg',
'--leg-front-end': '30deg',
'--leg-front': '-10deg',
'--arm-back-end': '-40deg',
'--arm-back': '164deg',
'--arm-front-end': '-28deg',
'--arm-front': '24deg',
duration: .2
}]
})
}

## AnimationVixis

### HTML

<input id="image-selector-input" style="visibility:hidden;" type="file">

<canvas></canvas>

<script type="x-shader/x-fragment" id="vertShader">
	precision mediump float;

    varying vec2 vUv;
    attribute vec2 a_position;

    void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
</script>

<script type="x-shader/x-fragment" id="fragShader">
	precision mediump float;

    varying vec2 vUv;
    uniform sampler2D u_image_texture;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_img_ratio;
    uniform float u_blueish;
    uniform float u_scale;
    uniform float u_illumination;
    uniform float u_surface_distortion;
    uniform float u_water_distortion;

    #define TWO_PI 6.28318530718
    #define PI 3.14159265358979323846

    vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
        m = m*m;
        m = m*m;
        vec3 x = 2. * fract(p * C.www) - 1.;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130. * dot(m, g);
    }


    mat2 rotate2D(float r) {
        return mat2(cos(r), sin(r), -sin(r), cos(r));
    }

    float surface_noise(vec2 uv, float t, float scale) {
        vec2 n = vec2(.1);
        vec2 N = vec2(.1);
        mat2 m = rotate2D(.5);
        for (int j = 0; j < 10; j++) {
            uv *= m;
            n *= m;
            vec2 q = uv * scale + float(j) + n + (.5 + .5 * float(j)) * (mod(float(j), 2.) - 1.) * t;
            n += sin(q);
            N += cos(q) / scale;
            scale *= 1.2;
        }
        return (N.x + N.y + .1);
    }

    void main() {
        vec2 uv = vUv;
        uv.y = 1. - uv.y;
        uv.x *= u_ratio;

        float t = .002 * u_time;
        vec3 color = vec3(0.);
        float opacity = 0.;

        float outer_noise = snoise((.3 + .1 * sin(t)) * uv + vec2(0., .2 * t));
        vec2 surface_noise_uv = 2. * uv + (outer_noise * .2);

        float surface_noise = surface_noise(surface_noise_uv, t, u_scale);
        surface_noise *= pow(uv.y, .3);
        surface_noise = pow(surface_noise, 2.);

        vec2 img_uv = vUv;
        img_uv -= .5;
        if (u_ratio > u_img_ratio) {
            img_uv.x = img_uv.x * u_ratio / u_img_ratio;
        } else {
            img_uv.y = img_uv.y * u_img_ratio / u_ratio;
        }
        float scale_factor = 1.4;
        img_uv *= scale_factor;
        img_uv += .5;
        img_uv.y = 1. - img_uv.y;

        img_uv += (u_water_distortion * outer_noise);
        img_uv += (u_surface_distortion * surface_noise);

        vec4 img = texture2D(u_image_texture, img_uv);
        img *= (1. + u_illumination * surface_noise);

        color += img.rgb;
        color += u_illumination * vec3(1. - u_blueish, 1., 1.) * surface_noise;
        opacity += img.a;

        float edge_width = .02;
        float edge_alpha = smoothstep(0., edge_width, img_uv.x) * smoothstep(1., 1. - edge_width, img_uv.x);
        edge_alpha *= smoothstep(0., edge_width, img_uv.y) * smoothstep(1., 1. - edge_width, img_uv.y);
        color *= edge_alpha;
        opacity *= edge_alpha;

        gl_FragColor = vec4(color, opacity);
    }
</script>

### CSS

body,
html {
margin: 0;
padding: 0;
}

canvas {
position: fixed;
top: 0;
left: 0;
width: 100%;
}

.lil-gui {
display: none !important;
--width: 400px;
--widget-height: 20px;
font-size: 15px;
--input-font-size: 15px;
--padding: 10px;
--spacing: 10px;
--slider-knob-width: 5px;
--background-color: rgba(5, 0, 15, 0.9);
--widget-color: rgba(255, 255, 255, 0.3);
--focus-color: rgba(255, 255, 255, 0.4);
--hover-color: rgba(255, 255, 255, 0.5);
--font-family: monospace;
z-index: 1;
}

### JS

import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18.2/+esm";

const canvasEl = document.querySelector("canvas");
const imgInput = document.querySelector("#image-selector-input");
const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

const params = {
blueish: 0.6,
scale: 7,
illumination: 0.15,
surfaceDistortion: 0.07,
waterDistortion: 0.03,
loadMyImage: () => {
imgInput.click();
}
};

imgInput.onchange = () => {
const [file] = imgInput.files;
if (file) {
const reader = new FileReader();
reader.onload = (e) => {
loadImage(e.target.result);
};
reader.readAsDataURL(file);
}
};

let image, uniforms;
const gl = initShader();
updateUniforms();
loadImage(
"https://cdn.shopify.com/s/files/1/0185/5999/1872/files/hero--desktop.webp?v=1759340146"
);
createControls();
render();
window.addEventListener("resize", resizeCanvas);

function initShader() {
const vsSource = document.getElementById("vertShader").innerHTML;
const fsSource = document.getElementById("fragShader").innerHTML;

    const gl =
    	canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

    if (!gl) {
    	alert("WebGL is not supported by your browser.");
    }

    function createShader(gl, sourceCode, type) {
    	const shader = gl.createShader(type);
    	gl.shaderSource(shader, sourceCode);
    	gl.compileShader(shader);

    	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    		console.error(
    			"An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    		);
    		gl.deleteShader(shader);
    		return null;
    	}

    	return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    function createShaderProgram(gl, vertexShader, fragmentShader) {
    	const program = gl.createProgram();
    	gl.attachShader(program, vertexShader);
    	gl.attachShader(program, fragmentShader);
    	gl.linkProgram(program);

    	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    		console.error(
    			"Unable to initialize the shader program: " + gl.getProgramInfoLog(program)
    		);
    		return null;
    	}

    	return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    uniforms = getUniforms(shaderProgram);

    function getUniforms(program) {
    	let uniforms = [];
    	let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    	for (let i = 0; i < uniformCount; i++) {
    		let uniformName = gl.getActiveUniform(program, i).name;
    		uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    	}
    	return uniforms;
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return gl;

}

function updateUniforms() {
gl.uniform1f(uniforms.u_blueish, params.blueish);
gl.uniform1f(uniforms.u_scale, params.scale);
gl.uniform1f(uniforms.u_illumination, params.illumination);
gl.uniform1f(uniforms.u_surface_distortion, params.surfaceDistortion);
gl.uniform1f(uniforms.u_water_distortion, params.waterDistortion);
}

function loadImage(src) {
image = new Image();
image.crossOrigin = "anonymous";
image.src = src;
image.onload = () => {
const imageTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, imageTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
gl.uniform1i(uniforms.u_image_texture, 0);
resizeCanvas();
};
}

function render() {
const currentTime = performance.now();
gl.uniform1f(uniforms.u_time, currentTime);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
requestAnimationFrame(render);
}

function resizeCanvas() {
const imgRatio = image.naturalWidth / image.naturalHeight;
canvasEl.width = window.innerWidth _ devicePixelRatio;
canvasEl.height = window.innerHeight _ devicePixelRatio;
gl.viewport(0, 0, canvasEl.width, canvasEl.height);
gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
gl.uniform1f(uniforms.u_img_ratio, imgRatio);
}

function createControls() {
const gui = new GUI();
gui.close();

    gui.add(params, "loadMyImage").name("load image");

    const paramsFolder = gui.addFolder("shader params");
    // paramsFolder.close();

    paramsFolder.add(params, "blueish", 0, 0.8).onChange(updateUniforms);
    paramsFolder.add(params, "scale", 5, 12).onChange(updateUniforms);
    paramsFolder.add(params, "illumination", 0, 1).onChange(updateUniforms);
    paramsFolder
    	.add(params, "surfaceDistortion", 0, 0.12)
    	.onChange(updateUniforms)
    	.name("surface distortion");
    paramsFolder
    	.add(params, "waterDistortion", 0, 0.08)
    	.onChange(updateUniforms)
    	.name("water distortion");

}

## Radio

Perfecto. Te dejo **el proceso completo, técnico y sin humo**, con **links oficiales**, para que tú lo integres a tu proyecto como backend de audio.
Esto es **infra + flujo**, no código de tu web (eso ya es tu cancha).

---

# 🔥 Opción ganadora (100% gratis, pro-level)

**Icecast + Liquidsoap + BUTT**

---

## 🧱 ARQUITECTURA FINAL (lo que vas a montar)

```
[Música libre] ─┐
                ├─► Liquidsoap ─► Icecast ─► <audio> en vixis.dev/radio
[Mic / Live] ─► BUTT ────────────▲
```

- Icecast = servidor de streaming
- Liquidsoap = modo automático
- BUTT = cuando entras en vivo
- Tu web = solo consume el stream

---

# 1️⃣ Icecast (el servidor de la radio)

### 🔗 Link oficial

👉 [https://icecast.org/](https://icecast.org/)

### 📦 Qué hace

- Expone un stream tipo:

```
http://TU_SERVIDOR:8000/radiovixis
```

- Soporta metadata (título, artista)
- Soporta múltiples fuentes (AutoDJ + Live)

### 📥 Instalación (ejemplo Linux / VPS)

```bash
sudo apt update
sudo apt install icecast2
```

Durante la instalación:

- Define contraseña de source
- Puerto (default 8000)

Archivo clave:

```
/etc/icecast2/icecast.xml
```

Ahí defines:

- passwords
- mountpoints
- nombre de la radio

---

# 2️⃣ Liquidsoap (modo automático)

### 🔗 Link oficial

👉 [https://www.liquidsoap.info/](https://www.liquidsoap.info/)

### 📦 Qué hace

- Reproduce música automáticamente
- Envía audio a Icecast
- Se apaga cuando entras en vivo (si lo configuras así)

### 📥 Instalación

```bash
sudo apt install liquidsoap
```

### 📄 Concepto de script (NO código final)

Un script Liquidsoap básicamente dice:

```
- Carga una carpeta de música
- Reprodúcela en loop
- Envíala a Icecast
```

Tu música puede ser:

- libre de derechos
- tuya
- de artistas con permiso

Ruta típica:

```
/radio/music/
```

---

# 3️⃣ BUTT (cuando tú hablas / pinchas)

### 🔗 Link oficial

👉 [https://danielnoethen.de/butt/](https://danielnoethen.de/butt/)

### 📦 Qué hace

- Toma micrófono + audio del sistema
- Se conecta a Icecast
- Prioriza el live sobre Liquidsoap

### 🖥️ Funciona en

- Windows
- Linux
- macOS

Configuración básica:

- Server: IP de Icecast
- Port: 8000
- Mountpoint: /radiovixis
- Password: source password

Botón:
🎙️ **Connect** = estás al aire

---

# 4️⃣ Metadata (lo que ves en la barra negra)

Icecast expone metadata automáticamente:

- título
- artista
- estado del stream

### Endpoint típico:

```
http://TU_SERVIDOR:8000/status-json.xsl
```

Desde ahí tú:

- haces fetch
- actualizas UI
- cambias “Canción de Ejemplo – Artista Ejemplo”

---

# 5️⃣ Reproductor en tu web (solo concepto)

Tu barra negra **NO sabe nada de Icecast internamente**.
Solo consume una URL de audio.

Ejemplo conceptual:

```html
<audio src="http://TU_SERVIDOR:8000/radiovixis" autoplay></audio>
```

Tú:

- lo estilizas
- controlas play/pause
- sincronizas metadata
- lo integras con tu chat

---

# 6️⃣ Hosting GRATIS recomendado

### 🟢 Oracle Cloud Free Tier

👉 [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)

- VM gratis “de por vida”
- Icecast + Liquidsoap corren perfecto
- IP pública

Alternativa:

- Localhost + port forwarding (solo pruebas)

---

# 7️⃣ Flujo diario real (cómo se usa)

🔁 Normal:

- Liquidsoap suena solo (AutoDJ)

🎙️ Tú quieres hablar:

- Abres BUTT
- Connect
- Entras en vivo

🛑 Terminas:

- Cierras BUTT
- Liquidsoap vuelve solo

Cero clicks raros. Radio real.

---

# 8️⃣ Qué NO estás usando (y está bien)

❌ Spotify
❌ YouTube
❌ brlogic
❌ servicios cerrados

Esto es **infra pura**, control total.

---

## ✅ Resultado final

- La barra negra funciona
- El stream es tuyo
- Modo automático + live
- Legal
- Gratis
- Escalable
