(()=>{for(const d of window.__hd.deckMeshes)if(d.id.startsWith('pier-'))
  {d.mesh.scale.z=1-1/(d.id==='pier-0'?30:33);d.mesh.updateMatrixWorld(true);}
  window.__hd.scene.updateMatrixWorld(true);return 'shrunk';})()
