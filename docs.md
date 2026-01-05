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
