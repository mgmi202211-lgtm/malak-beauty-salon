import BackupButton from "./components/BackupButton";

export const metadata = {
  title: "Malak Beauty Salon",
  description: "نظام إدارة صالون ملك"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif', fontSize: "18px", lineHeight: 1.8, WebkitFontSmoothing: "antialiased", textRendering: "optimizeLegibility" }}>
        <style>{`
          * { box-sizing: border-box; }
          html { font-size: 18px; }
          body {
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
            font-size: 18px;
            line-height: 1.8;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }

          /* توحيد وضوح الخطوط في جميع صفحات النظام */
          main { font-size: 18px !important; line-height: 1.8 !important; }
          main h1 { font-size: 32px !important; line-height: 1.45 !important; }
          main h2 { font-size: 26px !important; line-height: 1.5 !important; }
          main h3 { font-size: 22px !important; line-height: 1.55 !important; }
          main p, main label { font-size: 17px !important; line-height: 1.85 !important; }
          main button, main input, main select, main textarea {
            font-family: inherit !important;
            font-size: 17px !important;
            line-height: 1.5 !important;
            min-height: 48px !important;
          }
          main table th, main table td {
            font-size: 16px !important;
            line-height: 1.75 !important;
          }
          main small { font-size: 15px !important; }
          main a { line-height: 1.7; }

          button, input, select, textarea { font: inherit; }
          button { cursor: pointer; }

          @media (max-width: 640px) {
            html { font-size: 17px; }
            body, main { font-size: 17px !important; line-height: 1.8 !important; }
            main { padding-left: 14px !important; padding-right: 14px !important; }
            main h1 { font-size: 27px !important; }
            main h2 { font-size: 23px !important; }
            main h3 { font-size: 20px !important; }
            main p, main label { font-size: 16px !important; }
            main button, main input, main select, main textarea {
              font-size: 16px !important;
              min-height: 48px !important;
            }
            main table th, main table td { font-size: 15px !important; }
            main small { font-size: 14px !important; }
          }

          @media print {
            body { background: #fff !important; }
            main { max-width: 100% !important; }
          }
        `}</style>
        {children}
        <BackupButton />
      </body>
    </html>
  );
}
