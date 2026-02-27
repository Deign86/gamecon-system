/**
 * GC Diamond Logo — renders the GameCon brand mark PNG.
 *
 * Props:
 *   size      – pixel dimension (square)
 *   className – extra CSS classes
 */
export default function GCLogo({
  className = "",
  size = 32,
  ...props
}) {
  return (
    <img
      src="/logo.png"
      alt="GameCon Logo"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      {...props}
    />
  );
}
