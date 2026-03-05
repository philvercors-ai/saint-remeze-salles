import { useEffect, useState } from "react";
import { reservationsApi } from "../api/reservations";
import { manifestationsApi } from "../api/manifestations";
import { notificationsApi } from "../api/rgpd";
import { fmtDateFr, fmtTime } from "../utils/dates";
import { useUiStore } from "../store/uiStore";
import StatusBadge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const TABS = ["Réservations", "Manifestations", "Notifications", "Exports"];

export default function AdminPage() {
  const [tab, setTab] = useState(0);
  const [reservations, setReservations] = useState([]);
  const [manifestations, setManifestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useUiStore();

  const reload = () => {
    setLoading(true);
    Promise.all([
      reservationsApi.list({ status: "pending" }),
      manifestationsApi.list({ status: "pending" }),
    ]).then(([r, m]) => {
      setReservations(r.data.results || r.data);
      setManifestations(m.data.results || m.data);
    }).finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const handleReservationAction = async (id, action) => {
    setActionLoading(true);
    try {
      if (action === "approve") await reservationsApi.approve(id, comment);
      else await reservationsApi.reject(id, comment);
      showToast(`Réservation ${action === "approve" ? "approuvée" : "refusée"} !`);
      setSelected(null);
      setComment("");
      reload();
    } catch (_) {
      showToast("Erreur.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManifestationAction = async (id, action) => {
    setActionLoading(true);
    try {
      if (action === "approve") await manifestationsApi.approve(id, comment);
      else await manifestationsApi.reject(id, comment);
      showToast(`Manifestation ${action === "approve" ? "approuvée" : "refusée"} !`);
      setSelected(null);
      setComment("");
      reload();
    } catch (_) {
      showToast("Erreur.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = async (type) => {
    try {
      const res = type === "reservation"
        ? await reservationsApi.exportCsv()
        : await manifestationsApi.exportCsv();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}s.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      showToast("Erreur d'export.", "error");
    }
  };

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Administration</h1>
        {(reservations.length + manifestations.length) > 0 && (
          <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>
            {reservations.length + manifestations.length} en attente
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: tab === i ? 600 : 400,
            color: tab === i ? "#1a3a5a" : "#6b7280",
            borderBottom: tab === i ? "3px solid #c9a84c" : "3px solid transparent",
            marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
          }}>
            {t}
            {i === 0 && reservations.length > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{reservations.length}</span>}
            {i === 1 && manifestations.length > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{manifestations.length}</span>}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#9ca3af" }}>Chargement…</p>}

      {/* Réservations */}
      {!loading && tab === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reservations.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>✅ Aucune réservation en attente.</p>
          ) : reservations.map((r) => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 2px 8px rgba(26,58,90,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.title}</p>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>
                    {r.room_name} · {fmtDateFr(r.date)} · {fmtTime(r.start_time)}–{fmtTime(r.end_time)}
                    {" · "}{r.attendees} pers.
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{r.contact_name} — {r.contact_email}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button size="sm" variant="gold" onClick={() => { setSelected({ ...r, _type: "reservation" }); setComment(""); }}>
                    Traiter
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manifestations */}
      {!loading && tab === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {manifestations.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>✅ Aucune manifestation en attente.</p>
          ) : manifestations.map((m) => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 2px 8px rgba(26,58,90,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{m.title}</p>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>{m.location} · {fmtDateFr(m.date_start)}{m.date_end !== m.date_start ? ` – ${fmtDateFr(m.date_end)}` : ""}</p>
                  <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{m.contact_name} — {m.contact_email}</p>
                </div>
                <Button size="sm" variant="gold" onClick={() => { setSelected({ ...m, _type: "manifestation" }); setComment(""); }}>
                  Traiter
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      {tab === 2 && <NotificationsPanel showToast={showToast} />}

      {/* Exports */}
      {tab === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 16 }}>Exports CSV</h3>
          {[
            { label: "Réservations", type: "reservation" },
            { label: "Manifestations", type: "manifestation" },
          ].map(({ label, type }) => (
            <div key={type} style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 2px 8px rgba(26,58,90,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>📊 Export {label}</span>
              <Button size="sm" variant="secondary" onClick={() => exportCsv(type)}>
                Télécharger CSV
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal traitement */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Traiter : ${selected.title}` : ""}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#f7f4ef", borderRadius: 8, padding: 14, fontSize: 13, color: "#6b7280" }}>
              {selected._type === "reservation"
                ? `${selected.room_name} · ${fmtDateFr(selected.date)} · ${fmtTime(selected.start_time)}–${fmtTime(selected.end_time)}`
                : `${selected.location} · ${fmtDateFr(selected.date_start)}`
              }<br />
              {selected.contact_name} — {selected.contact_email}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Commentaire (visible par le demandeur)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Motif de refus, conditions particulières…"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="danger"
                loading={actionLoading}
                onClick={() => selected._type === "reservation"
                  ? handleReservationAction(selected.id, "reject")
                  : handleManifestationAction(selected.id, "reject")
                }
              >
                Refuser
              </Button>
              <Button
                loading={actionLoading}
                style={{ flex: 1 }}
                onClick={() => selected._type === "reservation"
                  ? handleReservationAction(selected.id, "approve")
                  : handleManifestationAction(selected.id, "approve")
                }
              >
                Approuver ✓
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function NotificationsPanel({ showToast }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ service_ids: [], message: "", priority: "normal" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    notificationsApi.services().then(({ data }) => setServices(data.results || data));
  }, []);

  const toggleService = (id) => setForm((f) => ({
    ...f,
    service_ids: f.service_ids.includes(id) ? f.service_ids.filter((x) => x !== id) : [...f.service_ids, id],
  }));

  const handleSend = async () => {
    if (!form.service_ids.length || !form.message) return;
    setLoading(true);
    try {
      const { data } = await notificationsApi.send(form);
      showToast(data.detail);
      setForm({ service_ids: [], message: "", priority: "normal" });
    } catch (_) {
      showToast("Erreur d'envoi.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <h3 style={{ fontSize: 16 }}>Notifier les services</h3>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Services destinataires</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => (
            <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", background: form.service_ids.includes(s.id) ? "#f0f4f8" : "#fff", borderRadius: 8, border: "1.5px solid", borderColor: form.service_ids.includes(s.id) ? "#1a3a5a" : "#d4cfc7" }}>
              <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} style={{ accentColor: "#1a3a5a" }} />
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 14 }}>{s.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Priorité</label>
        <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
          <option value="low">Normale</option>
          <option value="normal">Importante</option>
          <option value="high">Urgente</option>
        </select>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Message</label>
        <textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Message à envoyer aux services sélectionnés…" />
      </div>
      <Button loading={loading} disabled={!form.service_ids.length || form.message.length < 10} onClick={handleSend}>
        Envoyer la notification
      </Button>
    </div>
  );
}
