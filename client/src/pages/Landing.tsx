import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { ExchangeLogo } from "@/components/ExchangeLogos";

function InteractiveCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const visibleRef = useRef(true);
  const rotRef = useRef({ rx: -0.55, ry: 0.65 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.min(480, container.clientWidth);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    const cx = size / 2;
    const cy = size / 2 - 10;
    const cell = 55;
    const gap = 5;
    const step = cell + gap;

    type V3 = { x: number; y: number; z: number };
    type MoveAxis = "x" | "y" | "z";

    const TEX_MATTE = 0;
    const TEX_GLOSSY = 1;
    const TEX_MESH = 2;
    const TEX_DOTS = 3;
    const TEX_BRUSHED = 4;

    interface Cubie {
      pos: [number, number, number];
      textures: number[];
    }

    const cubies: Cubie[] = [];
    let idx = 0;
    for (let xi = 0; xi < 3; xi++) {
      for (let yi = 0; yi < 3; yi++) {
        for (let zi = 0; zi < 3; zi++) {
          const texArr: number[] = [];
          for (let f = 0; f < 6; f++) {
            texArr.push((idx + f * 3) % 5);
          }
          cubies.push({ pos: [xi - 1, yi - 1, zi - 1], textures: texArr });
          idx++;
        }
      }
    }

    interface ActiveMove {
      axis: MoveAxis; layer: number; angle: number; target: number; speed: number;
    }
    let currentMove: ActiveMove | null = null;
    let moveQueue: ActiveMove[] = [];
    let moveTimer = 0;
    const MOVE_INTERVAL = 2200;

    function queueRandomMove() {
      const axes: MoveAxis[] = ["x", "y", "z"];
      const axis = axes[Math.floor(Math.random() * 3)];
      const layer = Math.floor(Math.random() * 3) - 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      moveQueue.push({ axis, layer, angle: 0, target: dir * Math.PI / 2, speed: 0.035 });
    }

    function rotatePoint(p: [number, number, number], axis: MoveAxis, angle: number): [number, number, number] {
      const c = Math.cos(angle), s = Math.sin(angle);
      const [x, y, z] = p;
      if (axis === "x") return [x, y * c - z * s, y * s + z * c];
      if (axis === "y") return [x * c + z * s, y, -x * s + z * c];
      return [x * c - y * s, x * s + y * c, z];
    }

    function snapPos(p: [number, number, number]): [number, number, number] {
      return [Math.round(p[0]), Math.round(p[1]), Math.round(p[2])];
    }

    function cycleTex(textures: number[], axis: MoveAxis, dir: number) {
      const t = [...textures];
      if (axis === "x") {
        if (dir > 0) { const tmp = t[0]; t[0] = t[5]; t[5] = t[1]; t[1] = t[4]; t[4] = tmp; }
        else { const tmp = t[0]; t[0] = t[4]; t[4] = t[1]; t[1] = t[5]; t[5] = tmp; }
      } else if (axis === "y") {
        if (dir > 0) { const tmp = t[0]; t[0] = t[2]; t[2] = t[1]; t[1] = t[3]; t[3] = tmp; }
        else { const tmp = t[0]; t[0] = t[3]; t[3] = t[1]; t[1] = t[2]; t[2] = tmp; }
      } else {
        if (dir > 0) { const tmp = t[4]; t[4] = t[2]; t[2] = t[5]; t[5] = t[3]; t[3] = tmp; }
        else { const tmp = t[4]; t[4] = t[3]; t[3] = t[5]; t[5] = t[2]; t[2] = tmp; }
      }
      return t;
    }

    function applyMove(m: ActiveMove) {
      const dir = m.target > 0 ? 1 : -1;
      const axIdx = m.axis === "x" ? 0 : m.axis === "y" ? 1 : 2;
      for (const cubie of cubies) {
        if (Math.round(cubie.pos[axIdx]) === m.layer) {
          cubie.pos = snapPos(rotatePoint(cubie.pos, m.axis, m.target));
          cubie.textures = cycleTex(cubie.textures, m.axis, dir);
        }
      }
    }

    function project(x: number, y: number, z: number, rx: number, ry: number) {
      let y1 = y * Math.cos(rx) - z * Math.sin(rx);
      let z1 = y * Math.sin(rx) + z * Math.cos(rx);
      let x1 = x * Math.cos(ry) + z1 * Math.sin(ry);
      let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      const scale = 700 / (700 + z2);
      return { x: x1 * scale + cx, y: y1 * scale + cy, z: z2, scale };
    }

    function drawRoundedQuad(c: CanvasRenderingContext2D, p: {x:number;y:number}[], radius: number) {
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const curr = p[i], next = p[(i+1)%4], prev = p[(i+3)%4];
        const dx1 = curr.x-prev.x, dy1 = curr.y-prev.y;
        const dx2 = next.x-curr.x, dy2 = next.y-curr.y;
        const l1 = Math.sqrt(dx1*dx1+dy1*dy1)||1, l2 = Math.sqrt(dx2*dx2+dy2*dy2)||1;
        const r = Math.min(radius, l1*0.3, l2*0.3);
        const fx = curr.x-(dx1/l1)*r, fy = curr.y-(dy1/l1)*r;
        const tx = curr.x+(dx2/l2)*r, ty = curr.y+(dy2/l2)*r;
        if (i===0) c.moveTo(fx,fy); else c.lineTo(fx,fy);
        c.quadraticCurveTo(curr.x,curr.y,tx,ty);
      }
      c.closePath();
    }

    function getNormal(corners: V3[]) {
      const ax=corners[1].x-corners[0].x, ay=corners[1].y-corners[0].y, az=corners[1].z-corners[0].z;
      const bx=corners[2].x-corners[0].x, by=corners[2].y-corners[0].y, bz=corners[2].z-corners[0].z;
      const nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
      const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
      return {x:nx/len,y:ny/len,z:nz/len};
    }

    function computeLight(corners: V3[], rx: number, ry: number) {
      const n = getNormal(corners);
      const cRx=Math.cos(rx),sRx=Math.sin(rx),cRy=Math.cos(ry),sRy=Math.sin(ry);
      const rny=n.y*cRx-n.z*sRx, rnz=n.y*sRx+n.z*cRx;
      const rnx=n.x*cRy+rnz*sRy, rnzF=-n.x*sRy+rnz*cRy;
      const lx=0.35,ly=-0.55,lz=0.75;
      const ll=Math.sqrt(lx*lx+ly*ly+lz*lz);
      const dot=(rnx*lx+rny*ly+rnzF*lz)/ll;
      const diffuse=Math.max(0,dot);
      const rDot=2*dot;
      const refZ=rDot*rnzF-lz/ll;
      const spec=Math.pow(Math.max(0,refZ),60);
      const spec2=Math.pow(Math.max(0,refZ),18);
      return {diffuse,spec,spec2};
    }

    function buildCorners(bx:number,by:number,bz:number,h:number) {
      return [
        {x:bx-h,y:by-h,z:bz-h},{x:bx+h,y:by-h,z:bz-h},
        {x:bx+h,y:by+h,z:bz-h},{x:bx-h,y:by+h,z:bz-h},
        {x:bx-h,y:by-h,z:bz+h},{x:bx+h,y:by-h,z:bz+h},
        {x:bx+h,y:by+h,z:bz+h},{x:bx-h,y:by+h,z:bz+h},
      ];
    }

    const FV=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]];

    function drawTexture(
      c: CanvasRenderingContext2D,
      proj: {x:number;y:number;scale:number}[],
      tex: number,
      diffuse: number,
      spec: number,
      spec2: number,
      avgScale: number
    ) {
      const centX=(proj[0].x+proj[1].x+proj[2].x+proj[3].x)/4;
      const centY=(proj[0].y+proj[1].y+proj[2].y+proj[3].y)/4;
      const inF = 0.12;
      const sp = proj.map(p => ({x:p.x+(centX-p.x)*inF,y:p.y+(centY-p.y)*inF}));
      const minX=Math.min(sp[0].x,sp[1].x,sp[2].x,sp[3].x);
      const maxX=Math.max(sp[0].x,sp[1].x,sp[2].x,sp[3].x);
      const minY=Math.min(sp[0].y,sp[1].y,sp[2].y,sp[3].y);
      const maxY=Math.max(sp[0].y,sp[1].y,sp[2].y,sp[3].y);
      const fW=maxX-minX, fH=maxY-minY;

      if (tex === TEX_MATTE) {
        const base = 18 + diffuse * 28 + spec2 * 15;
        drawRoundedQuad(c, sp, 4*avgScale);
        const g = c.createLinearGradient(minX,minY,maxX,maxY);
        g.addColorStop(0, `rgb(${Math.round(base+5)},${Math.round(base+5)},${Math.round(base+7)})`);
        g.addColorStop(1, `rgb(${Math.round(base-3)},${Math.round(base-3)},${Math.round(base-1)})`);
        c.fillStyle=g; c.fill();
      } else if (tex === TEX_GLOSSY) {
        const base = 30 + diffuse * 50 + spec * 80;
        drawRoundedQuad(c, sp, 4*avgScale);
        const g = c.createLinearGradient(minX,minY-fH*0.2,maxX,maxY);
        g.addColorStop(0, `rgb(${Math.round(Math.min(255,base+25))},${Math.round(Math.min(255,base+25))},${Math.round(Math.min(255,base+30))})`);
        g.addColorStop(0.4, `rgb(${Math.round(base)},${Math.round(base)},${Math.round(base+3)})`);
        g.addColorStop(1, `rgb(${Math.round(base*0.5)},${Math.round(base*0.5)},${Math.round(base*0.55)})`);
        c.fillStyle=g; c.fill();
        if (spec > 0.08) {
          const sg = c.createRadialGradient(centX-fW*0.15,centY-fH*0.2,0,centX,centY,fW*0.6);
          sg.addColorStop(0, `rgba(255,255,255,${spec*0.35})`);
          sg.addColorStop(1, `rgba(255,255,255,0)`);
          drawRoundedQuad(c, sp, 4*avgScale);
          c.fillStyle=sg; c.fill();
        }
      } else if (tex === TEX_MESH) {
        const base = 15 + diffuse * 20;
        drawRoundedQuad(c, sp, 4*avgScale);
        c.fillStyle=`rgb(${Math.round(base)},${Math.round(base)},${Math.round(base+2)})`;
        c.fill();
        c.save(); drawRoundedQuad(c, sp, 4*avgScale); c.clip();
        const gridStep = Math.max(3, 4 * avgScale);
        const bright = 25 + diffuse * 30 + spec2 * 20;
        c.strokeStyle = `rgba(${Math.round(bright)},${Math.round(bright)},${Math.round(bright+5)},0.6)`;
        c.lineWidth = 0.4 * avgScale;
        for (let gx = minX; gx <= maxX; gx += gridStep) {
          c.beginPath(); c.moveTo(gx, minY); c.lineTo(gx, maxY); c.stroke();
        }
        for (let gy = minY; gy <= maxY; gy += gridStep) {
          c.beginPath(); c.moveTo(minX, gy); c.lineTo(maxX, gy); c.stroke();
        }
        c.restore();
      } else if (tex === TEX_DOTS) {
        const base = 20 + diffuse * 25;
        drawRoundedQuad(c, sp, 4*avgScale);
        c.fillStyle=`rgb(${Math.round(base)},${Math.round(base)},${Math.round(base+2)})`;
        c.fill();
        c.save(); drawRoundedQuad(c, sp, 4*avgScale); c.clip();
        const dotStep = Math.max(4, 5 * avgScale);
        const dotR = Math.max(0.4, 0.7 * avgScale);
        const dotBright = 35 + diffuse * 35 + spec2 * 30;
        c.fillStyle = `rgba(${Math.round(dotBright)},${Math.round(dotBright)},${Math.round(dotBright+5)},0.5)`;
        for (let dx = minX + dotStep/2; dx < maxX; dx += dotStep) {
          for (let dy = minY + dotStep/2; dy < maxY; dy += dotStep) {
            c.beginPath(); c.arc(dx, dy, dotR, 0, Math.PI*2); c.fill();
          }
        }
        c.restore();
      } else {
        const base = 22 + diffuse * 30;
        drawRoundedQuad(c, sp, 4*avgScale);
        const g = c.createLinearGradient(minX,centY-1,maxX,centY+1);
        g.addColorStop(0, `rgb(${Math.round(base+8)},${Math.round(base+8)},${Math.round(base+10)})`);
        g.addColorStop(0.3, `rgb(${Math.round(base)},${Math.round(base)},${Math.round(base+2)})`);
        g.addColorStop(0.6, `rgb(${Math.round(base+5)},${Math.round(base+5)},${Math.round(base+7)})`);
        g.addColorStop(1, `rgb(${Math.round(base-3)},${Math.round(base-3)},${Math.round(base)})`);
        c.fillStyle=g; c.fill();
        c.save(); drawRoundedQuad(c, sp, 4*avgScale); c.clip();
        c.strokeStyle = `rgba(${Math.round(base+15)},${Math.round(base+15)},${Math.round(base+18)},0.15)`;
        c.lineWidth = 0.3 * avgScale;
        for (let ly = minY; ly <= maxY; ly += Math.max(1.5, 2 * avgScale)) {
          c.beginPath(); c.moveTo(minX, ly); c.lineTo(maxX, ly); c.stroke();
        }
        c.restore();
      }
    }

    function render() {
      if (!visibleRef.current) { animRef.current=requestAnimationFrame(render); return; }

      const now=Date.now(), t=now*0.00025;

      if (!currentMove && moveQueue.length===0) {
        moveTimer+=16;
        if (moveTimer>=MOVE_INTERVAL) { moveTimer=0; queueRandomMove(); }
      }
      if (!currentMove && moveQueue.length>0) currentMove=moveQueue.shift()!;
      if (currentMove) {
        const dir=Math.sign(currentMove.target);
        currentMove.angle+=dir*currentMove.speed;
        if (Math.abs(currentMove.angle)>=Math.abs(currentMove.target)) { applyMove(currentMove); currentMove=null; }
      }

      if (!dragRef.current.active) {
        rotRef.current.rx+=Math.sin(t*0.8)*0.0006;
        rotRef.current.ry+=0.0015;
      }

      const rx=rotRef.current.rx, ry=rotRef.current.ry;
      ctx!.clearRect(0,0,size,size);

      const allFaces: {z:number;draw:()=>void}[] = [];
      const half=cell/2;

      for (const cubie of cubies) {
        let bx=cubie.pos[0]*step, by=cubie.pos[1]*step, bz=cubie.pos[2]*step;
        let moveAngle=0; let moveAxis:MoveAxis|null=null;
        if (currentMove) {
          const axIdx=currentMove.axis==="x"?0:currentMove.axis==="y"?1:2;
          if (Math.round(cubie.pos[axIdx])===currentMove.layer) { moveAngle=currentMove.angle; moveAxis=currentMove.axis; }
        }

        let corners: V3[];
        if (moveAxis && moveAngle!==0) {
          const rp=rotatePoint([bx,by,bz],moveAxis,moveAngle);
          corners=buildCorners(0,0,0,half).map(c=>{
            const rr=rotatePoint([c.x,c.y,c.z],moveAxis!,moveAngle);
            return {x:rr[0]+rp[0],y:rr[1]+rp[1],z:rr[2]+rp[2]};
          });
        } else {
          corners=buildCorners(bx,by,bz,half);
        }

        for (let fi=0; fi<6; fi++) {
          const fCorners=FV[fi].map(i=>corners[i]);
          const proj=fCorners.map(c=>project(c.x,c.y,c.z,rx,ry));
          const avgZ=proj.reduce((s,p)=>s+p.z,0)/4;
          const e1x=proj[1].x-proj[0].x, e1y=proj[1].y-proj[0].y;
          const e2x=proj[2].x-proj[0].x, e2y=proj[2].y-proj[0].y;
          if (e1x*e2y-e1y*e2x<=0) continue;

          const texIdx = cubie.textures[fi];

          allFaces.push({z:avgZ, draw:()=>{
            const avgScale=proj.reduce((s,p)=>s+p.scale,0)/4;
            const {diffuse,spec,spec2}=computeLight(fCorners,rx,ry);

            const bodyBase = 12 + diffuse * 18;
            drawRoundedQuad(ctx!,proj,5*avgScale);
            ctx!.fillStyle=`rgb(${Math.round(bodyBase)},${Math.round(bodyBase)},${Math.round(bodyBase+2)})`;
            ctx!.fill();
            ctx!.strokeStyle=`rgba(70,75,90,${0.25+spec*0.5})`;
            ctx!.lineWidth=0.7;
            ctx!.stroke();

            drawTexture(ctx!,proj,texIdx,diffuse,spec,spec2,avgScale);

            if (spec>0.1) {
              const centX=(proj[0].x+proj[2].x)/2, centY=(proj[0].y+proj[2].y)/2;
              const r=Math.max(proj[1].x-proj[0].x,proj[2].y-proj[0].y)*0.4;
              const sg=ctx!.createRadialGradient(centX-r*0.2,centY-r*0.3,0,centX,centY,r);
              sg.addColorStop(0,`rgba(200,210,230,${spec*0.12})`);
              sg.addColorStop(1,`rgba(200,210,230,0)`);
              drawRoundedQuad(ctx!,proj,5*avgScale);
              ctx!.fillStyle=sg; ctx!.fill();
            }
          }});
        }
      }

      allFaces.sort((a,b)=>a.z-b.z);
      allFaces.forEach(f=>f.draw());

      const shadowY = cy + 155;
      const sg = ctx!.createRadialGradient(cx, shadowY, 0, cx, shadowY, 120);
      sg.addColorStop(0, "rgba(255,255,255,0.02)");
      sg.addColorStop(0.5, "rgba(255,255,255,0.008)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = sg;
      ctx!.fillRect(cx - 150, shadowY - 20, 300, 40);

      animRef.current=requestAnimationFrame(render);
    }

    const onPointerDown=(e:PointerEvent)=>{
      dragRef.current={active:true,lastX:e.clientX,lastY:e.clientY};
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove=(e:PointerEvent)=>{
      if (!dragRef.current.active) return;
      const dx=e.clientX-dragRef.current.lastX, dy=e.clientY-dragRef.current.lastY;
      rotRef.current.ry+=dx*0.008;
      rotRef.current.rx+=dy*0.008;
      rotRef.current.rx=Math.max(-1.2,Math.min(1.2,rotRef.current.rx));
      dragRef.current.lastX=e.clientX; dragRef.current.lastY=e.clientY;
    };
    const onPointerUp=()=>{ dragRef.current.active=false; };

    canvas.addEventListener("pointerdown",onPointerDown);
    canvas.addEventListener("pointermove",onPointerMove);
    canvas.addEventListener("pointerup",onPointerUp);
    canvas.addEventListener("pointerleave",onPointerUp);
    render();

    return ()=>{
      canvas.removeEventListener("pointerdown",onPointerDown);
      canvas.removeEventListener("pointermove",onPointerMove);
      canvas.removeEventListener("pointerup",onPointerUp);
      canvas.removeEventListener("pointerleave",onPointerUp);
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-[480px] p-4">
      <canvas ref={canvasRef} className="pointer-events-auto cursor-grab active:cursor-grabbing touch-none" data-testid="canvas-3d-cube" />
    </div>
  );
}

function LiveTicker() {
  const [prices, setPrices] = useState([
    { pair: "BTC", price: 70487, change: 3.88 },
    { pair: "ETH", price: 2057, change: 3.13 },
    { pair: "SOL", price: 86.67, change: 3.58 },
    { pair: "XRP", price: 1.39, change: 2.73 },
    { pair: "BNB", price: 645.62, change: 2.74 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.002),
          change: p.change + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-6 overflow-hidden" data-testid="live-ticker">
      {prices.map((p) => (
        <div key={p.pair} className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-neutral-500 font-medium">{p.pair}</span>
          <span className="font-mono text-neutral-300">
            ${p.price.toLocaleString("en-US", { minimumFractionDigits: p.price < 10 ? 4 : 2, maximumFractionDigits: p.price < 10 ? 4 : 2 })}
          </span>
          <span className={`font-mono ${p.change >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {p.change >= 0 ? "+" : ""}
            {p.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-black/90 backdrop-blur-lg border-b border-white/[0.06]" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-how-it-works">
              How it Works
            </a>
            <a href="#technology" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-ai-agents">
              Technology
            </a>
            <a href="#exchanges" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-brokers">
              Exchanges
            </a>
            <a href="#pricing" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-pricing">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-neutral-400 hover:text-white text-[13px] h-9" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-neutral-200 text-[13px] h-9 rounded-lg font-medium" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-0 md:pt-40 md:pb-0">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-950/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-950/15 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
            <div>
              <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-light tracking-[-0.03em] leading-[1.05] mb-6">
                AI Trading
                <br />
                <span className="italic font-normal text-neutral-400">for everyone</span>
              </h1>
              <p className="text-neutral-500 text-lg leading-relaxed max-w-md mb-10">
                Multi-AI consensus signals for 15 crypto pairs.
                <br />
                Set capital, get entry, stop-loss, and take-profit — automatically.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/register">
                  <Button
                    className="bg-white text-black hover:bg-neutral-200 h-11 px-7 rounded-lg font-medium text-sm"
                    data-testid="button-hero-start"
                  >
                    Get Started
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  asChild
                  className="text-neutral-400 hover:text-white h-11 px-5 text-sm"
                  data-testid="button-hero-how-it-works"
                >
                  <a href="#how-it-works">Documentation</a>
                </Button>
              </div>
            </div>

            <div className="flex justify-center md:justify-end overflow-visible">
              <div className="relative overflow-visible">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-full blur-[80px] scale-150" />
                <InteractiveCube />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-12">
          <div className="max-w-[1200px] mx-auto px-6 py-4">
            <LiveTicker />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">How it works</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Three steps to
              <br />
              <span className="italic text-neutral-400">smarter trading</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              {
                step: "01",
                num: 1,
                title: "Set capital",
                desc: "Enter your trading amount. AI calculates position size and risk levels for each trade.",
              },
              {
                step: "02",
                num: 2,
                title: "Get AI signals",
                desc: "GPT-4o, Claude, and Gemini analyze in parallel. 67%+ consensus required for signals.",
              },
              {
                step: "03",
                num: 3,
                title: "Execute trades",
                desc: "Get entry, stop-loss, and take-profit levels. Connect your exchange or use paper trading.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-black p-8 md:p-10" data-testid={`card-step-${item.num}`}>
                <span className="text-xs font-mono text-neutral-600 block mb-6">{item.step}</span>
                <h3 className="text-xl font-normal mb-3 text-white">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="technology" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Technology</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Powered by
              <br />
              <span className="italic text-neutral-400">multi-AI consensus</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden mb-12">
            <div className="bg-black p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-neutral-500">SIGNAL ENGINE</span>
              </div>
              <h3 className="text-xl font-normal mb-3">Multi-model analysis</h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                Three leading AI providers — OpenAI GPT-4o, Anthropic Claude, and Google Gemini — analyze each trade independently. Only when 67%+ agree does a signal fire.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {["GPT-4o", "Claude", "Gemini"].map((m) => (
                  <div key={m} className="text-center py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-xs text-neutral-400">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-mono text-neutral-500">RISK MANAGEMENT</span>
              </div>
              <h3 className="text-xl font-normal mb-3">Capital protection</h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                Maximum 2% risk per trade, 10% maximum position size. AI sets strict stop-loss levels and dynamically adjusts take-profit targets with 1:1.5 risk-reward ratio.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">2% max risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">Auto stop-loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">1:1.5 R:R</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              {
                label: "Technical",
                desc: "RSI, MACD, Bollinger Bands, Stochastic, ADX, support/resistance analysis",
                weight: "1.2x",
              },
              {
                label: "Fundamental",
                desc: "Volume delta, order book imbalance, funding rate, open interest analysis",
                weight: "1.0x",
              },
              {
                label: "Smart Money",
                desc: "Whale activity tracking, institutional flow, market regime classification",
                weight: "1.3x",
              },
            ].map((agent) => (
              <div key={agent.label} className="bg-black p-8" data-testid={`card-agent-${agent.label.toLowerCase()}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">{agent.label}</h4>
                  <span className="text-[10px] font-mono text-neutral-600">{agent.weight}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Features</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Everything you need
              <br />
              <span className="italic text-neutral-400">to trade with confidence</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              { title: "15 Crypto Pairs", desc: "BTC, ETH, SOL, XRP, DOGE, BNB, ADA, and 8 more major pairs" },
              { title: "Live Signals", desc: "Real-time BUY/SELL/SKIP signals with confidence scores and reasoning" },
              { title: "Auto Trading", desc: "Connect your exchange API for automated trade execution" },
              { title: "Paper Trading", desc: "Risk-free practice with virtual TradeX broker and real prices" },
              { title: "Smart Exit", desc: "AI monitors trades and extends hold time when conditions are favorable" },
              { title: "Find Trade", desc: "Auto-scan mode runs up to 30 minutes until a 90%+ confidence signal" },
              { title: "Multi-Exchange", desc: "Supports Binance, Bybit, OKX, KuCoin, Bitget, and more" },
              { title: "Wallet System", desc: "Deposit via crypto or UPI, withdraw with 24hr processing" },
            ].map((f) => (
              <div key={f.title} className="bg-black p-6 md:p-8" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s/g, "-")}`}>
                <h4 className="text-sm font-medium text-white mb-2">{f.title}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="exchanges" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Integrations</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Connect your
              <br />
              <span className="italic text-neutral-400">favorite exchange</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              { id: "tradex", name: "TradeX" },
              { id: "binance", name: "Binance" },
              { id: "bybit", name: "Bybit" },
              { id: "okx", name: "OKX" },
              { id: "kucoin", name: "KuCoin" },
              { id: "bitget", name: "Bitget" },
              { id: "gateio", name: "Gate.io" },
              { id: "kraken", name: "Kraken" },
              { id: "mexc", name: "MEXC" },
              { id: "more", name: "More..." },
            ].map((ex) => (
              <div key={ex.id} className="bg-black p-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                {ex.id === "more" ? (
                  <span className="text-sm text-neutral-500">+ More</span>
                ) : (
                  <>
                    <ExchangeLogo exchange={ex.id} className="w-8 h-8 opacity-60" />
                    <span className="text-xs text-neutral-500">{ex.name}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mx-auto text-center mb-16">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Pricing</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight">
              Start free, <span className="italic text-neutral-400">upgrade anytime</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden max-w-3xl mx-auto">
            <div className="bg-black p-8 md:p-10">
              <span className="text-xs font-mono text-neutral-500 block mb-4">FREE</span>
              <div className="text-3xl font-light mb-1">$0</div>
              <p className="text-xs text-neutral-500 mb-8">No credit card required</p>
              <ul className="space-y-3 text-sm text-neutral-400 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  10 AI analyses per day
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  All 15 crypto pairs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  Paper trading
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  Basic AI signals
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 text-sm text-white hover:bg-white/5" data-testid="button-pricing-free">
                  Get Started
                </Button>
              </Link>
            </div>

            <div className="bg-black p-8 md:p-10 relative">
              <div className="absolute top-4 right-4 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">POPULAR</div>
              <span className="text-xs font-mono text-neutral-500 block mb-4">PRO</span>
              <div className="text-3xl font-light mb-1">
                10 <span className="text-lg text-neutral-500">USDT/mo</span>
              </div>
              <p className="text-xs text-neutral-500 mb-8">Pay with crypto or UPI</p>
              <ul className="space-y-3 text-sm text-neutral-400 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Unlimited AI analyses
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Auto-trade execution
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Find Trade scanner
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Multi-exchange connect
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full h-10 rounded-lg bg-white text-black hover:bg-neutral-200 text-sm font-medium" data-testid="button-pricing-pro">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight mb-6">
            Ready to trade <span className="italic text-neutral-400">smarter?</span>
          </h2>
          <p className="text-neutral-500 text-sm mb-10 max-w-md mx-auto">
            Join traders using multi-AI consensus for better crypto decisions.
          </p>
          <Link href="/register">
            <Button className="bg-white text-black hover:bg-neutral-200 h-11 px-8 rounded-lg font-medium text-sm" data-testid="button-cta-start">
              Get Started — Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={logoImage} alt="TradeX AI" className="h-7 w-auto opacity-50" />
            <p className="text-[11px] text-neutral-600 text-center md:text-left">
              Crypto trading involves significant risk. This is not financial advice. Trade responsibly.
            </p>
            <span className="text-[11px] text-neutral-700">
              &copy; {new Date().getFullYear()} TradeX AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
