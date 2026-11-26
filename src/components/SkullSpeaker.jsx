import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext.jsx';

/*
  Talking skull.
  1) If /public/voice/en.mp3 (or ar.mp3) exists, it plays that file and the jaw follows the real audio volume.
  2) If not, it uses the browser's built-in voice (free, no download) and the jaw moves on a simulated rhythm.
  Eyes fade to red while speaking.
*/
export default function SkullSpeaker() {
  const { t, lang } = useLang();
  const [speaking, setSpeaking] = useState(false);
  const rootRef = useRef(null);
  const rafRef = useRef(0);
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const stopRef = useRef(() => {});

  const setJaw = (v) => rootRef.current && rootRef.current.style.setProperty('--jaw', v.toFixed(3));

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setJaw(0);
    setSpeaking(false);
  }, []);
  stopRef.current = stop;

  // stop if language changes or page closes
  useEffect(() => { stop(); }, [lang, stop]);
  useEffect(() => () => { stopRef.current(); if (ctxRef.current) ctxRef.current.close().catch(() => {}); }, []);

  async function audioFileExists(url) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      return r.ok && (r.headers.get('content-type') || '').includes('audio');
    } catch (e) { return false; }
  }

  async function playFile(url) {
    const audio = new Audio(url);
    audioRef.current = audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    // deep + eerie: low boost and a soft echo
    const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 220; low.gain.value = 7;
    const echo = ctx.createDelay(); echo.delayTime.value = 0.14;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    src.connect(low); low.connect(analyser); low.connect(ctx.destination);
    low.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(ctx.destination);

    const buf = new Uint8Array(analyser.fftSize);
    let smooth = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const target = Math.min(1, rms * 6);
      smooth += (target - smooth) * 0.45;
      setJaw(smooth);
      rafRef.current = requestAnimationFrame(tick);
    };
    audio.onended = stop;
    audio.onerror = stop;
    await audio.play();
    setSpeaking(true);
    tick();
  }

  function playBrowserVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return false;
    const u = new SpeechSynthesisUtterance(t('home.skull.script'));
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    u.pitch = 0.1;   // deep
    u.rate = 0.82;   // slow, ominous
    const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith(lang));
    u.voice = voices.find(v => /male|david|daniel|george|alex|google uk english male/i.test(v.name)) || voices[0] || null;
    u.onend = stop;
    u.onerror = stop;
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
    const start = performance.now();
    const tick = () => {
      const s = (performance.now() - start) / 1000;
      const v = Math.abs(Math.sin(s * 9)) * 0.6 + Math.abs(Math.sin(s * 23.7)) * 0.4;
      setJaw(Math.min(1, v));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return true;
  }

  async function toggle() {
    if (speaking) { stop(); return; }
    const url = `/voice/${lang}.mp3`;
    try {
      if (await audioFileExists(url)) { await playFile(url); return; }
    } catch (e) { console.error(e); stop(); }
    playBrowserVoice();
  }

  return (
    <div className={'skull' + (speaking ? ' is-speaking' : '')} ref={rootRef}>
      <div className="skull-frame">
        <img src="/skull-base.png" alt="" className="skull-layer" />
        <span className="skull-eye skull-eye-l" />
        <span className="skull-eye skull-eye-r" />
        <img src="/skull-jaw.png" alt="" className="skull-layer skull-jaw" />
      </div>
      <button type="button" className="btn btn-ghost skull-btn" onClick={toggle}>
        {speaking ? t('home.skull.stop') : t('home.skull.talk')}
      </button>
      {speaking && <p className="skull-caption" aria-live="polite">{t('home.skull.script')}</p>}
    </div>
  );
}
