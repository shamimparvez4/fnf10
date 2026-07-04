import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "FNF Chanda Fund Dashboard",
  description: "Monthly fund contribution tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
