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
  const levelRef = useRef(0);            // current mouth openness 0..1 (drives expression strength)
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
  // The brow/socket area of the skull is copied, tilted / squeezed / shifted and blended back in with a soft edge.
  // Parameters: drop (brow down), tilt (inner end down = angry, up = sad), squint (narrow), wide (open up).
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
    const NEUTRAL = { drop: 0, tilt: 0, squint: 0, wide: 0 };
    const MOODS = {
      angry:  { drop: 1,  tilt: 0.22,  squint: 0.8, wide: 0 },
      squint: { drop: 0.6, tilt: 0.06, squint: 1,   wide: 0 },
      wide:   { drop: 0,  tilt: 0,     squint: 0,   wide: 1 },
      sad:    { drop: 0.3, tilt: -0.2, squint: 0,   wide: 0.2 },
    };
    const speakPool = ['angry', 'angry', 'squint', 'wide', 'sad'];
    const idlePool = ['squint', 'angry'];
    const cur = { ...NEUTRAL }, tgt = { ...NEUTRAL };
    let raf = 0, last = performance.now(), nextAt = last + 2500, holdUntil = 0, drawn = false, wasTalking = false;

    const setMood = (name, amp) => {
      const m = name ? MOODS[name] : NEUTRAL;
      for (const k in NEUTRAL) tgt[k] = m[k] * amp;
    };

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
      if (talking !== wasTalking) {            // speech started or ended: restart the schedule
        wasTalking = talking; holdUntil = 0;
        if (talking) nextAt = now; else { setMood(null, 1); nextAt = now + 2500; }
      }
      if (now >= nextAt) {
        if (talking) {
          setMood(speakPool[Math.floor(Math.random() * speakPool.length)], 0.7 + Math.random() * 0.3);
          nextAt = now + 700 + Math.random() * 900;
        } else if (!holdUntil) {                // small idle twitch, then back to neutral
          setMood(idlePool[Math.floor(Math.random() * idlePool.length)], 0.35);
          holdUntil = now + 700; nextAt = holdUntil;
        } else {
          setMood(null, 1); holdUntil = 0; nextAt = now + 3000 + Math.random() * 4000;
        }
      }
      const k = 1 - Math.exp(-dt * (talking ? 7 : 5));
      let moving = false;
      for (const key in cur) {
        // while talking the mouth volume adds a little extra intensity
        const goal = tgt[key] * (talking ? 0.85 + 0.3 * levelRef.current : 1);
        cur[key] += (goal - cur[key]) * k;
        if (Math.abs(goal - cur[key]) > 0.002 || Math.abs(cur[key]) > 0.01) moving = true;
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
