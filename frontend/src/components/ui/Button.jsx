export default function Button({ children, variant = "primary", size = "md", disabled, loading, onClick, type = "button", fullWidth, style }) {
  const BASE = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 8, fontWeight: 600, cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.6 : 1, border: "none", transition: "background .2s, transform .1s",
    width: fullWidth ? "100%" : undefined,
  };

  const SIZES = {
    sm: { padding: "7px 14px", fontSize: 13 },
    md: { padding: "10px 20px", fontSize: 14 },
    lg: { padding: "13px 28px", fontSize: 16 },
  };

  const VARIANTS = {
    primary:   { background: "#1a3a5a", color: "#fff" },
    secondary: { background: "#f1f5f9", color: "#1a3a5a" },
    danger:    { background: "#fee2e2", color: "#991b1b" },
    gold:      { background: "#c9a84c", color: "#fff" },
    ghost:     { background: "transparent", color: "#1a3a5a" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...BASE, ...SIZES[size], ...VARIANTS[variant], ...style }}
    >
      {loading ? "..." : children}
    </button>
  );
}
