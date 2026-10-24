// Observe only real viewport exposure, never the virtual list's overscan rows.
// List exposure is committed on close; opening a detail acknowledges it at once.
export function createEncyclopediaNotices({store,root,isVisible,Observer=globalThis.IntersectionObserver}){
 const reviewed=new Set();let active=false,targets=new WeakMap();
 const observer=Observer?new Observer(entries=>{
  if(!active||!isVisible())return;
  for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=.5){const glyph=targets.get(entry.target);if(glyph)reviewed.add(glyph);}
 },{root,threshold:.5}):null;
 return {
  open(){reviewed.clear();active=true;},
  resetTargets(){observer?.disconnect();targets=new WeakMap();},
  observe(button,glyph){if(active&&store.isUnread?.(glyph)){targets.set(button,glyph);observer?.observe(button);}},
  detail(glyph){if(active&&store.isUnread?.(glyph)){store.reviewGlyphs?.([glyph]);reviewed.delete(glyph);}},
  close(){if(!active)return;active=false;observer?.disconnect();store.reviewGlyphs?.(reviewed);reviewed.clear();},
 };
}

// The HOME badge shares the same sparse unread state; never scan the catalog.
export function bindEncyclopediaEntryNotice({store,button}){
 const update=()=>button.toggleAttribute('data-unread',Boolean(store.data?.unread?.length));
 update();return store.subscribe?.(update)||(()=>{});
}
