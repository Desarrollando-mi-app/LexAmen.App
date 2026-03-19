// ═══ RANKING DE AUTORES ═══

export interface AutorStats {
  obiters: number;
  miniAnalisis: number;
  analisisCompletos: number;
  ensayos: number;
  argumentosExpediente: number;
  debatesParticipados: number;
  debatesGanados: number;
  apoyosRecibidos: number;
  citasRecibidas: number;
  mejorAnalisisSemana: number;
  mejorAlegatoExpediente: number;
  reviewsCompletados: number;
}

export function calcularScoreAutor(stats: AutorStats): number {
  return (
    stats.obiters * 1 +
    stats.miniAnalisis * 3 +
    stats.analisisCompletos * 5 +
    stats.ensayos * 8 +
    stats.argumentosExpediente * 2 +
    stats.debatesParticipados * 5 +
    stats.debatesGanados * 10 +
    stats.apoyosRecibidos * 0.5 +
    stats.citasRecibidas * 2 +
    stats.mejorAnalisisSemana * 15 +
    stats.mejorAlegatoExpediente * 15 +
    stats.reviewsCompletados * 1
  );
}
