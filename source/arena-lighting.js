import * as THREE from './vendor/three.js';
import {stageRadius} from './stages.js';
// Keep the existing sun shadow map; the overhead spot adds no shadow render pass.
export function setArenaLighting(view,stage){
 const dark=Boolean(stage.halloween),environment=view.environment;if(!environment)return;
 const {ambient,sun,floor,grid}=environment;
 ambient.intensity=dark?.42:1.1;ambient.groundColor.setHex(dark?0x39314c:0x8e9cae);sun.intensity=dark?.7:2.8;
 floor.material.color.setHex(dark?0x35313e:0xa5a7ab);grid.visible=true;
 const background=dark?0x16111f:0xb4b6b9;view.scene.fog.color.setHex(background);view.renderer.setClearColor(background);
 if(dark&&!environment.spot){const spot=new THREE.SpotLight(0xffeddb,520,45,.65,.6,2);spot.name='halloween-spotlight';spot.position.set(0,13,0);spot.castShadow=false;view.scene.add(spot,spot.target);environment.spot=spot;}
 if(environment.spot){environment.spot.visible=dark;environment.spot.angle=Math.atan((stageRadius(stage)+.5)/13)*1.12;}
}
