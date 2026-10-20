import './Boxy.css';

// Boxy, the mascot: a frame still being drawn, its last corner open where the pen is, with text cursors for
// eyes and two selection handles for feet. Same shapes as brand/mascot.svg; inline so the eyes blink and the
// pen flashes like a caret.
export default function Boxy({ size = 120, className = '' }) {
  return (
    <svg className={`boxy ${className}`} width={size} height={size} viewBox="0 0 240 240" role="img" aria-label="Boxy, the Icelus mascot">
      <rect x="67" y="77" width="106" height="106" rx="21" fill="#DCE8FF" />
      <path d="M146 70H88a28 28 0 0 0-28 28v64a28 28 0 0 0 28 28h64a28 28 0 0 0 28-28V104" fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round" />
      <rect className="boxy-caret" x="166" y="58" width="12" height="34" rx="6" fill="#5B9BFF" transform="rotate(45 172 75)" />
      <rect x="51" y="181" width="18" height="18" rx="4" fill="#fff" stroke="var(--accent)" strokeWidth="5" />
      <rect x="171" y="181" width="18" height="18" rx="4" fill="#fff" stroke="var(--accent)" strokeWidth="5" />
      <g className="boxy-eyes" fill="#1D1D1F"><rect x="96" y="106" width="11" height="30" rx="5.5" /><rect x="133" y="106" width="11" height="30" rx="5.5" /></g>
      <path d="M104 156Q120 168 136 156" fill="none" stroke="#1D1D1F" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
