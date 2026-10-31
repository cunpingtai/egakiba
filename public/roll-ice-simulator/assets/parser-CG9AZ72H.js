/**
 * @license
 * Copyright 2021 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class c{constructor(o){this.model=new Map(Object.entries(o).map(([l,i])=>[l,new Map(Object.entries(i))])),this.baseScore=-.5*[...this.model.values()].flatMap(l=>[...l.values()]).reduce((l,i)=>l+i,0)}parse(o){if(o==="")return[];const l=this.parseBoundaries(o),i=[];let u=0;for(const d of l)i.push(o.slice(u,d)),u=d;return i.push(o.slice(u)),i}parseBoundaries(o){const l=[],i=this.model.get("UW1"),u=this.model.get("UW2"),d=this.model.get("UW3"),r=this.model.get("UW4"),g=this.model.get("UW5"),e=this.model.get("UW6"),v=this.model.get("BW1"),n=this.model.get("BW2"),b=this.model.get("BW3"),h=this.model.get("TW1"),a=this.model.get("TW2"),m=this.model.get("TW3"),w=this.model.get("TW4");for(let t=1;t<o.length;t++){let s=this.baseScore;s+=i?.get(o.substring(t-3,t-2))||0,s+=u?.get(o.substring(t-2,t-1))||0,s+=d?.get(o.substring(t-1,t))||0,s+=r?.get(o.substring(t,t+1))||0,s+=g?.get(o.substring(t+1,t+2))||0,s+=e?.get(o.substring(t+2,t+3))||0,s+=v?.get(o.substring(t-2,t))||0,s+=n?.get(o.substring(t-1,t+1))||0,s+=b?.get(o.substring(t,t+2))||0,s+=h?.get(o.substring(t-3,t))||0,s+=a?.get(o.substring(t-2,t+1))||0,s+=m?.get(o.substring(t-1,t+2))||0,s+=w?.get(o.substring(t,t+3))||0,s>0&&l.push(t)}return l}}export{c as Parser};
