import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

const NAVY = "#1a3a5a";
const GOLD = "#c9a84c";

/* Décale l'ancrage sous le bandeau sticky (60px) lors d'un clic sur un lien du sommaire */
const headingStyle = { scrollMarginTop: 76, color: NAVY };

const components = {
  h1: ({ children }) => <h1 style={{ ...headingStyle, fontSize: 26, marginBottom: 8 }}>{children}</h1>,
  h2: ({ children }) => (
    <h2 style={{ ...headingStyle, fontSize: 20, marginTop: 40, marginBottom: 14, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 style={{ ...headingStyle, fontSize: 16, marginTop: 26, marginBottom: 10 }}>{children}</h3>,
  h4: ({ children }) => <h4 style={{ ...headingStyle, fontSize: 14, marginTop: 20, marginBottom: 8, color: "#374151" }}>{children}</h4>,
  p: ({ children }) => <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 14, marginBottom: 14 }}>{children}</p>,
  a: ({ href, children }) => (
    <a href={href} style={{ color: NAVY, textDecoration: "underline", textDecorationColor: "#c9d3dc" }}>
      {children}
    </a>
  ),
  ul: ({ children }) => <ul style={{ paddingLeft: 22, marginBottom: 14, color: "#374151", fontSize: 14, lineHeight: 1.8 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 22, marginBottom: 14, color: "#374151", fontSize: 14, lineHeight: 1.8 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: `3px solid ${GOLD}`, margin: "16px 0", padding: "4px 16px",
      color: "#6b7280", fontSize: 13.5, fontStyle: "italic", background: "#f7f4ef", borderRadius: "0 8px 8px 0",
    }}>
      {children}
    </blockquote>
  ),
  hr: () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "28px 0" }} />,
  code: ({ className, children }) => {
    // react-markdown v10 ne fournit plus de flag "inline" : on distingue via le contenu
    // (le code inline ne peut jamais contenir de saut de ligne, contrairement aux blocs).
    const isBlock = Boolean(className) || String(children).includes("\n");
    return isBlock ? (
      <code className={className} style={{ fontFamily: "monospace", fontSize: 12.5 }}>{children}</code>
    ) : (
      <code style={{ background: "#f3f4f6", color: "#b91c1c", padding: "1px 6px", borderRadius: 4, fontSize: 12.5, fontFamily: "monospace" }}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre style={{
      background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14,
      overflowX: "auto", marginBottom: 16, lineHeight: 1.6,
    }}>
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "#f0f4f8" }}>{children}</thead>,
  th: ({ children }) => (
    <th style={{ textAlign: "left", padding: "8px 12px", color: NAVY, fontWeight: 600, borderBottom: `2px solid ${GOLD}` }}>
      {children}
    </th>
  ),
  td: ({ children }) => <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#374151" }}>{children}</td>,
  strong: ({ children }) => <strong style={{ color: "#1f2937" }}>{children}</strong>,
};

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Retour en haut"
      title="Retour en haut"
      style={{
        position: "fixed", bottom: 76, right: 20, zIndex: 90,
        width: 42, height: 42, borderRadius: "50%", border: "none",
        background: NAVY, color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,.25)",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}

export default function AdminManualPage() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/manuel-admin.md")
      .then((res) => { if (!res.ok) throw new Error(); return res.text(); })
      .then(setContent)
      .catch(() => setError(true));
  }, []);

  return (
    <div style={{ padding: "32px 20px 100px", maxWidth: 860, margin: "0 auto" }} className="animate-fadein">
      {error && <p style={{ color: "#b91c1c" }}>Impossible de charger le manuel administrateur.</p>}
      {!content && !error && <p style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Chargement…</p>}
      {content && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
          {content}
        </ReactMarkdown>
      )}
      <BackToTop />
    </div>
  );
}
