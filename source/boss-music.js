// Two streamed media elements crossfade; never decode the whole BGM to PCM.
export function createBossMusic({context,output,url,AudioClass=globalThis.Audio,volume=.12,fadeSeconds=1.2,setTimer=setTimeout,clearTimer=clearTimeout}){
 const envelope=context.createGain();envelope.gain.value=0;envelope.connect(output);let stopTimer=null;
 const cancelStop=()=>{if(stopTimer!==null){clearTimer(stopTimer);stopTimer=null;}};
 const fadeTo=value=>envelope.gain.setTargetAtTime(value,context.currentTime,.4);
 const tracks=Array.from({length:2},()=>{const media=new AudioClass(String(url));media.preload='auto';const source=context.createMediaElementSource(media),gain=context.createGain();gain.gain.value=0;source.connect(gain);gain.connect(envelope);return {media,source,gain,pending:false,blocked:false};});
 let current=0,paused=true,disposed=false,crossfading=false;
 const level=(track,value)=>track.gain.gain.setTargetAtTime(value,context.currentTime,.025);
 function play(track){if(disposed||paused||track.pending||track.blocked||!track.media.paused)return;track.pending=true;try{Promise.resolve(track.media.play()).catch(error=>{if(!paused&&error?.name!=='AbortError')track.blocked=true;}).finally(()=>{track.pending=false;});}catch{track.blocked=true;track.pending=false;}}
 function update(){if(disposed||paused)return;const a=tracks[current],b=tracks[1-current],duration=a.media.duration;play(a);if(!Number.isFinite(duration)||duration<=0)return;const fade=Math.min(fadeSeconds,duration/4),remaining=duration-a.media.currentTime;
  if(remaining<=fade&&!crossfading){b.media.currentTime=0;b.blocked=false;crossfading=true;play(b);}
  if(crossfading){play(b);const progress=Math.max(0,Math.min(1,(fade-remaining)/fade));level(a,volume*Math.cos(progress*Math.PI/2));level(b,b.media.paused?0:volume*Math.sin(progress*Math.PI/2));if(a.media.ended||progress>=1){a.media.pause();a.media.currentTime=0;level(a,0);current=1-current;crossfading=false;level(b,volume);}}
  else level(a,volume*Math.min(1,a.media.currentTime/.2));
 }
 function pause(){paused=true;cancelStop();fadeTo(0);stopTimer=setTimer(()=>{stopTimer=null;for(const track of tracks)track.media.pause();},2400);}
 return {update,pause,resume(){if(disposed)return;cancelStop();paused=false;fadeTo(1);for(const track of tracks)track.blocked=false;play(tracks[current]);if(crossfading)play(tracks[1-current]);update();},dispose(){if(disposed)return;cancelStop();paused=true;disposed=true;fadeTo(0);stopTimer=setTimer(()=>{stopTimer=null;for(const track of tracks){track.media.pause();track.media.removeAttribute('src');track.media.load();track.source.disconnect();track.gain.disconnect();}envelope.disconnect();},2400);}};
}
