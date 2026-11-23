import BackupButton from "./components/BackupButton";

export const metadata = {
  title: "Malak Beauty Salon",
  description: "نظام إدارة صالون ملك"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Arial" }}>
        {children}
        <BackupButton />
      </body>
    </html>
  );
}
