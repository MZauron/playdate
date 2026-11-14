/** A dark rounded bar at the top. The caller decides when it shows and when it goes (a provider comes with the first screen that needs one). */
export function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
      <p role="status" className="rounded-button bg-ink px-4 py-3 text-[15px] font-medium text-white shadow-card">
        {children}
      </p>
    </div>
  );
}
