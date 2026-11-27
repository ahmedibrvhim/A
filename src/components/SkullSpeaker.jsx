import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext.jsx';

/*
  Talking skull.
  Main mode: plays /voice/en.mp3 or /voice/ar.mp3; the jaw follows the real audio volume.
  Backup mode (if the mp3 can't play): browser voice with a simulated jaw.
  Everything resets (jaw closed) when speech ends.
*/
export default function SkullSpeaker() {
  const { t, lang } = useLang();
  const [speaking, setSpeaking] = useState(false);
  const rootRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const pollRef = useRef(0);

  const canvasRef = useRef(null);
  const eyesRef = useRef(null);          // eye-socket expression layer
  const speakingRef = useRef(false);
  const levelRef = useRef(0);            // current mouth openness 0..1
  const rawRef = useRef(0);              // raw voice loudness (not clipped like the jaw) -> drives the eye expressions
  const sheetRef = useRef(null);
  const frameRef = useRef({ k: 0, t: 0 });

  // Mouth is drawn from 6 pre-made frames (0 = closed ... 5 = wide open), switched about 16 times a second.
  const FRAMES = 6, FX = 170, FY = 376, FW = 200, FH = 136;
  const drawFrame = (k) => {
    const c = canvasRef.current, img = sheetRef.current;
    if (!c || !img || !img.complete) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    ctx.drawImage(img, k * FW, 0, FW, FH, FX, FY, FW, FH);
  };
  // v = 0..1 mouth openness. force=true skips the speed limit (used for closing).
  const setJaw = (v, force) => {
    levelRef.current = v;
    if (!audioRef.current) rawRef.current = v * 0.2;   // backup voice: use the simulated jaw as loudness
    const now = performance.now();
    const k = Math.max(0, Math.min(FRAMES - 1, Math.round(v * (FRAMES - 1))));
    const f = frameRef.current;
    if (k === f.k) return;
    if (!force && now - f.t < 60) return;
    f.k = k; f.t = now;
    drawFrame(k);
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => drawFrame(0);
    img.src = '/skull-mouth.png';
    sheetRef.current = img;
  }, []);


  // ---- eye-socket expressions ----
  // Driven by the voice, not random. The loudness of the voice is split into:
  //   stress  = loudness now compared with the recent average -> stressed syllables snap the brows down and pinch them inward
  //   pauses  = quiet gaps between words / phrases              -> brows relax
  //   peaks   = the very loudest moments                        -> sockets widen a little
  // The brow/socket area of the skull is copied, tilted / squeezed / shifted and blended back in with a soft edge.
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    const canvas = eyesRef.current;
    if (!canvas) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    const tmp = document.createElement('canvas');
    tmp.width = 160; tmp.height = 100;
    const tctx = tmp.getContext('2d');
    const img = new Image();
    let ready = false;
    img.onload = () => { ready = true; };
    img.src = '/skull-base.png';

    const EYES = [{ cx: 207, cy: 265, sgn: 1 }, { cx: 322, cy: 263, sgn: -1 }];
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const cur = { drop: 0, tilt: 0, squint: 0, wide: 0 };
    let raf = 0, last = performance.now(), drawn = false;
    let slow = 0, fast = 0, active = 0;   // analysis state

    const drawEye = (cx, cy, sgn, e) => {
      const ang = sgn * e.tilt;
      const sy = 1 - e.squint * 0.3 + e.wide * 0.22, sx = 1 + e.wide * 0.1;
      const dy = e.drop * 5 - e.wide * 3;
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, 160, 100);
      tctx.save();
      tctx.translate(80, 50 + dy);
      tctx.rotate(ang);
      tctx.scale(sx, sy);
      tctx.translate(-cx, -cy);
      tctx.drawImage(img, 0, 0);
      tctx.restore();
      // soft elliptical edge so the moved patch blends into the untouched skull
      tctx.globalCompositeOperation = 'destination-in';
      tctx.save();
      tctx.translate(80, 47);
      tctx.scale(66, 40);
      const g = tctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tctx.fillStyle = g;
      tctx.beginPath(); tctx.arc(0, 0, 1, 0, Math.PI * 2); tctx.fill();
      tctx.restore();
      ctx.drawImage(tmp, cx - 80, cy - 50);
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const talking = speakingRef.current;
      const level = talking ? levelRef.current : 0;          // 0..1 mouth openness (same signal as the jaw)

      // --- analyse the voice ---
      const e = talking ? rawRef.current / 0.2 : 0;               // ~0..1.4, typical speech about 0.7
      fast += (e - fast) * (1 - Math.exp(-dt / 0.07));            // syllable-level loudness
      slow += (e - slow) * (1 - Math.exp(-dt / 1.2));             // phrase-level average
      active += ((talking ? 1 : 0) - active) * (1 - Math.exp(-dt / 0.5));   // fade the effect in/out around speech
      const stress = clamp((fast - slow) / 0.35, -1, 1);
      const push = Math.max(stress, 0);                           // stressed syllable
      const calm = clamp(1 - fast / 0.4, 0, 1);                   // pause / very quiet
      const peak = clamp((fast - 0.8) / 0.25, 0, 1);               // loudest moments

      // --- map the voice to the face ---
      const target = {
        drop:   active * clamp((0.3 + 0.55 * push + 0.15 * slow) * (1 - 0.7 * calm), 0, 1.2),
        tilt:   active * (0.08 + 0.16 * push + 0.04 * slow) * (1 - 0.6 * calm),
        squint: active * clamp((0.25 + 0.45 * push) * (1 - 0.7 * calm) - 0.25 * peak, 0, 1),
        wide:   active * 0.5 * peak * (1 - 0.6 * push),
      };
      const k = 1 - Math.exp(-dt * 12);                          // follows quickly, but smooth (no jitter)
      let moving = false;
      for (const key in cur) {
        cur[key] += (target[key] - cur[key]) * k;
        if (Math.abs(cur[key]) > 0.004) moving = true;
      }
      if (ready && moving) {
        ctx.clearRect(0, 0, 512, 512);
        for (const eye of EYES) drawEye(eye.cx, eye.cy, eye.sgn, cur);
        drawn = true;
      } else if (drawn) {
        ctx.clearRect(0, 0, 512, 512);
        drawn = false;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(pollRef.current);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.onerror = null; audioRef.current.pause(); audioRef.current = null; }
    rawRef.current = 0;
    setJaw(0, true);
    setSpeaking(false);
  }, []);

  useEffect(() => { stop(); }, [lang, stop]);
  useEffect(() => () => { stop(); if (ctxRef.current) ctxRef.current.close().catch(() => {}); }, [stop]);

  // ---- main mode: real audio file, lip-sync from volume ----
  function playFile() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    ctx.resume && ctx.resume();

    const audio = new Audio(`/voice/${lang}.mp3`);
    audio.preload = 'auto';
    audioRef.current = audio;

    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    analyser.connect(ctx.destination);

    const buf = new Uint8Array(analyser.fftSize);
    let jaw = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      rawRef.current = rms;
      const target = rms < 0.015 ? 0 : Math.min(1, (rms - 0.015) * 7);   // gate small noise
      jaw += (target - jaw) * (target > jaw ? 0.5 : 0.2);                // quick open, slower close
      setJaw(jaw);
      rafRef.current = requestAnimationFrame(tick);
    };

    audio.onended = stop;
    audio.onerror = () => { stop(); playBrowserVoice(); };
    const p = audio.play();             // called directly inside the tap (needed on iPhone)
    setSpeaking(true);
    tick();
    if (p && p.catch) p.catch(() => { stop(); playBrowserVoice(); });
  }

  // ---- backup mode: built-in browser voice ----
  function playBrowserVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const text = t('home.skull.script');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    u.pitch = 0.3; u.rate = 0.85;
    const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith(lang));
    u.voice = voices.find(v => /male|david|daniel|george|alex/i.test(v.name)) || voices[0] || null;
    u.onend = stop; u.onerror = stop;
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);

    const start = performance.now();
    const tick = () => {
      const s = (performance.now() - start) / 1000;
      setJaw(Math.min(1, Math.abs(Math.sin(s * 8)) * 0.55 + Math.abs(Math.sin(s * 13.3)) * 0.3));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    // iPhone Safari sometimes never fires "end", so also watch the speaking flag and a time limit
    const maxMs = Math.max(8000, text.length * 120 / u.rate);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const elapsed = performance.now() - start;
      if ((elapsed > 1500 && !synth.speaking) || elapsed > maxMs) stop();
    }, 400);
  }

  function toggle() {
    if (speaking) { stop(); return; }
    try { playFile(); } catch (e) { console.error(e); stop(); playBrowserVoice(); }
  }

  return (
    <div className={'skull' + (speaking ? ' is-speaking' : '')} ref={rootRef}>
      <div className="skull-frame">
        <img src="/skull-base.png" alt="" className="skull-layer" />
        <canvas ref={eyesRef} width="512" height="512" className="skull-layer" />
        <canvas ref={canvasRef} width="512" height="512" className="skull-layer" />
      </div>
      <button type="button" className="btn btn-ghost skull-btn" onClick={toggle}>
        {speaking ? t('home.skull.stop') : t('home.skull.talk')}
      </button>
    </div>
  );
}
