import type { Metadata } from "next";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/eb-garamond/400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Anatomy Atlas · versão educacional",
  description:
    "Atlas anatômico interativo com ressonância T1/T2, tomografias, estruturas 3D, quiz e roteiros guiados de neuroanatomia e anatomia regional.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
