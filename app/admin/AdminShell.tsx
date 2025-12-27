import React from "react";

const nav = [
  { href: "/admin/setup", label: "Setup" },
  { href: "/admin/brand", label: "Brand Kit" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/backups", label: "Backups" },
];

export default function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 950, letterSpacing: -0.5 }}>ChainChik Ops</div>
            <div style={{ color: "#666", fontSize: 13 }}>{title}</div>
          </div>
          <a href="/admin/logout" style={{ textDecoration: "none", color: "#111", border: "1px solid #ddd", padding: "8px 10px", borderRadius: 10 }}>
            Logout
          </a>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 14px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {nav.map((i) => (
            <a key={i.href} href={i.href} style={{ textDecoration: "none", color: "#111", border: "1px solid #eee", padding: "8px 10px", borderRadius: 999, background: "#fff" }}>
              {i.label}
            </a>
          ))}
        </div>
      </div>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 60px 16px" }}>{children}</main>
    </div>
  );
}
