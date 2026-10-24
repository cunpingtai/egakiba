/** R1-01 raster drawing editor. Zero framework dependency. */
export const DRAWING_SIZE=1024;
const MAX_UNDO=8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class DrawingEditor {
  constructor(canvas,onChange=()=>{}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{willReadFrequently:true});
    canvas.width=canvas.height=DRAWING_SIZE;this.ctx.lineCap='round';this.ctx.lineJoin='round';
    this.tool='pen';this.color='#27364e';this.width=28;this.undoStack=[];this.redoStack=[];
    this.hasInk=false;this.onChange=onChange;this.drag=null;
    canvas.addEventListener('pointerdown', e=>this.down(e));
    canvas.addEventListener('pointermove', e=>this.move(e));
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>this.up(e));
  }
  snapshot(){return this.ctx.getImageData(0,0,DRAWING_SIZE,DRAWING_SIZE);}
  commit(){this.undoStack.push(this.snapshot());if(this.undoStack.length>MAX_UNDO)this.undoStack.shift();this.redoStack=[];this.onChange(this);}
  restore(image){this.ctx.putImageData(image,0,0);this.checkInk();this.onChange(this);}
  undo(){if(!this.undoStack.length)return;this.redoStack.push(this.snapshot());this.restore(this.undoStack.pop());}
  redo(){if(!this.redoStack.length)return;this.undoStack.push(this.snapshot());this.restore(this.redoStack.pop());}
  clear(){if(!this.hasInk)return;this.commit();this.ctx.clearRect(0,0,DRAWING_SIZE,DRAWING_SIZE);this.hasInk=false;this.onChange(this);}
  setTool(tool){if(['pen','fill','eraser'].includes(tool)){this.tool=tool;this.onChange(this);}}
  setColor(color){if(/^#[a-f0-9]{6}$/i.test(color)){this.color=color;if(this.tool==='eraser')this.tool='pen';this.onChange(this);}}
  setWidth(width){this.width=clamp(Number(width)||28,8,100);this.onChange(this);}
  pos(e){const r=this.canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width*DRAWING_SIZE,0,DRAWING_SIZE-1),y:clamp((e.clientY-r.top)/r.height*DRAWING_SIZE,0,DRAWING_SIZE-1)};}
  down(e){if(this.drag||e.button!==0)return;e.preventDefault();const p=this.pos(e);
    if(this.tool==='fill'){if(this.fill(p.x,p.y))this.onChange(this);return;}
    this.commit();this.drag={id:e.pointerId,point:p};this.canvas.setPointerCapture(e.pointerId);this.stroke(p,p);
    if(this.tool==='pen')this.hasInk=true;this.onChange(this);
  }
  move(e){if(!this.drag||this.drag.id!==e.pointerId)return; e.preventDefault();
    const moves=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];
    for(const event of (moves.length?moves:[e])){const p=this.pos(event);this.stroke(this.drag.point,p);this.drag.point=p;}
  }
  up(e){if(!this.drag||this.drag.id!==e.pointerId)return;this.drag=null;if(this.tool==='eraser')this.checkInk();this.onChange(this);}
  stroke(a,b){const c=this.ctx;c.save();c.globalCompositeOperation=this.tool==='eraser'?'destination-out':'source-over';c.strokeStyle=this.color;c.lineWidth=this.tool==='eraser'?this.width*2.3:this.width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x+.001,b.y+.001);c.stroke();c.restore();}
  checkInk(){const d=this.ctx.getImageData(0,0,DRAWING_SIZE,DRAWING_SIZE).data;this.hasInk=false;for(let i=3;i<d.length;i+=4)if(d[i]>60){this.hasInk=true;break;}}
  fill(px,py){const w=DRAWING_SIZE,d=this.ctx.getImageData(0,0,w,w),a=d.data,idx=(Math.floor(py)*w+Math.floor(px)),start=idx*4;
    const orig=[a[start],a[start+1],a[start+2],a[start+3]], rgb=[1,3,5].map(i=>parseInt(this.color.slice(i,i+2),16));
    if(orig[3]>220 && rgb.reduce((sum,c,i)=>sum+Math.abs(c-orig[i]),0)<10)return false;
    if(!this.hasInk&&orig[3]<60)return false;this.commit();const open=orig[3]<60, matched=new Uint8Array(w*w),q=new Int32Array(w*w);let head=0,tail=0;matched[idx]=1;q[tail++]=idx;
    const similar=i=>{const k=i*4;return open?a[k+3]<60:Math.abs(a[k]-orig[0])+Math.abs(a[k+1]-orig[1])+Math.abs(a[k+2]-orig[2])+Math.abs(a[k+3]-orig[3])<85;};
    while(head<tail){const i=q[head++],x=i%w;for(const j of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<w*(w-1)?i+w:-1]){if(j>=0&&!matched[j]&&similar(j)){matched[j]=1;q[tail++]=j;}}}
    for(let n=0;n<tail;n++){const k=q[n]*4;a[k]=rgb[0];a[k+1]=rgb[1];a[k+2]=rgb[2];a[k+3]=255;}
    this.ctx.putImageData(d,0,0);this.hasInk=true;return true;
  }
  async importFile(file,{removeWhite=false}={}){
    if(!file||file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('8MB 以下の画像を選んでください');
    const image=await createImageBitmap(file);const c=document.createElement('canvas');c.width=c.height=DRAWING_SIZE;const g=c.getContext('2d');
    const scale=Math.min(DRAWING_SIZE/image.width,DRAWING_SIZE/image.height)*.90;
    const w=Math.round(image.width*scale),h=Math.round(image.height*scale),x=(DRAWING_SIZE-w)/2,y=(DRAWING_SIZE-h)/2;
    g.drawImage(image,x,y,w,h);if(image.close)image.close();
    if(removeWhite){const p=g.getImageData(0,0,DRAWING_SIZE,DRAWING_SIZE),d=p.data;for(let i=0;i<d.length;i+=4){const lum=Math.min(d[i],d[i+1],d[i+2]);d[i+3]=Math.min(d[i+3],Math.round((255-lum)*3));}g.putImageData(p,0,0);}
    this.commit();this.ctx.clearRect(0,0,DRAWING_SIZE,DRAWING_SIZE);this.ctx.drawImage(c,0,0);this.checkInk();this.onChange(this);
  }
  async toPng(){return new Promise((res,rej)=>this.canvas.toBlob(blob=>blob?res(blob):rej(Error('PNG export failed')),'image/png'));}
  loadImageElement(img){this.commit();this.ctx.clearRect(0,0,DRAWING_SIZE,DRAWING_SIZE);this.ctx.drawImage(img,0,0,DRAWING_SIZE,DRAWING_SIZE);this.checkInk();this.onChange(this);}
}
