export function SkeletonCard({ height = 72 }) {
  return <div style={{
    background: "linear-gradient(90deg, #1a1a2e 25%, #2a2a3e 50%, #1a1a2e 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 12, height, marginBottom: 8,
  }} />;
}
