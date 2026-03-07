import { useEffect, useState } from "react";
import {
  CalendarDays, Sparkles, Bell, Download,
  Clock, MapPin, Users, Mail, Phone,
  CheckCircle, XCircle, ChevronRight,
  AlertCircle, FileSpreadsheet, Send,
} from "lucide-react";
import { reservationsApi } from "../api/reservations";
import { manifestationsApi } from "../api/manifestations";
import { notificationsApi } from "../api/rgpd";
import { fmtDateFr, fmtTime } from "../utils/dates";
import { useUiStore } from "../store/uiStore";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  navy:    "#1a3a5a",
  gold:    "#c9a84c",
  bg:      "#f7f4ef",
  white:   "#ffffff",
  border:  "#e8e2d8",
  muted:   "#6b7280",
  light:   "#9ca3af",
  green:   "#16a34a",
  greenBg: "#dcfce7",
  red:     "#dc2626",
  redBg:   "#fee2e2",
  amber:   "#d97706",
  amberBg: "#fef3c7",
};

/* ── Tabs config ─────────────────────────────────────────────────────────── */
const TABS = [
  { label: "Réservations", Icon: CalendarDays },
  { label: "Manifestations", Icon: Sparkles },
  { label: "Notifications", Icon: Bell },
  { label: "Exports", Icon: Download },
];

/* ── Styles communs ──────────────────────────────────────────────────────── */
const card = {
  background: C.white,
  borderRadius: 14,
  boxShadow: "0 2px 12px rgba(26,58,90,.07)",
  border: `1px solid ${C.border}`,
};

const meta = { fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 5 };

/* ════════════════════════════════════════════════════════════════════════════
   Page principale
   ════════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [tab, setTab]             = useState(0);
  const [reservations, setRes]    = useState([]);
  const [manifestations, setMan]  = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [comment, setComment]     = useState("");
  const [actionLoading, setAL]    = useState(false);
  const { showToast }             = useUiStore();

  const reload = () => {
    setLoading(true);
    Promise.all([
      reservationsApi.list({ status: "pending" }),
      manifestationsApi.list({ status: "pending" }),
    ]).then(([r, m]) => {
      setRes(r.data.results || r.data);
      setMan(m.data.results || m.data);
    }).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const handleAction = async (id, action) => {
    setAL(true);
    try {
      const isRes = selected._type === "reservation";
      if (action === "approve") isRes ? await reservationsApi.approve(id, comment) : await manifestationsApi.approve(id, comment);
      else                      isRes ? await reservationsApi.reject(id, comment)  : await manifestationsApi.reject(id, comment);
      showToast(`${isRes ? "Réservation" : "Manifestation"} ${action === "approve" ? "approuvée ✓" : "refusée"} !`);
      setSelected(null);
      setComment("");
      reload();
    } catch (_) {
      showToast("Une erreur est survenue.", "error");
    } finally {
      setAL(false);
    }
  };

  const exportCsv = async (type) => {
    try {
      const res = type === "reservation" ? await reservationsApi.exportCsv() : await manifestationsApi.exportCsv();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `${type}s.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      showToast("Erreur d'export.", "error");
    }
  };

  const totalPending = reservations.length + manifestations.length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── En-tête ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C.gold, marginBottom: 4 }}>
            Espace administration
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: 26, color: C.navy, margin: 0 }}>Tableau de bord</h1>
            {totalPending > 0 && (
              <span style={{ background: C.redBg, color: C.red, borderRadius: 20, padding: "5px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} />
                {totalPending} demande{totalPending > 1 ? "s" : ""} en attente
              </span>
            )}
          </div>
        </div>

        {/* ── Stats cards ──────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard
              icon={<CalendarDays size={20} />}
              label="Réservations"
              value={reservations.length}
              color={C.navy}
              onClick={() => setTab(0)}
            />
            <StatCard
              icon={<Sparkles size={20} />}
              label="Manifestations"
              value={manifestations.length}
              color="#7c3aed"
              onClick={() => setTab(1)}
            />
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {TABS.map(({ label, Icon }, i) => {
              const active = tab === i;
              const count = i === 0 ? reservations.length : i === 1 ? manifestations.length : 0;
              return (
                <button
                  key={label}
                  onClick={() => setTab(i)}
                  style={{
                    flex: 1, minWidth: 120,
                    padding: "16px 12px",
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? C.navy : C.muted,
                    borderBottom: `3px solid ${active ? C.gold : "transparent"}`,
                    transition: "color .15s, border-color .15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={15} />
                  {label}
                  {count > 0 && (
                    <span style={{ background: C.red, color: "#fff", borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Contenu ──────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: C.light }}>
            <Clock size={32} style={{ marginBottom: 12, opacity: .5 }} />
            <p>Chargement…</p>
          </div>
        )}

        {/* Réservations */}
        {!loading && tab === 0 && (
          <ItemList
            items={reservations}
            emptyMsg="Aucune réservation en attente."
            renderItem={(r) => (
              <ReservationCard
                key={r.id}
                item={r}
                onProcess={() => { setSelected({ ...r, _type: "reservation" }); setComment(""); }}
              />
            )}
          />
        )}

        {/* Manifestations */}
        {!loading && tab === 1 && (
          <ItemList
            items={manifestations}
            emptyMsg="Aucune manifestation en attente."
            renderItem={(m) => (
              <ManifestationCard
                key={m.id}
                item={m}
                onProcess={() => { setSelected({ ...m, _type: "manifestation" }); setComment(""); }}
              />
            )}
          />
        )}

        {/* Notifications */}
        {tab === 2 && <NotificationsPanel showToast={showToast} />}

        {/* Exports */}
        {tab === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <ExportCard
              icon={<FileSpreadsheet size={24} color={C.navy} />}
              title="Réservations"
              description="Toutes les réservations avec statuts, contacts et commentaires."
              onExport={() => exportCsv("reservation")}
            />
            <ExportCard
              icon={<FileSpreadsheet size={24} color="#7c3aed" />}
              title="Manifestations"
              description="Toutes les manifestations soumises avec détails et décisions."
              onExport={() => exportCsv("manifestation")}
            />
          </div>
        )}
      </div>

      {/* ── Modal traitement ─────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="" width={520}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header modal */}
            <div>
              <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold, fontWeight: 600 }}>
                {selected._type === "reservation" ? "Réservation" : "Manifestation"} en attente
              </span>
              <h3 style={{ margin: "6px 0 0", fontSize: 20, color: C.navy }}>{selected.title}</h3>
            </div>

            {/* Infos */}
            <div style={{ background: C.bg, borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {selected._type === "reservation" ? (
                <>
                  <InfoRow icon={<CalendarDays size={14} />} text={`${fmtDateFr(selected.date)} · ${fmtTime(selected.start_time)} – ${fmtTime(selected.end_time)}`} />
                  <InfoRow icon={<MapPin size={14} />} text={selected.room_name} />
                  <InfoRow icon={<Users size={14} />} text={`${selected.attendees} participants`} />
                </>
              ) : (
                <>
                  <InfoRow icon={<CalendarDays size={14} />} text={`${fmtDateFr(selected.date_start)}${selected.date_end !== selected.date_start ? ` – ${fmtDateFr(selected.date_end)}` : ""}`} />
                  <InfoRow icon={<MapPin size={14} />} text={selected.location} />
                  <InfoRow icon={<Users size={14} />} text={`${selected.expected_attendees} participants attendus`} />
                </>
              )}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 8 }}>
                <InfoRow icon={<Mail size={14} />} text={`${selected.contact_name} — ${selected.contact_email}`} />
              </div>
            </div>

            {/* Commentaire */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.navy }}>
                Commentaire <span style={{ color: C.muted, fontWeight: 400 }}>(visible par le demandeur)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Motif de refus, conditions particulières d'utilisation…"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => handleAction(selected.id, "reject")}
                disabled={actionLoading}
                style={{
                  padding: "11px 20px", borderRadius: 8, border: `1.5px solid ${C.red}`,
                  background: "#fff", color: C.red, fontWeight: 600, fontSize: 14,
                  cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? .6 : 1,
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <XCircle size={16} />
                {actionLoading ? "…" : "Refuser"}
              </button>
              <button
                onClick={() => handleAction(selected.id, "approve")}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: "11px 20px", borderRadius: 8, border: "none",
                  background: C.green, color: "#fff", fontWeight: 600, fontSize: 14,
                  cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? .6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                <CheckCircle size={16} />
                {actionLoading ? "…" : "Approuver"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Sous-composants ─────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color, onClick }) {
  const urgent = value > 0;
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        padding: "18px 20px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 16,
        borderLeft: `4px solid ${urgent ? C.red : C.border}`,
        transition: "transform .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,58,90,.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,58,90,.07)"; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: urgent ? C.red : C.navy, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label} en attente</div>
      </div>
    </div>
  );
}

function ItemList({ items, emptyMsg, renderItem }) {
  if (items.length === 0) {
    return (
      <div style={{ ...card, padding: 60, textAlign: "center" }}>
        <CheckCircle size={40} color="#16a34a" style={{ marginBottom: 12, opacity: .7 }} />
        <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{emptyMsg}</p>
      </div>
    );
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.map(renderItem)}</div>;
}

function ReservationCard({ item: r, onProcess }) {
  return (
    <div style={{ ...card, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${C.gold}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${C.navy}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <CalendarDays size={20} color={C.navy} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.navy, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          <span style={meta}><MapPin size={12} />{r.room_name}</span>
          <span style={meta}><CalendarDays size={12} />{fmtDateFr(r.date)} · {fmtTime(r.start_time)}–{fmtTime(r.end_time)}</span>
          <span style={meta}><Users size={12} />{r.attendees} pers.</span>
          <span style={meta}><Mail size={12} />{r.contact_name}</span>
        </div>
      </div>
      <button
        onClick={onProcess}
        style={{
          padding: "9px 18px", borderRadius: 8, background: C.navy, color: "#fff",
          border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}
      >
        Traiter <ChevronRight size={14} />
      </button>
    </div>
  );
}

function ManifestationCard({ item: m, onProcess }) {
  return (
    <div style={{ ...card, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, borderLeft: "4px solid #7c3aed" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#7c3aed15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Sparkles size={20} color="#7c3aed" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.navy, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          <span style={meta}><MapPin size={12} />{m.location}</span>
          <span style={meta}><CalendarDays size={12} />{fmtDateFr(m.date_start)}{m.date_end !== m.date_start ? ` – ${fmtDateFr(m.date_end)}` : ""}</span>
          <span style={meta}><Users size={12} />{m.expected_attendees} pers.</span>
          <span style={meta}><Mail size={12} />{m.contact_name}</span>
        </div>
      </div>
      <button
        onClick={onProcess}
        style={{
          padding: "9px 18px", borderRadius: 8, background: "#7c3aed", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}
      >
        Traiter <ChevronRight size={14} />
      </button>
    </div>
  );
}

function ExportCard({ icon, title, description, onExport }) {
  return (
    <div style={{ ...card, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, color: C.navy, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>
      <Button variant="secondary" fullWidth onClick={onExport} style={{ gap: 8 }}>
        <Download size={14} /> Télécharger CSV
      </Button>
    </div>
  );
}

function InfoRow({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
      <span style={{ color: C.navy, flexShrink: 0 }}>{icon}</span>
      {text}
    </div>
  );
}

/* ── Panneau Notifications ────────────────────────────────────────────────── */
function NotificationsPanel({ showToast }) {
  const [services, setServices] = useState([]);
  const [form, setForm]         = useState({ service_ids: [], message: "", priority: "normal" });
  const [loading, setLoading]   = useState(false);

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

  const PRIORITY = [
    { value: "low",    label: "Normale",    color: C.muted },
    { value: "normal", label: "Importante", color: C.amber },
    { value: "high",   label: "Urgente",    color: C.red },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
      {/* Services */}
      <div style={{ ...card, padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: C.navy }}>Services destinataires</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => {
            const active = form.service_ids.includes(s.id);
            return (
              <label
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                  padding: "12px 14px", borderRadius: 10,
                  background: active ? `${C.navy}08` : C.bg,
                  border: `1.5px solid ${active ? C.navy : C.border}`,
                  transition: "all .15s",
                }}
              >
                <input type="checkbox" checked={active} onChange={() => toggleService(s.id)} style={{ accentColor: C.navy, width: 16, height: 16 }} />
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? C.navy : C.muted }}>{s.name}</span>
              </label>
            );
          })}
          {services.length === 0 && <p style={{ color: C.light, fontSize: 13 }}>Chargement des services…</p>}
        </div>
      </div>

      {/* Message */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...card, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: C.navy }}>Niveau de priorité</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRIORITY.map(({ value, label, color }) => (
              <label
                key={value}
                style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  padding: "10px 14px", borderRadius: 8,
                  background: form.priority === value ? `${color}12` : C.bg,
                  border: `1.5px solid ${form.priority === value ? color : C.border}`,
                }}
              >
                <input type="radio" name="priority" value={value} checked={form.priority === value}
                  onChange={() => setForm((f) => ({ ...f, priority: value }))} style={{ accentColor: color }} />
                <span style={{ fontSize: 14, fontWeight: form.priority === value ? 600 : 400, color: form.priority === value ? color : C.muted }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.navy }}>
            Message <span style={{ color: C.light, fontWeight: 400 }}>(min. 10 caractères)</span>
          </label>
          <textarea
            rows={5}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Message à envoyer aux services sélectionnés…"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 16 }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !form.service_ids.length || form.message.length < 10}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 8,
              background: C.navy, color: "#fff", fontWeight: 600, fontSize: 14, border: "none",
              cursor: loading || !form.service_ids.length || form.message.length < 10 ? "not-allowed" : "pointer",
              opacity: loading || !form.service_ids.length || form.message.length < 10 ? .5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "opacity .15s",
            }}
          >
            <Send size={15} />
            {loading ? "Envoi en cours…" : `Envoyer${form.service_ids.length ? ` (${form.service_ids.length} service${form.service_ids.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
