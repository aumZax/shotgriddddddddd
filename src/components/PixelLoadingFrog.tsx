export default function PixelLoadingSkeleton() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '400px',
      background: 'transparent',
    }}>
      <style>{`
        @keyframes skel-hover {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%      { transform: translateY(-8px) rotate(-0.4deg); }
          75%      { transform: translateY(-4px) rotate(0.3deg); }
        }
        @keyframes jaw-drop {
          0%,60%,100% { transform: translateY(0px); }
          70%          { transform: translateY(2px); }
          80%          { transform: translateY(1px); }
        }
        @keyframes eye-burn {
          0%,100% { opacity:0.55; }
          50%      { opacity:1; }
        }
        @keyframes eye-glow-anim {
          0%,100% { opacity: 0.3; }
          50%      { opacity: 0.9; }
        }
        @keyframes arm-l-sway {
          0%,100% { transform: rotate(-5deg); }
          50%      { transform: rotate(-9deg); }
        }
        @keyframes arm-r-sway {
          0%,100% { transform: rotate(5deg); }
          50%      { transform: rotate(9deg); }
        }
        @keyframes leg-l-sway {
          0%,100% { transform: rotate(-3deg); }
          50%      { transform: rotate(-6deg); }
        }
        @keyframes leg-r-sway {
          0%,100% { transform: rotate(3deg); }
          50%      { transform: rotate(6deg); }
        }
        @keyframes spine-glow {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; filter: drop-shadow(0 0 3px #00ffaa55); }
        }
        @keyframes rib-breathe {
          0%,100% { transform: scaleX(1); }
          50%      { transform: scaleX(1.04); }
        }
        @keyframes smoke-up {
          0%   { opacity:0; transform:translateY(0) scaleX(1); }
          25%  { opacity:0.5; }
          100% { opacity:0; transform:translateY(-30px) scaleX(1.6); }
        }
        @keyframes fog-pulse {
          0%,100% { opacity:0.22; transform:scaleX(1); }
          50%      { opacity:0.4;  transform:scaleX(1.12); }
        }
        @keyframes bar-load {
          0%   { width:0%; }
          18%  { width:28%; }
          45%  { width:55%; }
          72%  { width:80%; }
          92%  { width:96%; }
          100% { width:0%; }
        }
        @keyframes bar-pulse {
          0%,100% { box-shadow: 0 0 6px #00ff8833; }
          50%      { box-shadow: 0 0 18px #00ffaaaa, 0 0 32px #00ff6633; }
        }
        @keyframes skull-bg {
          0%,100% { opacity:0.06; transform:translateX(-50%) scale(1); }
          50%      { opacity:0.13; transform:translateX(-50%) scale(1.05); }
        }
        @keyframes blink-cur {
          0%,49%{opacity:1;} 50%,100%{opacity:0;}
        }
        @keyframes rune-cw {
          from{transform:rotate(0deg);} to{transform:rotate(360deg);}
        }
        @keyframes rune-ccw {
          from{transform:rotate(0deg);} to{transform:rotate(-360deg);}
        }
        @keyframes ptcl {
          0%  {opacity:0;  transform:translate(0,0) scale(.5);}
          20% {opacity:.9;}
          100%{opacity:0;  transform:translate(var(--tx),var(--ty)) scale(1.3);}
        }
        @keyframes crack-flicker {
          0%,95%,100%{opacity:0;} 96%{opacity:.6;} 98%{opacity:1;} 99%{opacity:.3;}
        }
        @keyframes shoulder-bob {
          0%,100%{transform:translateY(0);} 50%{transform:translateY(-1px);}
        }

        .skel-root  { animation: skel-hover 3.2s ease-in-out infinite; }
        .skel-jaw   { animation: jaw-drop 4.5s ease-in-out infinite; transform-origin:50% 0; }
        .skel-eye   { animation: eye-burn 2s ease-in-out infinite; }
        .eye-glow   { animation: eye-glow-anim 2s ease-in-out infinite; }
        .skel-spine { animation: spine-glow 2.5s ease-in-out infinite; }
        .skel-ribs  { animation: rib-breathe 3s ease-in-out infinite; transform-origin:50% 50%; }
        .arm-l      { animation: arm-l-sway 3s ease-in-out infinite; transform-origin:50% 0%; }
        .arm-r      { animation: arm-r-sway 3s ease-in-out infinite; transform-origin:50% 0%; }
        .leg-l      { animation: leg-l-sway 3s ease-in-out infinite; transform-origin:50% 0%; }
        .leg-r      { animation: leg-r-sway 3s ease-in-out infinite; transform-origin:50% 0%; }
        .shoulders  { animation: shoulder-bob 3.2s ease-in-out infinite; }
        .crack      { animation: crack-flicker 6s steps(1) infinite; }
        .sm1        { animation: smoke-up 2.6s ease-out infinite 0s; }
        .sm2        { animation: smoke-up 2.6s ease-out infinite .9s; }
        .sm3        { animation: smoke-up 2.6s ease-out infinite 1.8s; }
        .gfog       { animation: fog-pulse 3s ease-in-out infinite; }
        .bar        { animation: bar-load 3s cubic-bezier(.4,0,.2,1) infinite; }
        .bar-wrap   { animation: bar-pulse 2s ease-in-out infinite; }
        .sbg        { animation: skull-bg 3s ease-in-out infinite; }
        .cur        { animation: blink-cur 1s steps(1) infinite; }
        .ring1      { animation: rune-cw  12s linear infinite; }
        .ring2      { animation: rune-ccw  8s linear infinite; }
        .p1{--tx:-9px;--ty:-22px; animation:ptcl 2.2s ease-out infinite 0s;}
        .p2{--tx: 7px;--ty:-26px; animation:ptcl 2.2s ease-out infinite .55s;}
        .p3{--tx:-5px;--ty:-18px; animation:ptcl 2.2s ease-out infinite 1.1s;}
        .p4{--tx:11px;--ty:-24px; animation:ptcl 2.2s ease-out infinite 1.65s;}
      `}</style>

      <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 56px 32px' }}>

        {/* Rune rings */}
        <div style={{ position:'absolute', top:'38%', left:'50%', width:0, height:0, pointerEvents:'none' }}>
          <div className="ring1" style={{ position:'absolute', width:170, height:170, top:-85, left:-85, border:'1px solid rgba(0,200,110,.1)', borderRadius:'50%' }}>
            {[0,30,60,90,120,150,180,210,240,270,300,330].map(d=>(
              <div key={d} style={{ position:'absolute', top:'50%', left:'50%', width:7, height:2, background:'rgba(0,220,130,.22)', transform:`rotate(${d}deg) translateX(83px) translateY(-1px)` }}/>
            ))}
          </div>
          <div className="ring2" style={{ position:'absolute', width:116, height:116, top:-58, left:-58, border:'1px solid rgba(0,255,160,.08)', borderRadius:'50%' }}>
            {[0,45,90,135,180,225,270,315].map(d=>(
              <div key={d} style={{ position:'absolute', top:'50%', left:'50%', width:4, height:4, background:'rgba(0,255,170,.2)', borderRadius:'50%', transform:`rotate(${d}deg) translateX(56px) translateY(-2px)` }}/>
            ))}
          </div>
        </div>

        {/* Skull BG watermark */}
        <div className="sbg" style={{ position:'absolute', top:'8%', left:'50%', fontSize:100, lineHeight:1, pointerEvents:'none', userSelect:'none', filter:'grayscale(1) brightness(.22) sepia(1) hue-rotate(100deg)' }}>💀</div>

        {/* Particles */}
        <div style={{ position:'absolute', bottom:'38%', left:'49%' }}>
          {[
            {c:'p1',w:4,h:4,bg:'rgba(0,200,100,.7)'},
            {c:'p2',w:4,h:4,bg:'rgba(0,220,120,.6)'},
            {c:'p3',w:3,h:3,bg:'rgba(0,160,80,.5)'},
            {c:'p4',w:2,h:2,bg:'rgba(0,255,150,.7)'},
          ].map(({c,w,h,bg})=>(
            <div key={c} className={c} style={{ position:'absolute', width:w, height:h, borderRadius:'50%', background:bg }}/>
          ))}
        </div>

        {/* SKELETON */}
        <div className="skel-root" style={{ marginBottom:24, position:'relative', zIndex:1 }}>
          <svg width="100" height="160" viewBox="0 0 20 32"
               style={{ imageRendering:'pixelated' }} fill="none"
               xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="eg" cx="50%" cy="50%" r="50%">
                <stop offset="0%"  stopColor="#ccffee"/>
                <stop offset="55%" stopColor="#00ee99"/>
                <stop offset="100%" stopColor="#005533"/>
              </radialGradient>
              <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#88ffcc" stopOpacity=".6"/>
                <stop offset="100%" stopColor="#003322" stopOpacity=".1"/>
              </linearGradient>
              {/* Soft round glow filter - expands beyond shape smoothly */}
              <filter id="eyeBlur" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur"/>
                <feComposite in="blur" in2="SourceGraphic" operator="over"/>
              </filter>
              <filter id="eyeBlurBig" x="-200%" y="-200%" width="500%" height="500%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.4"/>
              </filter>
            </defs>

            {/* SKULL dome */}
            <rect x="5"  y="0"  width="10" height="1" fill="#ddddc8"/>
            <rect x="3"  y="1"  width="14" height="1" fill="#d5d5c0"/>
            <rect x="2"  y="2"  width="16" height="4" fill="#ccccb8"/>
            {/* highlight */}
            <rect x="4"  y="1"  width="5"  height="1" fill="#eeeedd"/>
            <rect x="3"  y="2"  width="3"  height="2" fill="#e8e8d4"/>
            {/* side shadow */}
            <rect x="2"  y="2"  width="1"  height="5" fill="#aaa898"/>
            <rect x="17" y="2"  width="1"  height="5" fill="#aaa898"/>

            {/* EYE SOCKETS */}
            <g className="skel-eye">
              {/* socket holes */}
              <rect x="3"  y="3"  width="5" height="3" fill="#050505"/>
              <rect x="12" y="3"  width="5" height="3" fill="#050505"/>
              {/* outer glow layer - blurred, renders behind sharp pixels */}
              <g className="eye-glow">
                <rect x="4"  y="3"  width="3" height="3" fill="#00ffaa" filter="url(#eyeBlurBig)" opacity=".6"/>
                <rect x="13" y="3"  width="3" height="3" fill="#00ffaa" filter="url(#eyeBlurBig)" opacity=".6"/>
              </g>
              {/* mid glow */}
              <rect x="4"  y="3"  width="3" height="3" fill="#00dd88" filter="url(#eyeBlur)" opacity=".5"/>
              <rect x="13" y="3"  width="3" height="3" fill="#00dd88" filter="url(#eyeBlur)" opacity=".5"/>
              {/* sharp pixel fill on top */}
              <rect x="4"  y="3"  width="3" height="3" fill="url(#eg)" opacity=".95"/>
              <rect x="4"  y="3"  width="2" height="1" fill="#ddfff0" opacity=".95"/>
              <rect x="13" y="3"  width="3" height="3" fill="url(#eg)" opacity=".95"/>
              <rect x="13" y="3"  width="2" height="1" fill="#ddfff0" opacity=".95"/>
            </g>

            {/* Nose */}
            <rect x="9"  y="4"  width="2" height="2" fill="#0d0d0d"/>

            {/* Cheekbones */}
            <rect x="2"  y="5"  width="2" height="2" fill="#bcbcac"/>
            <rect x="16" y="5"  width="2" height="2" fill="#bcbcac"/>

            {/* Upper teeth line */}
            <rect x="4"  y="6"  width="12" height="1" fill="#c8c8b4"/>

            {/* JAW */}
            <g className="skel-jaw">
              <rect x="3"  y="7"  width="14" height="1" fill="#bbbba8"/>
              {[4,6,8,10,12,14].map(x=>(
                <rect key={x} x={x} y="7" width="2" height="2" fill="#eeeedd"/>
              ))}
              {[5,7,9,11,13].map(x=>(
                <rect key={x} x={x} y="7" width="1" height="2" fill="#7a7a6e"/>
              ))}
              <rect x="3"  y="7"  width="1" height="2" fill="#aaa898"/>
              <rect x="16" y="7"  width="1" height="2" fill="#aaa898"/>
              <rect x="5"  y="9"  width="10" height="1" fill="#c0c0ae"/>
            </g>

            {/* Skull crack */}
            <rect x="11" y="1"  width="1" height="4" fill="#666655" opacity=".45"/>
            <g className="crack">
              <rect x="11" y="1"  width="1" height="4" fill="#00ffaa" opacity=".4"/>
            </g>

            {/* NECK */}
            <rect x="8"  y="10" width="4" height="1" fill="#c0c0ae"/>

            {/* SHOULDERS */}
            <g className="shoulders">
              <rect x="2"  y="11" width="7"  height="1" fill="#d0d0bc"/>
              <rect x="11" y="11" width="7"  height="1" fill="#d0d0bc"/>
              <rect x="1"  y="11" width="2"  height="2" fill="#bfbfac"/>
              <rect x="17" y="11" width="2"  height="2" fill="#bfbfac"/>
              <rect x="1"  y="11" width="1"  height="1" fill="#d5d5c0"/>
              <rect x="18" y="11" width="1"  height="1" fill="#d5d5c0"/>
            </g>

            {/* RIBCAGE */}
            <g className="skel-ribs">
              <g className="skel-spine">
                <rect x="9"  y="11" width="2" height="8" fill="url(#spg)"/>
              </g>
              {/* 5 rib pairs */}
              <rect x="3"  y="12" width="6" height="1" fill="#c8c8b4"/>
              <rect x="11" y="12" width="6" height="1" fill="#c8c8b4"/>
              <rect x="2"  y="12" width="1" height="2" fill="#b0b09c"/>
              <rect x="17" y="12" width="1" height="2" fill="#b0b09c"/>

              <rect x="3"  y="13" width="6" height="1" fill="#c0c0ac"/>
              <rect x="11" y="13" width="6" height="1" fill="#c0c0ac"/>

              <rect x="3"  y="14" width="6" height="1" fill="#b8b8a4"/>
              <rect x="11" y="14" width="6" height="1" fill="#b8b8a4"/>
              <rect x="2"  y="14" width="1" height="2" fill="#a8a894"/>
              <rect x="17" y="14" width="1" height="2" fill="#a8a894"/>

              <rect x="4"  y="15" width="5" height="1" fill="#b0b09e"/>
              <rect x="11" y="15" width="5" height="1" fill="#b0b09e"/>

              <rect x="5"  y="16" width="4" height="1" fill="#a8a896"/>
              <rect x="11" y="16" width="4" height="1" fill="#a8a896"/>
              <rect x="3"  y="16" width="2" height="1" fill="#989886"/>
              <rect x="15" y="16" width="2" height="1" fill="#989886"/>

              {/* sternum edges */}
              <rect x="8"  y="12" width="1" height="5" fill="#d8d8c4"/>
              <rect x="11" y="12" width="1" height="5" fill="#d8d8c4"/>
            </g>

            {/* LEFT ARM — hanging loosely */}
            <g className="arm-l">
              {/* humerus */}
              <rect x="0"  y="12" width="2" height="6" fill="#c8c8b4"/>
              <rect x="0"  y="12" width="1" height="6" fill="#d8d8c4"/>
              {/* elbow */}
              <rect x="0"  y="18" width="3" height="1" fill="#d0d0bc"/>
              {/* radius/ulna */}
              <rect x="0"  y="19" width="2" height="5" fill="#c0c0ac"/>
              <rect x="0"  y="19" width="1" height="5" fill="#d0d0bc"/>
              {/* wrist */}
              <rect x="0"  y="24" width="3" height="1" fill="#c8c8b4"/>
              {/* hand + fingers */}
              <rect x="0"  y="25" width="3" height="2" fill="#c4c4b0"/>
              <rect x="0"  y="27" width="1" height="1" fill="#b8b8a4"/>
              <rect x="2"  y="27" width="1" height="1" fill="#b8b8a4"/>
            </g>

            {/* RIGHT ARM */}
            <g className="arm-r">
              {/* humerus */}
              <rect x="18" y="12" width="2" height="6" fill="#c0c0ac"/>
              <rect x="19" y="12" width="1" height="6" fill="#d0d0bc"/>
              {/* elbow */}
              <rect x="17" y="18" width="3" height="1" fill="#c8c8b4"/>
              {/* radius/ulna */}
              <rect x="18" y="19" width="2" height="5" fill="#b8b8a4"/>
              <rect x="19" y="19" width="1" height="5" fill="#c8c8b4"/>
              {/* wrist */}
              <rect x="17" y="24" width="3" height="1" fill="#c0c0ac"/>
              {/* hand + fingers */}
              <rect x="17" y="25" width="3" height="2" fill="#bcbcaa"/>
              <rect x="17" y="27" width="1" height="1" fill="#b0b09e"/>
              <rect x="19" y="27" width="1" height="1" fill="#b0b09e"/>
            </g>

            {/* PELVIS */}
            <rect x="4"  y="19" width="12" height="1" fill="#c0c0ac"/>
            <rect x="3"  y="20" width="14" height="2" fill="#bbbba8"/>
            <rect x="2"  y="20" width="2"  height="2" fill="#aaaaa0"/>
            <rect x="16" y="20" width="2"  height="2" fill="#aaaaa0"/>
            {/* hip sockets */}
            <rect x="4"  y="20" width="3"  height="2" fill="#1a1a14"/>
            <rect x="13" y="20" width="3"  height="2" fill="#1a1a14"/>
            <rect x="8"  y="20" width="4"  height="2" fill="#55554a" opacity=".5"/>

            {/* LEFT LEG */}
            <g className="leg-l">
              <rect x="4"  y="22" width="3" height="6" fill="#c8c8b4"/>
              <rect x="4"  y="22" width="1" height="6" fill="#d8d8c4"/>
              {/* knee */}
              <rect x="3"  y="28" width="4" height="2" fill="#d0d0bc"/>
              <rect x="4"  y="28" width="2" height="1" fill="#e0e0cc"/>
              {/* tibia */}
              <rect x="4"  y="30" width="2" height="2" fill="#c0c0ac"/>
              <rect x="4"  y="30" width="1" height="2" fill="#d0d0bc"/>
            </g>

            {/* RIGHT LEG */}
            <g className="leg-r">
              <rect x="13" y="22" width="3" height="6" fill="#c0c0ac"/>
              <rect x="15" y="22" width="1" height="6" fill="#d0d0bc"/>
              {/* knee */}
              <rect x="13" y="28" width="4" height="2" fill="#c8c8b4"/>
              <rect x="14" y="28" width="2" height="1" fill="#d8d8c4"/>
              {/* tibia */}
              <rect x="14" y="30" width="2" height="2" fill="#b8b8a4"/>
              <rect x="15" y="30" width="1" height="2" fill="#c8c8b4"/>
            </g>

            {/* SMOKE */}
            <g className="sm1" style={{transformOrigin:'9px 32px'}}>
              <rect x="8"  y="31" width="3" height="1" fill="#004422" opacity=".7"/>
            </g>
            <g className="sm2" style={{transformOrigin:'6px 32px'}}>
              <rect x="5"  y="31" width="2" height="1" fill="#003318" opacity=".5"/>
            </g>
            <g className="sm3" style={{transformOrigin:'13px 32px'}}>
              <rect x="12" y="31" width="2" height="1" fill="#004422" opacity=".55"/>
            </g>
          </svg>
        </div>

        {/* Ground fog */}
        <div className="gfog" style={{
          width:150, height:10,
          background:'radial-gradient(ellipse, rgba(0,120,60,.32) 0%, transparent 72%)',
          borderRadius:'50%',
          marginTop:-8, marginBottom:20,
        }}/>

        {/* Progress bar */}
        <div className="bar-wrap" style={{
          width:170, height:5,
          background:'#000d06',
          borderRadius:99,
          overflow:'hidden',
          border:'1px solid rgba(0,180,90,.2)',
          marginBottom:12,
        }}>
          <div className="bar" style={{
            height:'100%',
            background:'linear-gradient(90deg,#003322,#00aa55,#00ffaa,#00aa55)',
            borderRadius:99,
          }}/>
        </div>

        {/* Dots */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
          {[0,1,2,3,4].map(i=>(
            <div key={i} style={{
              width: i===2?8:5, height: i===2?8:5,
              borderRadius:'50%',
              background: i===2?'#00ff88':'rgba(0,150,70,.4)',
              boxShadow: i===2?'0 0 10px #00ff88aa':'none',
            }}/>
          ))}
        </div>

        {/* Label */}
        <div style={{
          fontFamily:'"Courier New", monospace',
          fontSize:10, color:'#00aa55',
          letterSpacing:'0.22em', textTransform:'uppercase',
          textShadow:'0 0 8px #00ff8844',
        }}>
          L O A D I N G<span className="cur" style={{color:'#00ee77',marginLeft:4}}>█</span>
        </div>
      </div>
    </div>
  );
}