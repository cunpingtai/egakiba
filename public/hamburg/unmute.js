// iPhoneの「消音モード(マナーモード)」でも音が鳴るようにする
// Web Audioの音は、消音スイッチで消える種類の音として扱われる。最初のタップで
// ①対応している端末では、音の種類を「再生(動画や音楽と同じ)」にする
// ②無音の音声をくり返し再生しておく(これで同じく「再生」の扱いになる)
(() => {
  let el = null, ok = false;
  // ゲームの音(Web Audio)を全部おぼえておき、画面から離れたら止める
  // (スマホでブラウザを閉じた・別アプリ・画面オフ / PCで別タブ・最小化 → 鳴りっぱなしにしない)
  const ctxs = [];
  for (const k of ["AudioContext", "webkitAudioContext"]) {
    const C = window[k]; if (!C || C.__wrapped) continue;
    const W = function (...a) { const c = new C(...a); ctxs.push(c); return c; };
    W.prototype = C.prototype; W.__wrapped = true; try { window[k] = W; } catch (e) {}
  }
  let media = [];
  const pauseAll = () => {
    for (const c of ctxs) if (c.state === "running") { c.__auto = true; c.suspend().catch(() => {}); }
    media = [...document.querySelectorAll("audio, video")].filter((m) => !m.paused && m !== el); media.forEach((m) => m.pause());
    if (el) { el.pause(); ok = false; }
    try { if (navigator.audioSession) navigator.audioSession.type = "auto"; } catch (e) {}
  };
  const resumeAll = () => {
    for (const c of ctxs) if (c.__auto) { c.__auto = false; c.resume().catch(() => {}); }
    media.forEach((m) => { const p = m.play(); if (p && p.catch) p.catch(() => {}); }); media = [];
  };
  addEventListener("pagehide", pauseAll); document.addEventListener("freeze", pauseAll);
  function silentWav() {
    const sr = 8000, n = 4000, b = new ArrayBuffer(44 + n), v = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); // 8bitの無音
    return new Blob([b], { type: "audio/wav" });
  }
  function go() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (ok) return;
    try {
      if (!el) {
        el = document.createElement("audio");
        el.setAttribute("playsinline", ""); el.setAttribute("x-webkit-airplay", "deny");
        el.loop = true; el.preload = "auto"; el.src = URL.createObjectURL(silentWav());
      }
      const p = el.play(); if (p && p.then) p.then(() => { ok = true; }).catch(() => {});
    } catch (e) {}
  }
  for (const t of ["touchend", "pointerdown", "click", "keydown"]) addEventListener(t, go, { capture: true, passive: true });
  // ほかのアプリに切り替えたら止める / 戻ったら再開
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { pauseAll(); return; }
    resumeAll(); if (el) go();
  });
  addEventListener("pageshow", () => { if (!document.hidden) { resumeAll(); if (el) go(); } });
})();
