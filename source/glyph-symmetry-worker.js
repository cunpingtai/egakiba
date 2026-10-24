import {glyphSymmetry} from './glyph-symmetry.js';
self.onmessage=event=>{const {id,triangles}=event.data;try{self.postMessage({id,result:glyphSymmetry({triangles})});}catch{self.postMessage({id,error:true});}};
