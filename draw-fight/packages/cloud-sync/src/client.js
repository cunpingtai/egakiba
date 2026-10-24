/** Same-origin, cookie-based API. Never store access/refresh tokens in JS localStorage. */
export class CloudApiError extends Error {constructor(message,status=0,extra={}){super(message);this.name='CloudApiError';this.status=status;this.extra=extra;}}
export class CloudApi{
  constructor(base='/api/v1'){this.base=base.replace(/\/$/,'');}
  async request(path,{method='GET',body,headers={}}={}){
    const init={method,credentials:'same-origin',headers};if(body!==undefined){init.body=body;if(typeof body==='string')init.headers={...headers,'Content-Type':'application/json'};}
    let res;try{res=await fetch(`${this.base}${path}`,init);}catch{throw new CloudApiError('オフラインまたは通信エラー');}
    if(!res.ok){let info={};try{info=await res.json();}catch{}throw new CloudApiError(info.error||`HTTP ${res.status}`,res.status,info);}
    if(res.headers.get('Content-Type')?.includes('application/json'))return res.json();return res;
  }
  me(){return this.request('/auth/me');}
  requestCode(email){return this.request('/auth/request-code',{method:'POST',body:JSON.stringify({email})});}
  verifyCode(email,code){return this.request('/auth/verify-code',{method:'POST',body:JSON.stringify({email,code})});}
  logout(){return this.request('/auth/logout',{method:'POST',body:'{}'});}
  snapshot(){return this.request('/sync/snapshot');}
  async uploadFighter(fighter,baseRevision=0){const form=new FormData();form.append('png',fighter.png,'fighter.png');form.append('name',fighter.name||'マイキャラ');form.append('baseRevision',String(baseRevision));form.append('stats',JSON.stringify(fighter.stats||{}));return this.request(`/sync/fighters/${encodeURIComponent(fighter.id)}`,{method:'PUT',body:form});}
  async downloadFighter(id){const res=await this.request(`/sync/fighters/${encodeURIComponent(id)}/source`);return res.blob();}
  pushProgress(progress){return this.request('/sync/progress',{method:'PUT',body:JSON.stringify(progress)});}
  async downloadDraft(){const response=await this.request('/sync/draft');return {png:await response.blob(),revision:Number(response.headers.get('X-Cloud-Revision'))||0};}
  uploadDraft(png,baseRevision){return this.request('/sync/draft',{method:'PUT',body:png,headers:{'X-Base-Revision':String(baseRevision),'Content-Type':'image/png'}});}
}
