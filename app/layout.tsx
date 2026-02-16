export const metadata = {
  title: "Spotify Premium Tracker",
  description: "Gestione pagamenti Spotify",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
          background: "#0b0b0c",
          color: "#f2f2f2",
        }}
      >
        {children}
      </body>
    </html>
  );
}
