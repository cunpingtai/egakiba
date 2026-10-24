// Match the visible 100 x 100 ground plane at y = -.45. Only aftermath
// creates this collider, so it cannot add CCD work to an active match.
export function createOutsideFloor(world,RAPIER){
 return world.createCollider(RAPIER.ColliderDesc.cuboid(50,.05,50)
  .setTranslation(0,-.5,0).setCollisionGroups(0x00010001)
  .setFriction(.55).setRestitution(.1));
}
