import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import {
  Bricolage_Grotesque,
  Inter_Tight,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CanchaBGA Padel",
  description: "Reservas web para clubes de pádel en Bucaramanga.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${interTight.variable} ${bricolage.variable} ${jetBrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
