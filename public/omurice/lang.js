/* このサイトでは日本語だけを使う。 */
(function (global) {
  "use strict";
  global.zLang = "ja";
  global.zLangFull = "ja";
  global.zSetLang = function () {};
  global.zT = function (ja) { return ja; };
  if (global.document && global.document.documentElement) global.document.documentElement.lang = "ja";
})(window);
