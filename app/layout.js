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
          html { font-size: 18px; }
          body {
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            font-size: 18px;
            line-height: 1.85;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          button, input, select, textarea { font: inherit; min-height: 48px; }
          main { font-size: 18px; line-height: 1.85; }
          main p, main label { line-height: 1.9; }
          main table th, main table td { font-size: 16px; line-height: 1.8; }
          main small { font-size: 14px; }
          @media (max-width: 640px) {
            html { font-size: 17px; }
            body, main { font-size: 17px; line-height: 1.85; }
            button, input, select, textarea { font-size: 16px !important; min-height: 48px !important; }
            main table th, main table td { font-size: 15px; }
          }
        `}</style>
        {children}
        <BackupButton />
      </body>
    </html>
  );
}
