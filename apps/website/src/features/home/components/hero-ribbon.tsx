"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's silk ribbon (reference: Stripe's hero), as a WebGL fragment shader
 * in Nomow's colours.
 *
 * Four soft, translucent bands sweep in from the top and curve out through the
 * right edge, layered back to front: deep emerald, mint, sunset gold (from the
 * photo) and a bright highlight thread. Each band has feathered edges, colour
 * running across its width, fine fibres along its length and a soft sheen, and
 * catches the light, so together they read as lit silk over the photograph.
 *
 * Entrance: the bands unfurl down from the top one after another, growing to full
 * width, then a single soft light glides down them (uIntro).
 *
 * Performance: the canvas covers only the right 60% of the hero and is drawn at 60% of CSS
 * resolution. It animates only during its entrance (30fps, paused off screen, scrolled away or
 * in a hidden tab), then holds its final frame: zero work while idle, redrawn only on resize.
 * One frame with reduced motion; nothing if WebGL is missing.
 * Never mirrored.
 */

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;    // the whole hero, in canvas pixels
uniform float uStart; // where the canvas begins, as a fraction of the hero's width
uniform float uTime;
uniform float uShift;
uniform float uIntro; // seconds since the entrance began (large = finished)
varying vec2 vUv;

vec3 ramp(vec3 a, vec3 b, vec3 c, float t) {
  return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, (t - 0.5) * 2.0);
}

// One silk band. p: position in screen-height units, y pointing down.
vec4 band(vec2 p, float aspect, float x0, float bend, float wobble, float width, float phase,
          vec3 c0, vec3 c1, vec3 c2, float alpha, float soft) {
  float y = p.y;
  float w = uTime * 0.22 + phase; // uTime stops at the end of the entrance: the silk holds still
  // Entrance: each band unfurls down from the top (staggered by its phase), growing to full
  // width as it goes; then one soft light glides down all of them.
  float r = clamp((uIntro - 0.35 - phase * 0.13) / 1.7, 0.0, 1.0);
  float grow = 1.0 - pow(1.0 - r, 3.0);
  float front = grow * 1.4 - 0.12;
  float reveal = smoothstep(front, front - 0.24, y) * smoothstep(0.0, 0.25, r);
  width *= mix(0.35, 1.0, grow);
  float xc = (x0 + uShift) * aspect + bend * y * y + wobble * sin(y * 2.4 + w);
  float slope = 2.0 * bend * y + wobble * 2.4 * cos(y * 2.4 + w);
  float d = (p.x - xc) / sqrt(1.0 + slope * slope);
  float v = d / (width * (0.9 + 0.12 * sin(y * 3.1 + w * 0.7)));
  float cover = 1.0 - smoothstep(1.0 - soft, 1.0, abs(v));
  if (cover <= 0.0) return vec4(0.0);
  float t = clamp(v * 0.5 + 0.5, 0.0, 1.0);
  vec3 color = ramp(c0, c1, c2, t);
  // Fibres along the band, bending gently with it.
  float fibres = 0.92 + 0.08 * sin(v * 110.0 + sin(y * 7.0 + w) * 4.0) + 0.04 * sin(v * 41.0 - w);
  // Light across the face of the silk.
  float sheen = exp(-pow((v - 0.2 + 0.15 * sin(y * 2.0 + w)) * 4.0, 2.0)) * 0.28;
  color = color * fibres + vec3(sheen);
  // Fade the band in from the top edge of the screen.
  float enter = smoothstep(-0.05, 0.12, y);
  float s = clamp((uIntro - 2.0 - phase * 0.05) / 1.5, 0.0, 1.0);
  float sweep = exp(-pow((y - (s * 1.5 - 0.2)) * 6.0, 2.0)) * 0.55 * sin(3.14159 * s);
  color += vec3(sweep);
  return vec4(color, cover * alpha * enter * reveal);
}

void main() {
  float aspect = uRes.x / uRes.y;
  // The canvas covers only the right part of the hero; map back to whole-hero coordinates.
  vec2 p = vec2((uStart + vUv.x * (1.0 - uStart)) * aspect, 1.0 - vUv.y);
  vec4 acc = vec4(0.0);
  vec4 l;

  l = band(p, aspect, 0.64, 0.95, 0.05, 0.21, 0.0,
           vec3(0.03, 0.27, 0.20), vec3(0.0, 0.52, 0.36), vec3(0.09, 0.61, 0.43), 0.78, 0.65);
  acc.rgb = l.rgb * l.a + acc.rgb * (1.0 - l.a); acc.a = l.a + acc.a * (1.0 - l.a);

  l = band(p, aspect, 0.71, 0.82, 0.06, 0.135, 1.7,
           vec3(0.09, 0.61, 0.43), vec3(0.43, 0.90, 0.70), vec3(0.77, 0.96, 0.86), 0.62, 0.75);
  acc.rgb = l.rgb * l.a + acc.rgb * (1.0 - l.a); acc.a = l.a + acc.a * (1.0 - l.a);

  l = band(p, aspect, 0.78, 0.70, 0.05, 0.12, 3.1,
           vec3(0.94, 0.76, 0.48), vec3(0.91, 0.66, 0.35), vec3(0.79, 0.54, 0.23), 0.72, 0.75);
  acc.rgb = l.rgb * l.a + acc.rgb * (1.0 - l.a); acc.a = l.a + acc.a * (1.0 - l.a);

  l = band(p, aspect, 0.745, 0.78, 0.07, 0.04, 4.4,
           vec3(0.75, 0.96, 0.86), vec3(1.0, 1.0, 1.0), vec3(0.56, 0.94, 0.77), 0.5, 0.9);
  acc.rgb = l.rgb * l.a + acc.rgb * (1.0 - l.a); acc.a = l.a + acc.a * (1.0 - l.a);

  gl_FragColor = acc;
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function HeroRibbon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!canvas || !gl) return;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, "uRes");
    const uStart = gl.getUniformLocation(program, "uStart");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uShift = gl.getUniformLocation(program, "uShift");
    const uIntro = gl.getUniformLocation(program, "uIntro");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = canvas.closest<HTMLElement>("section");
    const start = performance.now();
    // The ribbon animates only during its entrance (unfurl, then the light sweep, done by ~3.8s),
    // then holds its final frame: no work at all while idle. Redrawn only on resize.
    const INTRO_END = 4.2;
    const clock = (now: number) => (reduced ? INTRO_END : Math.min((now - start) / 1000, INTRO_END));
    let frame = 0;
    let visible = true;
    let last = 0;
    let done = reduced;

    const render = (now: number) => {
      last = now;
      // The canvas starts part-way across the hero (see the className); the shader works in
      // whole-hero coordinates.
      const heroWidth = hero?.clientWidth || canvas.clientWidth;
      const startFraction = 1 - canvas.clientWidth / heroWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width / (1 - startFraction), canvas.height);
      gl.uniform1f(uStart, startFraction);
      const t = clock(now);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uIntro, t);
      // Phones: push the silk further right, clear of the text.
      gl.uniform1f(uShift, heroWidth < 640 ? 0.22 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    // During the entrance only: 30 frames a second, skipped while the hero has mostly scrolled
    // away or the tab is hidden. Once the entrance is over, draw the final frame and stop.
    const loop = (now: number) => {
      frame = 0;
      if (!visible || done) return;
      if ((now - start) / 1000 >= INTRO_END) {
        done = true;
        render(now);
        return;
      }
      const scrolled = Number.parseFloat(hero?.style.getPropertyValue("--p") || "0") > 0.75;
      if (now - last >= 33 && !scrolled && !document.hidden) render(now);
      frame = requestAnimationFrame(loop);
    };
    const resize = () => {
      // Performance: the silk is soft, so it is drawn at 60% of CSS resolution (whatever the
      // screen's pixel density) and scaled up by the browser.
      const ratio = 0.6;
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      render(performance.now());
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    let intersection: IntersectionObserver | undefined;
    if (!reduced) {
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !frame && !done) frame = requestAnimationFrame(loop);
      });
      intersection.observe(canvas);
    }
    return () => {
      resizeObserver.disconnect();
      intersection?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Only the right part of the hero, where the silk is: fewer pixels to shade.
      className="pointer-events-none absolute inset-y-0 right-0 left-[40%] h-full w-[60%] max-sm:left-[50%] max-sm:w-[50%] [opacity:calc(0.95-var(--p,0)*1.2)] [transform:translate3d(calc(var(--p,0)*10%),calc(var(--p,0)*-24%),0)]"
    />
  );
}
