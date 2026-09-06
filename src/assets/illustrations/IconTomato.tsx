export function IconTomato({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`t-${size}`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff8fab" />
          <stop offset="40%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="38" ry="38" fill={`url(#t-${size})`} stroke="#be123c" strokeWidth="2.5" />
      <ellipse cx="38" cy="38" rx="12" ry="15" fill="white" opacity="0.38" />
      <circle cx="50" cy="54" r="19" fill="white" stroke="#ffe4ec" strokeWidth="1.5" />
      <g stroke="#5c3a4a" strokeWidth="1.7" strokeLinecap="round">
        <line x1="50" y1="38" x2="50" y2="54" />
        <line x1="50" y1="54" x2="60" y2="60" stroke="#f472b6" />
      </g>
      <circle cx="50" cy="54" r="2.2" fill="#5c3a4a" />
      <ellipse cx="39" cy="68" rx="2.8" ry="3.6" fill="#5c3a4a" />
      <ellipse cx="61" cy="68" rx="2.8" ry="3.6" fill="#5c3a4a" />
      <circle cx="40" cy="66.5" r="0.9" fill="white" />
      <circle cx="62" cy="66.5" r="0.9" fill="white" />
      <path d="M46 73 Q50 75 54 73" fill="none" stroke="#5c3a4a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M47 23 Q50 18 53 23 L50 26 Z" fill="#16a34a" />
      <path d="M50 24 Q 42 17 34 19 Q 42 26 50 24" fill="#86efac" stroke="#14532d" strokeWidth="0.8" />
      <path d="M50 24 Q 58 17 66 19 Q 58 26 50 24" fill="#86efac" stroke="#14532d" strokeWidth="0.8" />
    </svg>
  )
}
