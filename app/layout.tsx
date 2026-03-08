import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Playfair_Display,
  Outfit,
  DM_Sans,
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

export const metadata: Metadata = {
  title: {
    default: "Iuris Studio — Aprende Derecho Civil y Procesal Civil",
    template: "%s | Iuris Studio",
  },
  description:
    "Plataforma de estudio de Derecho Civil y Procesal Civil para estudiantes en Chile. Flashcards, preguntas, duelos y liga semanal.",
  keywords: [
    "derecho civil",
    "procesal civil",
    "examen de grado",
    "flashcards derecho",
    "chile",
    "iuris studio",
  ],
  metadataBase: new URL("https://lexamen.cl"),
  openGraph: {
    title: "Iuris Studio — Domina el Derecho Civil y Procesal Civil",
    description:
      "Flashcards, preguntas, duelos y más. La plataforma de estudio para estudiantes de Derecho en Chile.",
    url: "https://lexamen.cl",
    siteName: "Iuris Studio",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Iuris Studio — Domina el Derecho Civil y Procesal Civil",
    description:
      "Flashcards, preguntas, duelos y más. La plataforma de estudio para estudiantes de Derecho en Chile.",
  },
  icons: {
    icon: "/favicon.svg",
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
        className={`${cormorant.variable} ${playfair.variable} ${outfit.variable} ${dmSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
