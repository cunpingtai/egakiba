// 素材の版（2026-10-26 オーナー「他にもあるでしょが治ってない」→ ブラウザが古い声のファイルと古い JS を覚えていた）。
// 値は index.html の importmap の ?v=（自分の URL から読む）。声・効果音・模型・肌の絵の URL にも同じ ?v= を付ける。上げるのは tools/bump_version.mjs
export const V = new URL(import.meta.url).searchParams.get('v') || 'dev';
export const vq = (url) => `${url}${url.includes('?') ? '&' : '?'}v=${V}`;
