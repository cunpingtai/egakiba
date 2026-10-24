/** CSS pixel logic stays independent from screen DPI / canvas buffer size. */
export function targetRadius({pointerType='touch',width=390,height=780}={}){
 const r=Math.min(width,height)*(pointerType==='touch'?.21:.17);
 return Math.round(Math.max(pointerType==='touch'?52:42,Math.min(pointerType==='touch'?88:70,r)));
}
export function gestureWithinBounds({start,end,width=390,height=780,exclusionBottom=108,exclusionTop=140}={}){
 if(!start||!end)return false;
 return start.y>=exclusionTop&&start.y<=height-exclusionBottom&&end.x>=-16&&end.x<=width+16;
}
export function touchIntent({distance=0,elapsed=0,pointerType='touch'}={}){
 if(pointerType==='mouse')return distance>=16?'drag':'tap';
 if(distance<18&&elapsed>550)return 'long-press';
 return distance>=20?'drag':'tap';
}
