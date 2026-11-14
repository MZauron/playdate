/** The banner's kite. Decorative. */
export function Kite({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 88" className={className} fill="none">
      <path d="M32 4 56 30 32 64 8 30Z" fill="#E2583A" />
      <path d="M32 4 56 30H8Z" fill="#FDEEE9" fillOpacity=".35" />
      <path d="M32 4v60M8 30h48" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1.5" />
      <path d="M32 64c-6 6 6 10 0 16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 70 36 74M30 78 38 82" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
