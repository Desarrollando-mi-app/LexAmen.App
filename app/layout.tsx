import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "LéxAmen — Aprende Derecho Civil y Procesal Civil",
    template: "%s | LéxAmen",
  },
  description:
    "Plataforma de estudio de Derecho Civil y Procesal Civil para estudiantes en Chile. Flashcards, preguntas, duelos y liga semanal.",
  keywords: [
    "derecho civil",
    "procesal civil",
    "examen de grado",
    "flashcards derecho",
    "chile",
    "lexamen",
  ],
  metadataBase: new URL("https://lexamen.cl"),
  openGraph: {
    title: "LéxAmen — Domina el Derecho Civil y Procesal Civil",
    description:
      "Flashcards, preguntas, duelos y más. La plataforma de estudio para estudiantes de Derecho en Chile.",
    url: "https://lexamen.cl",
    siteName: "LéxAmen",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LéxAmen — Domina el Derecho Civil y Procesal Civil",
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
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
