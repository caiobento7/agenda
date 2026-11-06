import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const fonte = Inter({ subsets: ["latin"], variable: "--fonte" });

export const metadata: Metadata = {
  title: { default: "Agenda | Agendamento online com sinal via Pix", template: "%s | Agenda" },
  description:
    "Página de agendamento para barbearias, estúdios e personal trainers: o cliente escolhe o horário e garante com um sinal via Pix.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
