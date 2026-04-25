import { MastheadAcademia } from "@/components/academia/masthead-academia";
import { PeerReviewClient } from "./peer-review-client";

export const metadata = {
  title: "Peer Review — Studio Iuris",
  description:
    "Revisión entre pares de publicaciones académicas en el Diario de Studio Iuris.",
};

/**
 * Peer Review — pantalla de postulación. El cuerpo de revisores se
 * arma por postulación + aprobación de admin. El masthead se mantiene
 * coherente con el resto de Academia (Debates, Expediente, Ranking,
 * Eventos).
 */
export default function PeerReviewPage() {
  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <MastheadAcademia
        seccion="Peer Review"
        glyph="✠"
        subtitulo="Revisión entre pares de publicaciones académicas — antes de imprenta."
      />

      <PeerReviewClient />
    </main>
  );
}
