import { useRef, useEffect, useState } from "react";

interface AnimationVixisProps {
  imageUrl?: string;
}

function AnimationVixis({
  imageUrl = "https://img.logo.dev/shopify.com?token=pk_Au6BgsgUQ5SltADJUPu63g&retina=true",
}: AnimationVixisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const uniformsRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const params = {
    blueish: 0.6,
    scale: 7,
    illumination: 0.15,
    surfaceDistortion: 0.07,
    waterDistortion: 0.03,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("WebGL is not supported");
      return;
    }

    glRef.current = gl;

    // Shaders
    const vertShaderSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;

      void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragShaderSource = `
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
    `;

    function createShader(
      gl: WebGLRenderingContext,
      sourceCode: string,
      type: number
    ) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, sourceCode);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, vertShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(
      gl,
      fragShaderSource,
      gl.FRAGMENT_SHADER
    );
    if (!vertexShader || !fragmentShader) return;

    function createShaderProgram(
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ) {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!shaderProgram) return;

    function getUniforms(program: WebGLProgram) {
      const uniforms: any = {};
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(program, i)?.name;
        if (uniformName) {
          uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
      }
      return uniforms;
    }

    uniformsRef.current = getUniforms(shaderProgram);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);
    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    function updateUniforms() {
      if (!uniformsRef.current) return;
      gl.uniform1f(uniformsRef.current.u_blueish, params.blueish);
      gl.uniform1f(uniformsRef.current.u_scale, params.scale);
      gl.uniform1f(uniformsRef.current.u_illumination, params.illumination);
      gl.uniform1f(
        uniformsRef.current.u_surface_distortion,
        params.surfaceDistortion
      );
      gl.uniform1f(
        uniformsRef.current.u_water_distortion,
        params.waterDistortion
      );
    }

    function loadImage(src: string) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        imageRef.current = image;
        const imageTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
        gl.uniform1i(uniformsRef.current.u_image_texture, 0);
        resizeCanvas();
      };
      image.src = src;
    }

    function resizeCanvas() {
      if (!containerRef.current || !imageRef.current) return;
      const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      const imgRatio =
        imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      gl.uniform1f(uniformsRef.current.u_ratio, canvas.width / canvas.height);
      gl.uniform1f(uniformsRef.current.u_img_ratio, imgRatio);
    }

    function render() {
      if (!glRef.current || !uniformsRef.current) return;
      const currentTime = performance.now();
      gl.uniform1f(uniformsRef.current.u_time, currentTime);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameRef.current = requestAnimationFrame(render);
    }

    updateUniforms();
    loadImage(imageUrl);
    window.addEventListener("resize", resizeCanvas);

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageUrl]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}

export default AnimationVixis;
