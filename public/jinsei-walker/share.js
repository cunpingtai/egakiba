/* ゲーム共通のシェア機能。X（Twitter）の投稿画面を、本文とリンク付きで開く。

     zShare({
       text: "40075.0kmの水切りに成功しました #水切り世界一周",
       native: false,                    // 端末の共有シートを使わず、Xの投稿画面を直接開く
       done: function (result) { ... }   // "shared" / "opened" / "cancel" / "blocked"
     });

   公開ゲームはタイトルとサムネのある共有ページを使う。
   制作中の固定リンクでも、同じゲームの本番の共有ページを出す（固定リンクは広めない）。
   手元の下書きなどは、埋め込んでいるページのURLを共有する。

   スマホでは、まず端末の共有シート（Web Share）を試す。
   window.open はポップアップとして止められることがあり、
   ボタンを押しても何も起きない端末があるため。
   それも使えないときは新しいタブ、それも開けないときは
   リンクを作って踏ませる、と順に下りていく。 */
(function (global) {
  "use strict";

  function pageUrl() {
    /* 制作中は正式な共有ページがまだないので、本体へ案内する。 */
    if (global.document && global.document.querySelector('meta[name="zounoashi-unlisted"]')) {
      var direct = new URL(global.location.href);
      direct.searchParams.delete("v");
      return direct.href;
    }
    /* 制作中の固定リンク。版の名前「<ゲーム名>-<時刻>」からゲームを見分ける */
    var version = global.document && global.document.querySelector('meta[name="preview-version"]');
    var preview = version && /^([a-z0-9-]+?)-\d+$/.exec(version.content || "");
    if (preview) return shareUrl(preview[1], global.location.search);
    var game = global.location.pathname.match(/^\/games\/([a-z0-9-]+)\/(?:index\.html)?$/);
    var current = global.location.href;
    try {
      if (global.parent && global.parent !== global) current = global.parent.location.href;
    } catch (e) {}
    if (!game) return current;
    var page = new URL(current);
    var query = page.hash.indexOf("#/game/" + game[1]) === 0
      ? page.hash.slice(page.hash.indexOf("?")) : page.search;
    return shareUrl(game[1], query);
  }
  function shareUrl(id, query) {
    if (query.charAt(0) !== "?") query = "";
    var params = new URLSearchParams(query);
    ["v", "_preview", "rec", "recorder-cli"].forEach(function (k) { params.delete(k); });
    /* 大きいカードの保存済み表示を避け、確認済みの正方形カードのURLを使う。 */
    params.set("card", "square2");
    var search = params.toString();
    return new URL("./", global.location.href).href;
  }

  function isPhone() {
    var n = global.navigator || {};
    var ua = n.userAgent || "";
    if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
    return (n.maxTouchPoints || 0) > 1 && /Mac/i.test(n.platform || "");   // iPadOS
  }

  /* 新しいタブで開く。開けなければリンクを作って踏ませる */
  function openTab(url, done) {
    var w = null;
    try { w = global.open(url, "_blank"); } catch (e) {}
    if (w) {
      try { w.opener = null; } catch (e) {}
      done("opened");
      return;
    }
    try {
      var a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 0);
      done("opened");
      return;
    } catch (e) {}
    done("blocked");
  }

  global.zShare = function (opt) {
    opt = opt || {};
    var text = ((opt.text || "") + "\n" + new URL("./", global.location.href).href).trim();
    var done = opt.done || function () {};
    var nav = global.navigator;
    if (nav && nav.share) {
      try {
        var p = nav.share({ text: text });
        if (p && p.then) {
          p.then(function () { done("shared"); }, function (e) { done(e && e.name === "AbortError" ? "cancel" : "copied"); });
          return;
        }
      } catch (e) {}
    }
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(text).then(function () { done("copied"); }, function () { done("blocked"); });
      return;
    }
    done("blocked");
  };
  /* 総合共有も同じ正式URL・診断結果を使う。 */
  global.zShare.pageUrl = pageUrl;
})(window);
