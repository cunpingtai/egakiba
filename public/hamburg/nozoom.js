// タップ・ダブルタップ・ピンチ・Ctrl+ホイールで画面が拡大されないようにする(iPhoneは viewport の指定を無視するのでこっちで止める)
(() => {
  const st = document.createElement("style");
  st.textContent = "html{touch-action:manipulation;-webkit-text-size-adjust:100%}";
  document.head.appendChild(st);
  const stop = (e) => e.preventDefault();
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, stop, { passive: false });
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("dblclick", stop, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", ";", "0"].includes(e.key)) e.preventDefault(); });
})();
