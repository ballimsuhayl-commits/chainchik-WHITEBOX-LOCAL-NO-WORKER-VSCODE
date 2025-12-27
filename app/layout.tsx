export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin:0, background:"#fbfbfc", color:"#111114", fontFamily:"system-ui", letterSpacing:"-0.01em" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 16px 64px" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
