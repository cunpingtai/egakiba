// Short-to-long or long-to-short bars, read from top to bottom beside the arrow.
export function encyclopediaDirectionIcon(direction){
 const widths=direction==='asc'?[4,8,12]:[12,8,4];
 return `<svg viewBox="0 0 24 24" aria-hidden="true">${widths.map((width,index)=>`<rect x="2" y="${4+index*6}" width="${width}" height="3" rx=".5"/>`).join('')}<path d="M20 4v16m-3-3 3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
