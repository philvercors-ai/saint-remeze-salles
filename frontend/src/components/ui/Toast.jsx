import { useUiStore } from "../../store/uiStore";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const ICONS = {
  success: <CheckCircle size={18} color="#065f46" />,
  error:   <XCircle size={18} color="#991b1b" />,
  warning: <AlertCircle size={18} color="#854d0e" />,
};

const BG = {
  success: "#d1fae5",
  error:   "#fee2e2",
  warning: "#fef9c3",
};

export default function Toast() {
  const toast = useUiStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      background: BG[toast.type] || BG.success,
      padding: "12px 20px", borderRadius: 10,
      boxShadow: "0 4px 16px rgba(0,0,0,.15)",
      animation: "fadein .3s ease",
      maxWidth: "90vw",
    }}>
      {ICONS[toast.type] || ICONS.success}
      <span style={{ fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
    </div>
  );
}
