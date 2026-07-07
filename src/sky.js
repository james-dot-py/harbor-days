import * as THREE from 'three';
import { scene, rng, rand, gmap, glowTex, mulberry32 } from './core.js';
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
      for(let k=0;k<n;k++){
        const s=new THREE.Mesh(new THREE.SphereGeometry(rand(5,9),12,10),cm);
        s.scale.y=0.5;s.position.set(rand(-8,8),rand(-1,1.5),rand(-4,4));g.add(s);
      }
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
  }
}
