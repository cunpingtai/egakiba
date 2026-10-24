// Bundled outlines are preferred. When a character is absent, the same fallback
// stack used by the preview is rasterized and converted into game geometry.
export const FONTS = Object.freeze({
 gothic: {label:'ゴシック',family:'Moji',file:'mplus1-medium.ttf',name:'M PLUS 1 Medium',fallbackStyle:'gothic',fallback:'"Hiragino Sans","Yu Gothic",Meiryo,sans-serif'},
 mincho: {label:'明朝体',family:'MojiMincho',file:'NotoSerifJP-Regular.ttf',name:'Noto Serif JP Regular',fallbackStyle:'mincho',fallback:'"Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif'},
 pop: {label:'POP',family:'MojiPop',file:'RoundedMplus1c-ExtraBold.ttf',name:'M PLUS Rounded 1c ExtraBold',fallbackStyle:'pop',fallback:'"Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,sans-serif'},
 brush: {label:'行書体',family:'MojiBrush',file:'KouzanGyousho.ttf',name:'衡山毛筆フォント行書',fallbackStyle:'brush',fallback:'"Kaiti SC","Yu Mincho","MS Mincho",serif'},
});
export function validFont(id){return Object.hasOwn(FONTS,id)?id:'gothic';}
