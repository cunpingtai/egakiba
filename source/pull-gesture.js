// Shared launch/cancel thresholds for ordinary matches and event battles.
export const PULL_CANCEL_RADIUS=20;
export function makePullState(event,point){return {start:point,lastPoint:point,startClient:{x:event.clientX,y:event.clientY},moved:false,hasPulled:false};}
export function updatePullGesture(state,event,radius=PULL_CANCEL_RADIUS){const distance=Math.hypot(event.clientX-state.startClient.x,event.clientY-state.startClient.y);state.moved=Number.isFinite(distance)&&distance>radius;state.hasPulled ||= state.moved;return state.moved;}
