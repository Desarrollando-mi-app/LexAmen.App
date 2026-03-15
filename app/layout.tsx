import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Playfair_Display,
  Outfit,
  DM_Sans,
  IBM_Plex_Mono,
  Archivo,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studio Iuris — Aprende Derecho Civil y Procesal Civil",
    template: "%s | Studio Iuris",
  },
  description:
    "Plataforma de estudio de Derecho Civil y Procesal Civil para estudiantes en Chile. Flashcards, preguntas, duelos y liga semanal.",
  keywords: [
    "derecho civil",
    "procesal civil",
    "examen de grado",
    "flashcards derecho",
    "chile",
    "studio iuris",
  ],
  metadataBase: new URL("https://lexamen.cl"),
  openGraph: {
    title: "Studio Iuris — Domina el Derecho Civil y Procesal Civil",
    description:
      "Flashcards, preguntas, duelos y más. La plataforma de estudio para estudiantes de Derecho en Chile.",
    url: "https://lexamen.cl",
    siteName: "Studio Iuris",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Iuris — Domina el Derecho Civil y Procesal Civil",
    description:
      "Flashcards, preguntas, duelos y más. La plataforma de estudio para estudiantes de Derecho en Chile.",
  },
  icons: {
    icon: "/brand/logo-sello.svg",
    apple: "/brand/logo-sello.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`,
          }}
        />
      </head>
      <body
        className={`${cormorant.variable} ${playfair.variable} ${outfit.variable} ${dmSans.variable} ${ibmPlexMono.variable} ${archivo.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
