const PATH_COUNT = 36;

/**
 * Floating line paths behind the whole public site (studio request):
 * fixed, non-interactive, theme-aware through currentColor, and held at
 * 66% opacity. Paths paint once; the layer drifts through a composited
 * CSS transform, so scrolling never triggers per-frame SVG repaints.
 * The global prefers-reduced-motion rules stop the drift.
 */
export function FloatingPathsBackground() {
  const paths = Array.from({ length: PATH_COUNT }, (_, index) => ({
    id: index,
    d: `M-${380 - index * 5} -${189 + index * 6}C-${380 - index * 5} -${189 + index * 6} -${312 - index * 5} ${216 - index * 6} ${152 - index * 5} ${343 - index * 6}C${616 - index * 5} ${470 - index * 6} ${684 - index * 5} ${875 - index * 6} ${684 - index * 5} ${875 - index * 6}`,
    width: 0.5 + index * 0.02,
    opacity: 0.05 + (index % 6) * 0.02,
  }));

  return (
    <div
      aria-hidden
      data-floating-paths
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ opacity: 0.66 }}
    >
      <svg
        className="paths-drift absolute -inset-[3%] h-[106%] w-[106%] text-primary"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
