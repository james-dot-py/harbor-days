import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, rng, rand, gmap, glowTex, mulberry32, curveMat, bmat } from './core.js';
import * as CH from './data/chicago.js';

// ------------------------------- sky ----------------------------------
export const skyGroup = new THREE.Group();
export const clouds = [];

export function buildSky(){
  scene.add(skyGroup);
  {
    const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms:{top:{value:new THREE.Color(0x30407e)},mid:{value:new THREE.Color(0x8f74ba)},hor:{value:new THREE.Color(0xffb98a)}},
      vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec3 vP;uniform vec3 top;uniform vec3 mid;uniform vec3 hor;
        void main(){float h=normalize(vP).y;vec3 c=mix(hor,mid,smoothstep(0.0,0.3,h));c=mix(c,top,smoothstep(0.24,0.72,h));gl_FragColor=vec4(c,1.0);}`});
    const sky=new THREE.Mesh(new THREE.SphereGeometry(420,24,16),skyMat);sky.renderOrder=-10;skyGroup.add(sky);

    const N=380,pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){const th=rand(0,Math.PI*2),ph=Math.acos(rand(0.12,0.995)),r=400;
      pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.cos(ph);pos[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const stars=new THREE.Points(sg,new THREE.PointsMaterial({size:2.2,color:0xfff6df,map:glowTex,transparent:true,opacity:0.85,depthWrite:false,fog:false}));
    skyGroup.add(stars);skyGroup.userData.stars=stars;

    const moon=new THREE.Mesh(new THREE.SphereGeometry(15,20,20),new THREE.MeshBasicMaterial({color:0xfff4d8,fog:false}));
    moon.position.set(150,130,-300);skyGroup.add(moon);
    const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(new Float32Array([150,130,-300]),3));
    skyGroup.add(new THREE.Points(mg,new THREE.PointsMaterial({size:80,map:glowTex,color:0xffedc0,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,fog:false})));
  }
  {
    const cm=new THREE.MeshToonMaterial({color:0xffd9c4,gradientMap:gmap,fog:false});
    for(let i=0;i<7;i++){
      const g=new THREE.Group(),n=3+(rng()*3|0);
      // merge this cloud's lobes into ONE mesh (all share cm, so it's exact).
      // EXACT same rand() call order/count as before — world layout is rng
      // order (hard constraint #1): per lobe draw radius then x,y,z, and bake
      // scale.y=0.5 + the lobe offset straight into the geometry.
      const lobes=[];
      for(let k=0;k<n;k++){
        const geo=new THREE.SphereGeometry(rand(5,9),12,10);
        const px=rand(-8,8),py=rand(-1,1.5),pz=rand(-4,4);
        geo.scale(1,0.5,1);geo.translate(px,py,pz);lobes.push(geo);
      }
      g.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(lobes,false),cm));
      g.position.set(rand(-200,200),rand(55,95),rand(-260,260));
      scene.add(g);clouds.push(g);
    }
  }

  // -------------------------- skyline (south) ---------------------------
  // Recognizable Chicago downtown, viewed looking SOUTH (+z) from the harbor.
  // Screen-left = +x (east / lakeside), screen-right = -x (west): Hancock sits
  // near/left, Willis tallest and back/right. Kept as an uncurved
  // MeshBasicMaterial backdrop (fog:false) like the original slabs so it stays
  // crisp on the horizon — the world curve (CURV) would drop geometry ~32u at
  // this range and sink it under the waterline. Randomness is a LOCAL
  // mulberry32; the shared rng() sequence (stars/clouds above) is untouched, so
  // the foreground world layout stays deterministic.
  {
    const grp=new THREE.Group();
    const S=mulberry32(0x5c1000),rnd=(a,b)=>a+(b-a)*S();   // local, deterministic
    const BASE=-6;                                          // bottoms tuck behind horizon
    const solid=c=>new THREE.MeshBasicMaterial({color:c,fog:false});
    const tex=cv=>{const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;};
    const box=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      m.position.set(x,y,z);grp.add(m);return m;};
    const sit=(w,h,d,x,bottom,z,mat)=>box(w,h,d,x,bottom+h/2,z,mat); // sit box on `bottom`

    // ---- canvas skins -------------------------------------------------
    function hancockSkin(){                 // dark tower, X-bracing, warm crown band
      const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
      g.fillStyle='#333a49';g.fillRect(0,0,64,256);
      g.strokeStyle='rgba(255,255,255,0.06)';g.lineWidth=1;                 // faint mullions
      for(let x=6;x<64;x+=10){g.beginPath();g.moveTo(x,0);g.lineTo(x,256);g.stroke();}
      g.strokeStyle='rgba(158,176,205,0.55)';g.lineWidth=2;                 // signature X-bracing
      const segs=6,topPad=34,segH=(256-topPad)/segs;
      for(let s=0;s<segs;s++){const y0=topPad+s*segH,y1=y0+segH;
        g.beginPath();g.moveTo(2,y0);g.lineTo(62,y1);g.stroke();
        g.beginPath();g.moveTo(62,y0);g.lineTo(2,y1);g.stroke();}
      g.fillStyle='#ffe6b8';g.fillRect(0,15,64,9);                          // warm restaurant crown
      g.fillStyle='rgba(255,230,184,0.5)';g.fillRect(0,26,64,3);
      return tex(c);
    }
    function ribSkin(base,rib){             // vertical fluting (Aon)
      const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
      g.fillStyle=base;g.fillRect(0,0,64,128);g.fillStyle=rib;
      for(let x=0;x<64;x+=6)g.fillRect(x,0,3,128);
      return tex(c);
    }

    // ---- generic fill: two instanced bands (front cool, back hazy) ----
    const fillGeo=new THREE.BoxGeometry(1,1,1),M=new THREE.Matrix4();
    const band=(n,za,zb,ha,hb,color)=>{
      const im=new THREE.InstancedMesh(fillGeo,solid(color),n);
      for(let i=0;i<n;i++){const w=rnd(8,20),h=rnd(ha,hb),d=rnd(8,14);
        M.makeScale(w,h,d);M.setPosition(rnd(-120,135),BASE+h/2,rnd(za,zb));im.setMatrixAt(i,M);}
      im.instanceMatrix.needsUpdate=true;grp.add(im);
    };
    band(16,280,304,16,48,0xb9c6d9);        // back  — light, hazy toward sky
    band(20,229,244,13,40,0x8a9fbe);        // front — mid-rise, cooler

    // ---- hero towers --------------------------------------------------
    // John Hancock — near/left dark tapered obelisk, X-bracing + warm crown.
    { const h=94,g=new THREE.CylinderGeometry(4.6,10.4,h,4);
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:hancockSkin(),fog:false}));
      m.rotation.y=Math.PI/4;m.position.set(50,BASE+h/2,237);grp.add(m); }

    // Willis/Sears — tallest, matte-dark bundled tubes, twin antennas (back/right).
    { const bm=solid(0x323848);
      sit(19,110,19,-42,BASE,276,bm);       // tallest central tube
      sit(12,84 ,19,-53,BASE,278,bm);       // stepped tube (west/right, shorter)
      sit(19,66 ,12,-33,BASE,270,bm); }     // stepped tube (toward viewer, shortest)

    // Aon Center — clean off-white ribbed prism (center).
    sit(15,96,15,4,BASE,258,new THREE.MeshBasicMaterial({map:ribSkin('#e8ebf0','#c3cad6'),fog:false}));

    // Trump Tower — blue-teal glass, three setback tiers, tall spire.
    { const gm=solid(0x66aecb);
      sit(21,52,21,29,BASE   ,247,gm);      // base tier
      sit(15,28,15,29,BASE+52,247,gm);      // mid tier
      sit(11,22,11,29,BASE+80,247,gm); }    // top tier (spire added below)

    // 900 N Michigan — boxy tower with a broad lit crown (far left, by Hancock).
    sit(19,60,14,64,BASE,250,solid(0x7e8da6));
    sit(21,4 ,16,64,BASE+60,250,solid(0xdfe3c0));

    // St Regis / Vista — slender blue-green tapered tower (Streeterville).
    { const h=74,g=new THREE.CylinderGeometry(3.6,5.2,h,4);
      const m=new THREE.Mesh(g,solid(0x5a9098));m.rotation.y=Math.PI/4;
      m.position.set(40,BASE+h/2,246);grp.add(m); }

    // Park Tower — box with a pitched crown (Mag Mile, near Hancock).
    sit(13,58,13,57,BASE,245,solid(0x8b95a9));
    { const g=new THREE.ConeGeometry(9.2,12,4),m=new THREE.Mesh(g,solid(0x9aa4b6));
      m.rotation.y=Math.PI/4;m.position.set(57,BASE+58+6,245);grp.add(m); }

    // ---- antennas + Trump spire (one instanced mesh) ------------------
    { const ag=new THREE.CylinderGeometry(0.5,0.5,1,6);
      const am=new THREE.InstancedMesh(ag,solid(0xf1f4f8),5);
      const A=[[47,237,88,26],[53,237,88,26],       // Hancock twin
               [-44,276,104,32],[-40,276,104,32],    // Willis twin (tallest tips)
               [29,247,96,36]];                      // Trump spire
      A.forEach((p,i)=>{const[x,z,base,hh]=p;M.makeScale(1,hh,1);M.setPosition(x,base+hh/2,z);am.setMatrixAt(i,M);});
      am.instanceMatrix.needsUpdate=true;grp.add(am); }

    // Uniform 2.2x: pushes the band from z≈237 to z≈520 (beyond WORLD_CLAMP,
    // unreachable) while scaling heights to match — same apparent size from the
    // park, but the south lawn no longer walks into billboard walls.
    grp.scale.setScalar(2.2);
    scene.add(grp);

    // 112 LINCOLN PARK skyline z-gate: contiguous park now fills z 410..1020, INTO
    // and PAST this billboard (world z 504..669) — from inside the park it reads to
    // the NORTH over the zoo + interpenetrates the halls, and the far-plane(900)/
    // fog(210) physics kill it there anyway. Fade it out as the player crosses the
    // Diversey corner (z fadeZ0..fadeZ1) and hide it south. GATED: while the player
    // is NORTH of the corner the materials stay OPAQUE (transparent=false) so the
    // signature Belmont read (baseline.png) is BYTE-IDENTICAL — no rng, frozen
    // mulberry32(0x5c1000) geometry + instance counts untouched, same draw count.
    // 120 AMENDMENT (issue 034 — "the buildings that are supposed to be in the
    // distance just fade away"): the 112 gate was a straight opacity ramp, so
    // walking south the whole downtown dissolved into SEE-THROUGH GLASS towers
    // in plain view over ~30 s and then blinked out. It now RECEDES first and
    // HAZES as it goes:
    //   pz <= holdZ  IDENTITY — position 0, opaque, original colors. Untouched
    //                while the player never leaves the north (the `gated` latch),
    //                so the Belmont read / baseline.png stay BIT-IDENTICAL.
    //   pz >  holdZ  grp.position.z = (pz-holdZ)*recede — the BACKDROP translates
    //                south at 1.8x the player's southward progress, so downtown
    //                pulls gently away instead of dissolving. Only position.z
    //                ever changes: no scale, no rotation.
    //   fadeZ0..1    opacity ramps to 0 AND each material's color lerps toward
    //                the horizon haze (= the scene fog color). A pure opacity
    //                fade reads as broken glass; hazing out reads as atmospheric
    //                perspective. Hidden past hiddenSouthOf.
    // Originals are captured ONCE here into a parallel array — no cloned
    // materials, no extra draw calls, no rng.
    { const G=CH.LP_SKYLINE_GATE, sMats=[], sCol=[], HAZE=new THREE.Color(G.haze);
      grp.traverse(o=>{ if(o.material){ const a=Array.isArray(o.material)?o.material:[o.material];
        for(const m of a) if(sMats.indexOf(m)<0){ sMats.push(m); sCol.push(m.color.clone()); } } });
      let gated=false;
      skyGroup.userData.skylineGate=(pz)=>{
        if(pz<=G.holdZ){                                    // north of the corner: identity (the frozen read)
          if(gated){ for(let i=0;i<sMats.length;i++){ const m=sMats[i]; m.transparent=false; m.opacity=1; m.color.copy(sCol[i]); m.needsUpdate=true; }
            grp.position.z=0; grp.visible=true; gated=false; }
          return;
        }
        gated=true;
        grp.position.z=(pz-G.holdZ)*G.recede;                       // pull downtown away, don't dissolve it
        const f=1-Math.min(1,Math.max(0,(pz-G.fadeZ0)/(G.fadeZ1-G.fadeZ0)));   // 1 until fadeZ0 -> 0 by fadeZ1
        grp.visible=f>0.002&&pz<=G.hiddenSouthOf;
        if(grp.visible) for(let i=0;i<sMats.length;i++){ const m=sMats[i];
          m.transparent=true; m.opacity=f; m.color.copy(sCol[i]).lerp(HAZE,0.85*(1-f)); }
      };
    }
  }

  buildLakeviewBand();
}

// -------------------------- Lakeview band (west) ----------------------
// A low-rise vintage-Chicago backdrop wall — 1920s brick flats, greystones
// and small pre-war apartment blocks — marching the full map length behind
// the Brown Line 'L' (ambient.js: TRACK_X=-8, DECK_TOP=7.6). Front line at
// x=-16 (8 m west of the L, well clear of z-fighting the track/berm),
// bodies extending WEST. Simple rectangular massing with a limestone
// cornice lip and sparse warm dusk windows on the park-facing (east) side.
//
// UNLIKE the skyline block above (an uncurved far-horizon backdrop), this
// band uses the world-curve materials (curveMat/toon/bmat) — it lives inside
// the play space right behind the CURVED L track, so it must sink with the
// same curve or it would appear to float/tower above the L as the L bends
// away with distance. Randomness is a LOCAL xorshift (coast.js tip pattern);
// the shared rng()/rand() sequence is never touched, so the deterministic
// world layout (towels/flowers/trees) stays put (hard constraint #1).
// 3 draw calls total: bodies + cornice caps + lit windows.
function buildLakeviewBand(){
  const B=CH.LAKEVIEW_BAND;
  const front=B.front;

  const bodies=[], caps=[], wins=[];                       // collected records -> instanced meshes
  const white=new THREE.Color(0xffffff);
  const WIN_CAP=600, floorH=3.2;

  // march z: each block = a body (frontage w along z, depth d west, height h),
  // then a street gap before the next. Run as a helper so the ORIGINAL span
  // (B.zr, original seed) tiles FIRST — byte-identical to before — and the
  // MONTROSE north extension (B.zrN, its OWN seed) tiles SECOND into the SAME
  // arrays: the existing backdrop never re-tiles, and the 3 InstancedMeshes just
  // grow (zero new draw calls). WIN_CAP is shared, so the south band claims its
  // windows first exactly as before; the north extension adds windows only if room.
  const march=(z0,z1,seed,fx=front)=>{                     // fx: per-span front line (112: the south band sits far west at B.frontS)
    let hs=seed>>>0;
    const jr=()=>{hs^=hs<<13;hs>>>=0;hs^=hs>>>17;hs^=hs<<5;hs>>>=0;return hs/4294967296;};
    const rr=(a,b)=>a+(b-a)*jr();
    let z=z0;
    for(;;){
      const w=rr(B.w[0],B.w[1]);
      if(z+w>z1) break;                                    // last block fully inside the range
      const tall=jr()<B.tallProb;
      const h=tall?rr(B.tallH[0],B.tallH[1]):rr(B.h[0],B.h[1]);
      const d=rr(B.depth[0],B.depth[1]);
      const col=new THREE.Color(B.colors[(jr()*B.colors.length)|0]);
      const zc=z+w/2, xc=fx-d/2;                           // east face at x=fx, extends west
      bodies.push({w,h,d,x:xc,z:zc,c:col});
      caps.push({w,h,d,x:xc,z:zc,c:col.clone().lerp(white,0.34)});   // limestone cornice lip

      // sparse warm dusk windows on the EAST face (facing the park)
      if(wins.length<WIN_CAP){
        const floors=Math.max(1,Math.round(h/floorH));
        const cols=Math.max(1,Math.min(4,Math.round(w/5)));
        const fh=h/floors;
        for(let f=0;f<floors&&wins.length<WIN_CAP;f++){
          for(let c=0;c<cols&&wins.length<WIN_CAP;c++){
            if(jr()>=B.winLitProb) continue;
            const zz=(zc-w/2)+((c+1)/(cols+1))*w+(jr()*2-1)*0.18;
            const yy=(f+0.5)*fh+(jr()*2-1)*0.12;
            wins.push({x:fx+0.08,y:yy,z:zz});
          }
        }
      }
      z+=w+rr(B.spacing[0],B.spacing[1]);
    }
  };
  // 120 (issue 034): the SOUTH CITY EDGE. The three marches above walk NORTH-
  // SOUTH at a fixed x front; this one walks WEST-EAST at a fixed z front with
  // the bodies extending SOUTH (+z) from it, so the horizon ahead of a player
  // walking south out of the park is a low-rise city edge instead of empty sky.
  // Same block vocabulary + the same local-xorshift pattern (its OWN seed — the
  // shared world rng is never touched), pushed into the SAME bodies/caps arrays
  // -> the three InstancedMeshes just grow: +0 draw calls.
  // NOTE the field swap: the instancing below reads S.set(b.d,b.h,b.w), i.e.
  // x-scale=b.d and z-scale=b.w, which is right for a z-marching row (frontage
  // along z). For an X-marching row the frontage w runs along X and the depth d
  // along Z, so the record carries {w:d, d:w}.
  // NO windows: the row faces NORTH and the window quads are built facing +x.
  const marchX=(x0,x1,seed,frontZ)=>{
    let hs=seed>>>0;
    const jr=()=>{hs^=hs<<13;hs>>>=0;hs^=hs>>>17;hs^=hs<<5;hs>>>=0;return hs/4294967296;};
    const rr=(a,b)=>a+(b-a)*jr();
    let x=x0;
    for(;;){
      const w=rr(B.w[0],B.w[1]);                            // frontage along X
      if(x+w>x1) break;                                     // last block fully inside the range
      const tall=jr()<B.tallProb;
      const h=tall?rr(B.tallH[0],B.tallH[1]):rr(B.h[0],B.h[1]);
      const d=rr(B.depth[0],B.depth[1]);                    // depth extends SOUTH
      const col=new THREE.Color(B.colors[(jr()*B.colors.length)|0]);
      const xc=x+w/2, zc=frontZ+d/2;                        // north face at z=frontZ, extends south
      bodies.push({w:d,h,d:w,x:xc,z:zc,c:col});
      caps.push({w:d,h,d:w,x:xc,z:zc,c:col.clone().lerp(white,0.34)});   // limestone cornice lip
      x+=w+rr(B.spacing[0],B.spacing[1]);
    }
  };

  march(B.zr[0],B.zr[1],0x2f6b1c07);                       // original span, original seed -> byte-identical
  if(B.zrN) march(B.zrN[0],B.zrN[1],0x6d21f8a3);           // MONTROSE north extension, own seed
  if(B.zrS) march(B.zrS[0],B.zrS[1],0x3ac91d55,B.frontS);  // 112 LINCOLN PARK south extension: far-west front (Clark/Lincoln wall), own seed
  if(B.southRow){ const R=B.southRow; marchX(R.x0,R.x1,R.seed,R.z); }   // 120 SOUTH CITY EDGE — LAST, so every existing block stays byte-identical

  const M=new THREE.Matrix4(),V=new THREE.Vector3(),Q=new THREE.Quaternion(),S=new THREE.Vector3();

  // 1) building bodies — one instanced curved-toon box, per-instance brick color
  const bodyMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
    curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),bodies.length);
  bodies.forEach((b,i)=>{M.compose(V.set(b.x,b.h/2,b.z),Q.identity(),S.set(b.d,b.h,b.w));
    bodyMesh.setMatrixAt(i,M);bodyMesh.setColorAt(i,b.c);});
  bodyMesh.instanceMatrix.needsUpdate=true;bodyMesh.instanceColor.needsUpdate=true;scene.add(bodyMesh);

  // 2) cornice caps — a slightly wider, thin box at each roofline (parapet lip)
  const capMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
    curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),caps.length);
  caps.forEach((b,i)=>{M.compose(V.set(b.x,b.h-0.1,b.z),Q.identity(),S.set(b.d+0.9,0.6,b.w+0.9));
    capMesh.setMatrixAt(i,M);capMesh.setColorAt(i,b.c);});
  capMesh.instanceMatrix.needsUpdate=true;capMesh.instanceColor.needsUpdate=true;scene.add(capMesh);

  // 3) warm lit windows — one instanced quad, unlit basic (glowing) on east faces
  if(wins.length){
    Q.setFromEuler(new THREE.Euler(0,Math.PI/2,0));        // face +x (east / the park)
    const winMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),
      bmat(B.winColor,{side:THREE.DoubleSide,fog:false}),wins.length);
    wins.forEach((wq,i)=>{M.compose(V.set(wq.x,wq.y,wq.z),Q,S.set(1.1,1.3,1));winMesh.setMatrixAt(i,M);});
    winMesh.instanceMatrix.needsUpdate=true;scene.add(winMesh);
  }
}
