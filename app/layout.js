import BackupButton from "./components/BackupButton";

export const metadata = {
  title: "Malak Beauty Salon",
  description: "نظام إدارة صالون ملك"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', fontSize: "18px", lineHeight: 1.7, WebkitFontSmoothing: "antialiased", textRendering: "optimizeLegibility" }}>
        <style>{`
          * { box-sizing: border-box; }
          html { font-size: 17px; }
          body { font-size: 18px; line-height: 1.7; }
          button, input, select, textarea { font: inherit; }
          button { min-height: 44px; }
          input, select, textarea { min-height: 44px; }
          @media (max-width: 640px) {
            html { font-size: 16px; }
            body { font-size: 17px; }
            button, input, select, textarea { font-size: 16px !important; }
          }
          @media (min-width: 641px) {
            body { font-size: 18px; }
          }
        `}</style>
        {children}
        <BackupButton />
      </body>
    </html>
  );
}
