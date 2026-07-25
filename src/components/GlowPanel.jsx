/* Glowing Blue Background Panel
   Implements the DESIGN.md glow panel specification.
   Mobile-optimized with safe areas, touch targets, and animations. */

export function GlowPanel({ children, className = "", title, description, cta, ...props }) {
  return (
    <section
      className={`glow-panel min-h-[380px] p-5 md:p-7 rounded-xl flex items-center justify-center ${className}`}
      aria-labelledby={title ? "panel-title" : undefined}
      role="banner"
      {...props}
    >
      {/* Ambient glow orbs */}
      <div className="glow-orb glow-orb--1" aria-hidden="true" />
      <div className="glow-orb glow-orb--2" aria-hidden="true" />
      <div className="glow-orb glow-orb--3" aria-hidden="true" />
      
      {/* Bottom ambient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(74, 158, 255, 0.08) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {children ? (
        <div className="glow-content w-full">{children}</div>
      ) : (
        <div className="glow-content flex flex-col items-center text-center gap-3 max-w-[340px] w-full">
          {title && (
            <h1 id="panel-title" className="text-[26px] md:text-[30px] font-bold text-white leading-[1.2] tracking-[-0.5px]">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-[14px] text-[#C8E0FF] leading-[1.5] max-w-[280px]">
              {description}
            </p>
          )}
          {cta && (
            <button
              className="w-full h-12 rounded-xl bg-[#4A9EFF] text-white text-[15px] font-semibold tracking-[0.5px] cursor-pointer transition-all duration-200 shadow-[0_4px_20px_rgba(74,158,255,0.35)] active:scale-[0.97] touch-action-manipulation focus-visible:outline-3 focus-visible:outline-[#6FB5FF] focus-visible:outline-offset-3"
              type="button"
            >
              {cta}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
