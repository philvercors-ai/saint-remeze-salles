import { CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "../../utils/constants";

const ICONS = {
  approved:  <CheckCircle size={13} />,
  rejected:  <XCircle size={13} />,
  pending:   <Clock size={13} />,
  cancelled: <Ban size={13} />,
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || "badge-gray"}`}>
      {ICONS[status]}
      {STATUS_LABELS[status] || status}
    </span>
  );
}
