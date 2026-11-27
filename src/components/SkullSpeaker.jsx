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
        <canvas ref={canvasRef} width="512" height="512" className="skull-layer" />
      </div>
      <button type="button" className="btn btn-ghost skull-btn" onClick={toggle}>
        {speaking ? t('home.skull.stop') : t('home.skull.talk')}
      </button>
    </div>
  );
}
