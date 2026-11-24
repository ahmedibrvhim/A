const PATH = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z';

export default function Stars({ value = 0, size = 18 }) {
  const r = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="stars" role="img" aria-label={`${r.toFixed(1)} / 5`} dir="ltr">
      {[0, 1, 2, 3, 4].map((i) => {
        const pct = Math.round(Math.max(0, Math.min(1, r - i)) * 100);
        return (
          <span className="star" key={i} style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" className="star-base"><path d={PATH} /></svg>
            <span className="star-fill" style={{ width: `${pct}%` }}>
              <svg viewBox="0 0 24 24" style={{ width: size, height: size }}><path d={PATH} /></svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
