import { useEffect, useState } from "react";
import { rgpdApi } from "../api/rgpd";

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    rgpdApi.privacyPolicy().then(({ data }) => setPolicy(data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: "32px 20px 80px", maxWidth: 720, margin: "0 auto" }} className="animate-fadein">
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Politique de confidentialité</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 32 }}>
        Version {policy?.version} — Dernière mise à jour : {policy?.derniere_mise_a_jour}
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Responsable du traitement</h2>
        <p style={{ color: "#374151", lineHeight: 1.7 }}>
          <strong>{policy?.responsable_traitement}</strong><br />
          07700 Saint Remèze<br />
          Email : <a href="mailto:mairie@saintremeze.fr" style={{ color: "#1a3a5a" }}>mairie@saintremeze.fr</a><br />
          DPO : <a href={`mailto:${policy?.contact_dpo}`} style={{ color: "#1a3a5a" }}>{policy?.contact_dpo}</a>
        </p>
      </section>

      {policy?.traitements && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Traitements de données</h2>
          {policy.traitements.map((t, i) => (
            <div key={i} style={{ background: "#f7f4ef", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8, color: "#1a3a5a" }}>{t.nom}</h3>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  {[
                    ["Finalité", t.finalite],
                    ["Base légale", t.base_legale],
                    ["Durée de conservation", t.duree_conservation],
                    ["Destinataires", t.destinataires],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ color: "#6b7280", paddingBottom: 4, paddingRight: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{k}</td>
                      <td style={{ color: "#374151", paddingBottom: 4 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {policy?.droits && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Vos droits</h2>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {policy.droits.map((d, i) => (
              <li key={i} style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        Pour exercer vos droits ou pour toute question relative à vos données personnelles, contactez notre DPO à{" "}
        <a href={`mailto:${policy?.contact_dpo}`} style={{ color: "#1a3a5a" }}>{policy?.contact_dpo}</a>.
      </p>
    </div>
  );
}
