export default function PixelLoadingFrog() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
      <style>{`
        @keyframes pixel-bob {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-8px) scale(1.04); }
        }
        @keyframes blink-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes bar-fill {
          0%   { width: 0%; }
          100% { width: 92%; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.3;  transform: scale(1.08); }
        }
        @keyframes shimmer {
          0%   { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .pixel-sprite {
          animation: pixel-bob 0.9s steps(3) infinite;
          filter: drop-shadow(0 0 8px #00ff8888) drop-shadow(0 0 2px #00ff88cc);
        }
        .loading-bar-fill {
          animation: bar-fill 2.8s steps(23) infinite;
        }
        .cursor-blink { animation: blink-cursor 1s steps(1) infinite; }
        .glow-blob { animation: glow-pulse 2s ease-in-out infinite; }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 48px 32px' }}>

        {/* Ambient glow blob */}
        <div className="glow-blob" style={{
          position: 'absolute',
          width: '180px', height: '120px',
          background: 'radial-gradient(ellipse, #00ff4422 0%, transparent 70%)',
          top: '20px', left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}/>

        {/* Frog — 3x bigger, more detailed */}
        <div className="pixel-sprite" style={{ marginBottom: '20px' }}>
          <svg width="96" height="96" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Eye bumps */}
            <rect x="1" y="1" width="3" height="3" fill="#33dd66"/>
            <rect x="12" y="1" width="3" height="3" fill="#33dd66"/>
            {/* Pupils */}
            <rect x="2" y="2" width="1" height="1" fill="#001a08"/>
            <rect x="13" y="2" width="1" height="1" fill="#001a08"/>
            {/* Eye shine */}
            <rect x="1" y="1" width="1" height="1" fill="#aaffcc88"/>
            <rect x="12" y="1" width="1" height="1" fill="#aaffcc88"/>
            {/* Head */}
            <rect x="3" y="3" width="10" height="5" fill="#1db84a"/>
            <rect x="2" y="4" width="12" height="4" fill="#1db84a"/>
            {/* Highlight on head */}
            <rect x="4" y="3" width="4" height="1" fill="#33ee66"/>
            {/* Nostrils */}
            <rect x="6" y="6" width="1" height="1" fill="#0d7a2e"/>
            <rect x="9" y="6" width="1" height="1" fill="#0d7a2e"/>
            {/* Mouth line */}
            <rect x="4" y="7" width="1" height="1" fill="#0a6622"/>
            <rect x="5" y="8" width="6" height="1" fill="#0a6622"/>
            <rect x="11" y="7" width="1" height="1" fill="#0a6622"/>
            {/* Body */}
            <rect x="3" y="9" width="10" height="5" fill="#179940"/>
            <rect x="2" y="10" width="12" height="3" fill="#179940"/>
            {/* Belly */}
            <rect x="5" y="9" width="6" height="4" fill="#c8f5d8"/>
            <rect x="4" y="10" width="8" height="2" fill="#c8f5d8"/>
            {/* Belly shading */}
            <rect x="5" y="12" width="6" height="1" fill="#a0ddb8"/>
            {/* Front legs */}
            <rect x="1" y="10" width="2" height="3" fill="#1db84a"/>
            <rect x="13" y="10" width="2" height="3" fill="#1db84a"/>
            {/* Back legs */}
            <rect x="2" y="13" width="3" height="2" fill="#179940"/>
            <rect x="11" y="13" width="3" height="2" fill="#179940"/>
            {/* Feet */}
            <rect x="1" y="14" width="4" height="1" fill="#1db84a"/>
            <rect x="11" y="14" width="4" height="1" fill="#1db84a"/>
            <rect x="0" y="15" width="2" height="1" fill="#1db84a"/>
            <rect x="14" y="15" width="2" height="1" fill="#1db84a"/>
          </svg>
        </div>

        {/* Loading bar */}
        <div style={{
          width: '160px', height: '8px',
          background: '#0a0a0a',
          border: '2px solid #1a2e1f',
          marginBottom: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 8px #00ff4411',
        }}>
          <div className="loading-bar-fill" style={{
            height: '100%',
            background: 'repeating-linear-gradient(90deg, #00ff88 0px, #00ff88 5px, #00cc66 5px, #00cc66 8px)',
            imageRendering: 'pixelated',
            boxShadow: '0 0 6px #00ff8866',
          }}/>
        </div>

        {/* Dots below bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', marginTop: '6px' }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{
              width: '6px', height: '6px',
              background: i < 4 ? '#00ff88' : '#1a2e1f',
              imageRendering: 'pixelated',
            }}/>
          ))}
        </div>

        {/* Text */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '11px',
          color: '#00cc55',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textShadow: '0 0 8px #00ff8866',
        }}>
          LOADING<span className="cursor-blink" style={{ color: '#00ff88' }}>▮</span>
        </div>

        {/* Radial fade bg */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, #071a0e 0%, transparent 75%)',
          zIndex: -1,
          pointerEvents: 'none',
        }}/>
      </div>
    </div>
  )
}