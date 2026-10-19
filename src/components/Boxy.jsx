import './Boxy.css';

// Boxy, the mascot: a block with a text caret for an antenna. Same shapes as brand/mascot.svg;
// inline so the eyes blink and the caret flashes.
export default function Boxy({ size = 120, className = '' }) {
  return (
    <svg className={`boxy ${className}`} width={size} height={size} viewBox="0 0 240 240" role="img" aria-label="Boxy, the Icelus mascot">
      <rect className="boxy-caret" x="114" y="30" width="12" height="36" rx="6" fill="var(--accent)" />
      <rect x="84" y="194" width="28" height="16" rx="8" fill="var(--accent)" />
      <rect x="128" y="194" width="28" height="16" rx="8" fill="var(--accent)" />
      <rect x="56" y="78" width="128" height="112" rx="36" fill="#5B9BFF" />
      <g className="boxy-eyes" fill="#1D1D1F">
        <ellipse cx="98" cy="126" rx="9" ry="11" />
        <ellipse cx="142" cy="126" rx="9" ry="11" />
      </g>
      <g fill="#fff">
        <circle cx="101" cy="122" r="3" />
        <circle cx="145" cy="122" r="3" />
      </g>
      <path d="M106 154Q120 166 134 154" fill="none" stroke="#1D1D1F" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
