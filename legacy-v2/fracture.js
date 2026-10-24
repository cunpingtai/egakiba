// Keep connected strokes intact. Triangles sharing a vertex belong to one
// component; holes and genuinely separate strokes remain separate geometries.
export function fracturePieces(triangles){
 const parent=triangles.map((_,i)=>i),vertices=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 triangles.forEach((triangle,i)=>{
  for(const p of triangle){
   const key=`${p.x.toFixed(7)},${p.y.toFixed(7)}`;
   if(vertices.has(key))parent[root(i)]=root(vertices.get(key));else vertices.set(key,i);
  }
 });
 const groups=new Map();
 triangles.forEach((triangle,i)=>{const id=root(i);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(triangle);});
 return [...groups.values()].map(group=>{
  let area=0,x=0,y=0;
  for(const [a,b,c] of group){const w=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));area+=w;x+=w*(a.x+b.x+c.x)/3;y+=w*(a.y+b.y+c.y)/3;}
  return {triangles:group,center:{x:x/area,y:y/area}};
 });
}
