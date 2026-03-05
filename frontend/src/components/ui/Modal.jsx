import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, width = 560 }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const handleKey = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKey);
      };
    }
    document.body.style.overflow = "";
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(26,58,90,.4)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: width,
          maxHeight: "90vh", overflowY: "auto", animation: "fadein .2s ease",
          boxShadow: "0 16px 48px rgba(26,58,90,.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              <X size={20} />
            </button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}
