export default function CFGLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`cfg-logo-container ${className}`}>
      <div className="text-2xl font-bold" style={{ color: '#092358', fontFamily: 'Georgia, serif' }}>
        <span style={{ color: '#27D2A9' }}>CFG</span> Africa
      </div>
    </div>
  );
}
