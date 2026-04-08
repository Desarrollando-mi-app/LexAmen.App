/**
 * Configuración global de la app.
 *
 * Cambiar estos flags para controlar features a nivel app-wide.
 */

/**
 * Cuando es `true`, muestra un banner superior en todo el dashboard
 * indicando a los usuarios que están en una versión beta.
 *
 * Cambiar a `false` al hacer el lanzamiento público.
 */
export const BETA_MODE = true;

/**
 * URL del formulario de reporte de bugs (Google Form, Typeform, etc.).
 * Si es `null`, el botón "Reportar bug" usa un `mailto:` como fallback.
 */
export const BETA_BUG_REPORT_URL: string | null = null;

/**
 * Email al que caen los reportes de bugs vía `mailto:` si no hay form URL.
 */
export const BETA_BUG_REPORT_EMAIL = "contacto@studioiuris.cl";
