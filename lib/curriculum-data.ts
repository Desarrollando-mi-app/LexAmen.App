/**
 * Índice Maestro del Curriculum — Studio Iuris
 * Estructura jerárquica: Rama → Código → Libro → Título → Párrafo
 * Basado en el Código Civil y Código de Procedimiento Civil de Chile.
 *
 * Fuentes oficiales:
 * - Código Civil de Chile (índice oficial)
 * - Código de Procedimiento Civil de Chile (índice oficial)
 * - Leyes complementarias vinculadas a cada libro/título
 */

export interface LeyAnexa {
  ley: string;
  label: string;
  /** Identificador único para la ley (nuevo, opcional para backward compat) */
  id?: string;
  /** Nombre corto para UI compacta */
  nombreCorto?: string;
}

export interface TituloNode {
  id: string;
  label: string;
  articulosRef?: string;
  parrafos?: string[];
  leyesAnexas?: LeyAnexa[];
}

export interface SeccionNode {
  id: string;
  libro: string;
  label: string;
  titulos: TituloNode[];
  leyesAnexas?: LeyAnexa[];
}

export interface RamaNode {
  label: string;
  codigo: string;
  secciones: SeccionNode[];
  /** Leyes complementarias a nivel de rama (aplican a toda la materia) */
  leyesAnexasRama?: LeyAnexa[];
}

export type CurriculumTree = Record<string, RamaNode>;

export const CURRICULUM: CurriculumTree = {
  // ═══════════════════════════════════════════════════════════════
  // DERECHO CIVIL — Código Civil de Chile
  // ═══════════════════════════════════════════════════════════════
  DERECHO_CIVIL: {
    label: "Derecho Civil",
    codigo: "CODIGO_CIVIL",
    secciones: [
      // ─── Mensaje ───────────────────────────────────────────
      {
        id: "MENSAJE",
        libro: "MENSAJE",
        label: "Mensaje del Código Civil",
        titulos: [
          {
            id: "MENSAJE_BELLO",
            label: "Andrés Bello al Congreso Nacional",
            parrafos: [
              "Contexto histórico",
              "Necesidad de la codificación",
              "Fuentes del Código",
            ],
          },
        ],
      },

      // ─── Título Preliminar (Arts. 1–53) ────────────────────
      {
        id: "TITULO_PRELIMINAR",
        libro: "TITULO_PRELIMINAR",
        label: "Título Preliminar (Arts. 1–53)",
        titulos: [
          {
            id: "TP_1",
            label: "§1. De la Ley",
            articulosRef: "Arts. 1–5",
          },
          {
            id: "TP_2",
            label: "§2. Promulgación de la Ley",
            articulosRef: "Arts. 6–8",
          },
          {
            id: "TP_3",
            label: "§3. Efectos de la Ley",
            articulosRef: "Arts. 9–18",
          },
          {
            id: "TP_4",
            label: "§4. Interpretación de la Ley",
            articulosRef: "Arts. 19–24",
          },
          {
            id: "TP_5",
            label: "§5. Definición de varias palabras de uso frecuente en las leyes",
            articulosRef: "Arts. 25–51",
          },
          {
            id: "TP_6",
            label: "§6. Derogación de las leyes",
            articulosRef: "Arts. 52–53",
          },
        ],
        leyesAnexas: [
          {
            id: "ley_efecto_retroactivo",
            ley: "Ley Efecto Retroactivo",
            label: "Ley sobre el Efecto Retroactivo de las Leyes (1861)",
            nombreCorto: "Ley Efecto Retroactivo",
          },
        ],
      },

      // ─── Libro Primero: De las Personas (Arts. 54–564) ─────
      {
        id: "LIBRO_I",
        libro: "LIBRO_I",
        label: "Libro Primero: De las Personas (Arts. 54–564)",
        leyesAnexas: [
          { id: "ley_4808", ley: "Ley 4.808", label: "Ley de Registro Civil", nombreCorto: "Ley Registro Civil" },
          { id: "ley_17344", ley: "Ley 17.344", label: "Cambio de Nombres y Apellidos", nombreCorto: "Ley Cambio Nombres" },
          { id: "ley_19947", ley: "Ley 19.947", label: "Nueva Ley de Matrimonio Civil", nombreCorto: "Ley de Matrimonio Civil" },
          { id: "ley_20830", ley: "Ley 20.830", label: "Acuerdo de Unión Civil", nombreCorto: "AUC" },
          { id: "ley_19620", ley: "Ley 19.620", label: "Adopción de Menores", nombreCorto: "Ley de Adopción" },
        ],
        titulos: [
          {
            id: "LI_T1",
            label: "Título I: De las personas, en cuanto a su nombre, nacionalidad y domicilio",
            parrafos: [
              "1. División de las personas",
              "2. Nombre de las personas",
              "3. Del domicilio en cuanto depende de la residencia y del ánimo de permanecer en ella",
              "4. Del domicilio en cuanto depende de la condición o estado civil de la persona",
            ],
          },
          {
            id: "LI_T2",
            label: "Título II: Del principio y fin de la existencia de las personas",
            parrafos: [
              "1. Del principio de la existencia de las personas",
              "2. Del fin de la existencia de las personas",
              "3. De la presunción de muerte por desaparecimiento",
              "4. De la comprobación judicial de la muerte",
            ],
          },
          {
            id: "LI_T3",
            label: "Título III: De los esponsales",
          },
          {
            id: "LI_T4",
            label: "Título IV: Del matrimonio",
            leyesAnexas: [
              { ley: "Ley 19.947", label: "Ley de Matrimonio Civil" },
              { ley: "Ley 20.830", label: "Acuerdo de Unión Civil" },
              { ley: "Ley 21.400", label: "Matrimonio igualitario" },
            ],
          },
          {
            id: "LI_T5",
            label: "Título V: De las segundas nupcias",
          },
          {
            id: "LI_T6",
            label: "Título VI: Obligaciones y derechos entre los cónyuges",
            parrafos: [
              "1. Reglas generales",
              "2. De los bienes familiares",
              "3. Excepciones relativas a la profesión u oficio de la mujer",
              "4. Excepciones relativas a la separación de bienes",
              "5. Excepciones relativas a la separación judicial",
            ],
          },
          {
            id: "LI_T7",
            label: "Título VII: De la filiación",
            parrafos: [
              "1. Reglas generales",
              "2. De la determinación de la maternidad",
              "3. De la determinación de la filiación matrimonial",
              "4. De la determinación de la filiación no matrimonial",
            ],
            leyesAnexas: [{ ley: "Ley 19.585", label: "Filiación" }],
          },
          {
            id: "LI_T8",
            label: "Título VIII: De las acciones de filiación",
            parrafos: [
              "1. Reglas generales",
              "2. De las acciones de reclamación",
              "3. De las acciones de impugnación",
            ],
          },
          {
            id: "LI_T9",
            label: "Título IX: De los derechos y obligaciones entre los padres y los hijos",
          },
          {
            id: "LI_T10",
            label: "Título X: De la patria potestad",
            parrafos: [
              "1. Reglas generales",
              "2. Del derecho legal de goce sobre los bienes de los hijos y de su administración",
              "3. De la representación legal de los hijos",
              "4. De la suspensión de la patria potestad",
              "5. De la emancipación",
            ],
          },
          {
            id: "LI_T16",
            label: "Título XVI: De la habilitación de edad",
          },
          {
            id: "LI_T17",
            label: "Título XVII: De las pruebas del estado civil",
          },
          {
            id: "LI_T18",
            label: "Título XVIII: De los alimentos que se deben por ley a ciertas personas",
            leyesAnexas: [
              { ley: "Ley 14.908", label: "Abandono de familia y pago de pensiones" },
            ],
          },
          {
            id: "LI_T19",
            label: "Título XIX: De las tutelas y curadurías en general",
            parrafos: [
              "1. Definiciones y reglas generales",
              "2. De la tutela o curaduría testamentaria",
              "3. De la tutela o curaduría legítima",
              "4. De la tutela o curaduría dativa",
            ],
          },
          {
            id: "LI_T20",
            label: "Título XX: De las diligencias y formalidades que deben preceder al ejercicio de la tutela o curaduría",
          },
          {
            id: "LI_T21",
            label: "Título XXI: De la administración de los tutores y curadores relativamente a los bienes",
          },
          {
            id: "LI_T22",
            label: "Título XXII: Reglas especiales relativas a la tutela",
          },
          {
            id: "LI_T23",
            label: "Título XXIII: Reglas especiales relativas a la curaduría del menor",
          },
          {
            id: "LI_T24",
            label: "Título XXIV: Reglas especiales relativas a la curaduría del disipador",
          },
          {
            id: "LI_T25",
            label: "Título XXV: Reglas especiales relativas a la curaduría del demente",
          },
          {
            id: "LI_T26",
            label: "Título XXVI: Reglas especiales relativas a la curaduría del sordo o sordomudo",
          },
          {
            id: "LI_T27",
            label: "Título XXVII: De las curadurías de bienes",
          },
          {
            id: "LI_T28",
            label: "Título XXVIII: De los curadores adjuntos",
          },
          {
            id: "LI_T29",
            label: "Título XXIX: De los curadores especiales",
          },
          {
            id: "LI_T30",
            label: "Título XXX: De las incapacidades y excusas para la tutela o curaduría",
            parrafos: [
              "1. De las incapacidades",
              "2. De las excusas",
              "3. Reglas comunes a las incapacidades y a las excusas",
            ],
          },
          {
            id: "LI_T31",
            label: "Título XXXI: De la remuneración de los tutores y curadores",
          },
          {
            id: "LI_T32",
            label: "Título XXXII: De la remoción de los tutores y curadores",
          },
          {
            id: "LI_T33",
            label: "Título XXXIII: De las personas jurídicas",
            parrafos: [
              "Corporaciones y fundaciones",
              "Reglas especiales",
            ],
            leyesAnexas: [
              { ley: "Ley 20.500", label: "Asociaciones y participación ciudadana" },
            ],
          },
        ],
      },

      // ─── Libro Segundo: De los Bienes (Arts. 565–950) ──────
      {
        id: "LIBRO_II",
        libro: "LIBRO_II",
        label: "Libro Segundo: De los Bienes, y de su Dominio, Posesión, Uso y Goce (Arts. 565–950)",
        leyesAnexas: [
          {
            id: "reglamento_cbr",
            ley: "Reglamento CBR",
            label: "Reglamento del Registro Conservatorio de Bienes Raíces (1857)",
            nombreCorto: "Regl. Conservador de Bienes Raíces",
          },
        ],
        titulos: [
          {
            id: "LII_T1",
            label: "Título I: De las varias clases de bienes",
            parrafos: [
              "1. De las cosas corporales",
              "2. De las cosas incorporales",
            ],
          },
          {
            id: "LII_T2",
            label: "Título II: Del dominio",
            parrafos: [
              "Definición y facultades",
              "Copropiedad",
              "Propiedad fiduciaria",
            ],
            leyesAnexas: [
              { ley: "Ley 19.537", label: "Copropiedad inmobiliaria" },
            ],
          },
          {
            id: "LII_T3",
            label: "Título III: De los bienes nacionales",
          },
          {
            id: "LII_T4",
            label: "Título IV: De la ocupación",
          },
          {
            id: "LII_T5",
            label: "Título V: De la accesión",
            parrafos: [
              "1. De las accesiones de frutos",
              "2. De las accesiones del suelo",
              "3. De la accesión de una cosa mueble a otra",
              "4. De la accesión de las cosas muebles a inmuebles",
            ],
          },
          {
            id: "LII_T6",
            label: "Título VI: De la tradición",
            parrafos: [
              "1. Disposiciones generales",
              "2. De la tradición de las cosas corporales muebles",
              "3. De las otras especies de tradición",
            ],
          },
          {
            id: "LII_T7",
            label: "Título VII: De la posesión",
            parrafos: [
              "1. De la posesión y sus diferentes calidades",
              "2. De los modos de adquirir y perder la posesión",
            ],
            leyesAnexas: [
              { ley: "DL 2.695", label: "Regularización pequeña propiedad raíz" },
            ],
          },
          {
            id: "LII_T8",
            label: "Título VIII: De las limitaciones del dominio y primeramente de la propiedad fiduciaria",
          },
          {
            id: "LII_T9",
            label: "Título IX: Del derecho de usufructo",
          },
          {
            id: "LII_T10",
            label: "Título X: De los derechos de uso y de habitación",
          },
          {
            id: "LII_T11",
            label: "Título XI: De las servidumbres",
            parrafos: [
              "1. De las servidumbres naturales",
              "2. De las servidumbres legales",
              "3. De las servidumbres voluntarias",
              "4. De la extinción de las servidumbres",
            ],
          },
          {
            id: "LII_T12",
            label: "Título XII: De la reivindicación",
            parrafos: [
              "1. Qué cosas pueden reivindicarse",
              "2. Quién puede reivindicar",
              "3. Contra quién se puede reivindicar",
              "4. Prestaciones mutuas",
            ],
          },
          {
            id: "LII_T13",
            label: "Título XIII: De las acciones posesorias",
          },
          {
            id: "LII_T14",
            label: "Título XIV: De algunas acciones posesorias especiales",
          },
        ],
      },

      // ─── Libro Tercero: De la Sucesión (Arts. 951–1436) ────
      {
        id: "LIBRO_III",
        libro: "LIBRO_III",
        label: "Libro Tercero: De la Sucesión por Causa de Muerte, y de las Donaciones entre Vivos (Arts. 951–1436)",
        titulos: [
          {
            id: "LIII_T1",
            label: "Título I: Definiciones y reglas generales",
          },
          {
            id: "LIII_T2",
            label: "Título II: Reglas relativas a la sucesión intestada",
            parrafos: [
              "Órdenes de sucesión",
              "Representación",
              "Acrecimiento",
            ],
          },
          {
            id: "LIII_T3",
            label: "Título III: De la ordenación del testamento",
            parrafos: [
              "1. Del testamento en general",
              "2. Del testamento solemne y primeramente del otorgado en Chile",
              "3. Del testamento solemne otorgado en país extranjero",
              "4. De los testamentos privilegiados",
            ],
          },
          {
            id: "LIII_T4",
            label: "Título IV: De las asignaciones testamentarias",
            parrafos: [
              "1. Reglas generales",
              "2. De las asignaciones testamentarias condicionales",
              "3. De las asignaciones testamentarias a día",
              "4. De las asignaciones modales",
              "5. De las asignaciones a título universal",
              "6. De las asignaciones a título singular",
              "7. De las donaciones revocables",
              "8. Del derecho de acrecer",
              "9. De las sustituciones",
            ],
          },
          {
            id: "LIII_T5",
            label: "Título V: De las asignaciones forzosas",
            parrafos: [
              "1. De las asignaciones alimenticias que se deben a ciertas personas",
              "2. De la porción conyugal",
              "3. De las legítimas y mejoras",
              "4. De los desheredamientos",
            ],
          },
          {
            id: "LIII_T6",
            label: "Título VI: De la revocación y reforma del testamento",
            parrafos: [
              "1. De la revocación del testamento",
              "2. De la reforma del testamento",
            ],
          },
          {
            id: "LIII_T7",
            label: "Título VII: De la apertura de la sucesión y de su aceptación, repudiación e inventario",
            parrafos: [
              "1. Reglas generales",
              "2. Reglas particulares relativas a las herencias",
              "3. Del beneficio de inventario",
              "4. De la petición de herencia y de otras acciones del heredero",
            ],
          },
          {
            id: "LIII_T8",
            label: "Título VIII: De los ejecutores testamentarios",
          },
          {
            id: "LIII_T9",
            label: "Título IX: De los albaceas fiduciarios",
          },
          {
            id: "LIII_T10",
            label: "Título X: De la partición de los bienes",
            parrafos: ["Reglas generales", "Del juicio de partición"],
            leyesAnexas: [
              { ley: "Ley 16.271", label: "Impuesto a las herencias" },
            ],
          },
          {
            id: "LIII_T11",
            label: "Título XI: Del pago de las deudas hereditarias y testamentarias",
          },
          {
            id: "LIII_T12",
            label: "Título XII: Del beneficio de separación",
          },
          {
            id: "LIII_T13",
            label: "Título XIII: De las donaciones entre vivos",
          },
        ],
      },

      // ─── Libro Cuarto: Obligaciones y Contratos (Arts. 1437–2524) ───
      {
        id: "LIBRO_IV",
        libro: "LIBRO_IV",
        label: "Libro Cuarto: De las Obligaciones en General y de los Contratos (Arts. 1437–2524)",
        leyesAnexas: [
          { id: "dl_993", ley: "DL 993", label: "Arrendamiento de Predios Rústicos", nombreCorto: "DL Arriendo Rústicos" },
          { id: "ley_18101", ley: "Ley 18.101", label: "Arrendamiento de Predios Urbanos", nombreCorto: "Ley Arriendo Urbanos" },
          { id: "ley_18010", ley: "Ley 18.010", label: "Operaciones de Crédito", nombreCorto: "Ley Op. Crédito" },
        ],
        titulos: [
          {
            id: "LIV_T1",
            label: "Título I: Definiciones",
          },
          {
            id: "LIV_T2",
            label: "Título II: De los actos y declaraciones de voluntad",
            parrafos: [
              "Del acto jurídico",
              "De la capacidad",
              "Del objeto",
              "De la causa",
              "De las formalidades",
            ],
          },
          {
            id: "LIV_T3",
            label: "Título III: De las obligaciones civiles y de las meramente naturales",
          },
          {
            id: "LIV_T4",
            label: "Título IV: De las obligaciones condicionales y modales",
          },
          {
            id: "LIV_T5",
            label: "Título V: De las obligaciones a plazo",
          },
          {
            id: "LIV_T6",
            label: "Título VI: De las obligaciones alternativas",
          },
          {
            id: "LIV_T7",
            label: "Título VII: De las obligaciones facultativas",
          },
          {
            id: "LIV_T8",
            label: "Título VIII: De las obligaciones de género",
          },
          {
            id: "LIV_T9",
            label: "Título IX: De las obligaciones solidarias",
          },
          {
            id: "LIV_T10",
            label: "Título X: De las obligaciones divisibles e indivisibles",
          },
          {
            id: "LIV_T11",
            label: "Título XI: De las obligaciones con cláusula penal",
          },
          {
            id: "LIV_T12",
            label: "Título XII: Del efecto de las obligaciones",
            parrafos: [
              "Cumplimiento forzado",
              "Indemnización de perjuicios",
              "Derechos auxiliares del acreedor",
            ],
          },
          {
            id: "LIV_T13",
            label: "Título XIII: De la interpretación de los contratos",
          },
          {
            id: "LIV_T14",
            label: "Título XIV: De los modos de extinguirse las obligaciones, y primeramente de la solución o pago efectivo",
            parrafos: [
              "1. Del pago efectivo en general",
              "2. Por quién puede hacerse el pago",
              "3. A quién debe hacerse el pago",
              "4. Dónde debe hacerse el pago",
              "5. Cómo debe hacerse el pago",
              "6. De la imputación del pago",
              "7. Del pago por consignación",
              "8. Del pago con subrogación",
              "9. Del pago por cesión de bienes o por acción ejecutiva",
              "10. Del pago con beneficio de competencia",
            ],
          },
          {
            id: "LIV_T15",
            label: "Título XV: De la novación",
          },
          {
            id: "LIV_T16",
            label: "Título XVI: De la remisión",
          },
          {
            id: "LIV_T17",
            label: "Título XVII: De la compensación",
          },
          {
            id: "LIV_T18",
            label: "Título XVIII: De la confusión",
          },
          {
            id: "LIV_T19",
            label: "Título XIX: De la pérdida de la cosa que se debe",
          },
          {
            id: "LIV_T20",
            label: "Título XX: De la nulidad y la rescisión",
          },
          {
            id: "LIV_T21",
            label: "Título XXI: De la prueba de las obligaciones",
          },
          {
            id: "LIV_T22",
            label: "Título XXII: De las convenciones matrimoniales y de la sociedad conyugal",
            parrafos: [
              "1. Reglas generales",
              "2. Del haber de la sociedad conyugal y de sus cargas",
              "3. De la administración ordinaria de los bienes de la sociedad conyugal",
              "4. De la administración extraordinaria de la sociedad conyugal",
              "5. De la disolución de la sociedad conyugal y partición de gananciales",
              "6. De la renuncia de los gananciales",
              "7. De la dote y de las donaciones por causa de matrimonio",
            ],
          },
          {
            id: "LIV_T22A",
            label: "Título XXII-A: Régimen de la participación en los gananciales",
            parrafos: [
              "1. Reglas generales",
              "2. De la administración del patrimonio de los cónyuges",
              "3. De la determinación y cálculo de los gananciales",
              "4. Del crédito de participación en los gananciales",
              "5. Del término del régimen de participación en los gananciales",
            ],
          },
          {
            id: "LIV_T23",
            label: "Título XXIII: De la compraventa",
            parrafos: [
              "1. De la capacidad para el contrato de venta",
              "2. Forma y requisitos del contrato de venta",
              "3. Del precio",
              "4. De la cosa vendida",
              "5. De los efectos inmediatos del contrato de venta",
              "6. De las obligaciones del vendedor y de la obligación de entregar",
              "7. Del saneamiento por evicción",
              "8. Del saneamiento por vicios redhibitorios",
              "9. De las obligaciones del comprador",
              "10. Del pacto comisorio",
              "11. Del pacto de retroventa",
              "12. De otros pactos accesorios al contrato de venta",
              "13. De la rescisión de la venta por lesión enorme",
            ],
          },
          {
            id: "LIV_T24",
            label: "Título XXIV: De la permutación",
          },
          {
            id: "LIV_T25",
            label: "Título XXV: De la cesión de derechos",
            parrafos: [
              "1. De los créditos personales",
              "2. Del derecho de herencia",
              "3. De los derechos litigiosos",
            ],
          },
          {
            id: "LIV_T26",
            label: "Título XXVI: Del contrato de arrendamiento",
            parrafos: [
              "1. Del arrendamiento de cosas",
              "2. De las obligaciones del arrendador",
              "3. De las obligaciones del arrendatario",
              "4. De la expiración del arrendamiento de cosas",
              "5. Reglas particulares relativas al arrendamiento de casas y edificios",
              "6. Reglas particulares relativas al arrendamiento de predios rústicos",
              "7. Del arrendamiento de criados domésticos",
              "8. De los contratos para la confección de una obra material",
              "9. Del arrendamiento de servicios inmateriales",
              "10. Del arrendamiento de transporte",
            ],
          },
          {
            id: "LIV_T27",
            label: "Título XXVII: De la constitución de censo",
          },
          {
            id: "LIV_T28",
            label: "Título XXVIII: De la sociedad",
            parrafos: [
              "1. Reglas generales",
              "2. De las diferentes especies de sociedad",
              "3. De las principales cláusulas del contrato de sociedad",
              "4. De la administración de la sociedad colectiva",
              "5. De las obligaciones de los socios entre sí",
              "6. De las obligaciones de los socios respecto de terceros",
              "7. De la disolución de la sociedad",
            ],
          },
          {
            id: "LIV_T29",
            label: "Título XXIX: Del mandato",
            parrafos: [
              "1. Definiciones y reglas generales",
              "2. De la administración del mandato",
              "3. De las obligaciones del mandante",
              "4. De la terminación del mandato",
            ],
          },
          {
            id: "LIV_T30",
            label: "Título XXX: Del comodato o préstamo de uso",
          },
          {
            id: "LIV_T31",
            label: "Título XXXI: Del mutuo o préstamo de consumo",
          },
          {
            id: "LIV_T32",
            label: "Título XXXII: Del depósito y del secuestro",
            parrafos: [
              "1. Del depósito propiamente dicho",
              "2. Del depósito necesario",
              "3. Del secuestro",
            ],
          },
          {
            id: "LIV_T33",
            label: "Título XXXIII: De los contratos aleatorios",
            parrafos: [
              "1. Del juego y de la apuesta",
              "2. De la constitución de renta vitalicia",
              "3. De la constitución del censo vitalicio",
            ],
          },
          {
            id: "LIV_T34",
            label: "Título XXXIV: De los cuasicontratos",
            parrafos: [
              "1. De la agencia oficiosa o gestión de negocios ajenos",
              "2. Del pago de lo no debido",
              "3. Del cuasicontrato de comunidad",
            ],
          },
          {
            id: "LIV_T35",
            label: "Título XXXV: De los delitos y cuasidelitos",
          },
          {
            id: "LIV_T36",
            label: "Título XXXVI: De la fianza",
            parrafos: [
              "1. De la constitución y requisitos de la fianza",
              "2. De los efectos de la fianza entre el acreedor y el fiador",
              "3. De los efectos de la fianza entre el fiador y el deudor",
              "4. De los efectos de la fianza entre los cofiadores",
              "5. De la extinción de la fianza",
            ],
          },
          {
            id: "LIV_T37",
            label: "Título XXXVII: Del contrato de prenda",
          },
          {
            id: "LIV_T38",
            label: "Título XXXVIII: De la hipoteca",
          },
          {
            id: "LIV_T39",
            label: "Título XXXIX: De la anticresis",
          },
          {
            id: "LIV_T40",
            label: "Título XL: De la transacción",
          },
          {
            id: "LIV_T41",
            label: "Título XLI: De la prelación de créditos",
          },
          {
            id: "LIV_T42",
            label: "Título XLII: De la prescripción",
            parrafos: [
              "1. De la prescripción en general",
              "2. De la prescripción con que se adquieren las cosas",
              "3. De la prescripción como medio de extinguir las acciones judiciales",
              "4. De ciertas acciones que prescriben en corto tiempo",
            ],
          },
          {
            id: "LIV_TFINAL",
            label: "Título Final: De la observancia de este Código",
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DERECHO PROCESAL CIVIL — Código de Procedimiento Civil
  // ═══════════════════════════════════════════════════════════════
  DERECHO_PROCESAL_CIVIL: {
    label: "Derecho Procesal Civil",
    codigo: "CODIGO_PROCEDIMIENTO_CIVIL",
    leyesAnexasRama: [
      { id: "ley_18120", ley: "Ley 18.120", label: "Comparecencia en Juicio", nombreCorto: "Ley Comparecencia" },
      { id: "ley_14908", ley: "Ley 14.908", label: "Abandono de Familia y Pago de Pensiones Alimenticias", nombreCorto: "Ley Pensiones" },
      { id: "decreto_23", ley: "Decreto 23", label: "Convención sobre Obtención de Alimentos en el Extranjero", nombreCorto: "Conv. Alimentos Extranjero" },
      { id: "aa_proteccion", ley: "Auto Acordado", label: "Recurso de Protección", nombreCorto: "AA Recurso Protección" },
      { id: "aa_sentencias", ley: "Auto Acordado", label: "Forma de las Sentencias", nombreCorto: "AA Forma Sentencias" },
      { id: "aa_vista", ley: "Auto Acordado", label: "Vista de la Causa", nombreCorto: "AA Vista de la Causa" },
      { id: "ley_20886", ley: "Ley 20.886", label: "Tramitación Digital", nombreCorto: "Ley Tramitación Digital" },
      { id: "ley_21226", ley: "Ley 21.226", label: "Régimen Jurídico Excepción COVID-19", nombreCorto: "Ley Excepción COVID" },
      { id: "acta_263", ley: "Acta 263-2021", label: "Acta Nº 263-2021", nombreCorto: "Acta 263-2021" },
      { id: "regl_escrituras", ley: "Reglamento", label: "Escrituras Públicas Electrónicas", nombreCorto: "Regl. Escrituras Electrónicas" },
    ],
    secciones: [
      // ─── Libro I: Disposiciones Comunes ────────────────────
      {
        id: "LIBRO_I_CPC",
        libro: "LIBRO_I_CPC",
        label: "Libro Primero: Disposiciones Comunes a Todo Procedimiento",
        titulos: [
          { id: "CPC_LI_T1", label: "Título I: Reglas generales" },
          {
            id: "CPC_LI_T2",
            label: "Título II: De la comparecencia en juicio",
            leyesAnexas: [
              { ley: "Ley 18.120", label: "Comparecencia en juicio" },
            ],
          },
          { id: "CPC_LI_T3", label: "Título III: De la pluralidad de acciones o de partes" },
          { id: "CPC_LI_T4", label: "Título IV: De las cargas pecuniarias a que están sujetos los litigantes" },
          { id: "CPC_LI_T5", label: "Título V: De la formación del proceso, de su custodia y de su comunicación a las partes" },
          { id: "CPC_LI_T6", label: "Título VI: De las notificaciones" },
          { id: "CPC_LI_T7", label: "Título VII: De las actuaciones judiciales" },
          { id: "CPC_LI_T7B", label: "Título VII bis: De la comparecencia voluntaria en audiencias por medios remotos" },
          { id: "CPC_LI_T8", label: "Título VIII: De las rebeldías" },
          { id: "CPC_LI_T9", label: "Título IX: De los incidentes" },
          { id: "CPC_LI_T10", label: "Título X: De la acumulación de autos" },
          {
            id: "CPC_LI_T11",
            label: "Título XI: De las cuestiones de competencia",
            leyesAnexas: [
              { ley: "COT", label: "Código Orgánico de Tribunales" },
            ],
          },
          { id: "CPC_LI_T12", label: "Título XII: De las implicancias y recusaciones" },
          { id: "CPC_LI_T13", label: "Título XIII: Del privilegio de pobreza" },
          { id: "CPC_LI_T14", label: "Título XIV: De las costas" },
          { id: "CPC_LI_T15", label: "Título XV: Del desistimiento de la demanda" },
          { id: "CPC_LI_T16", label: "Título XVI: Del abandono del procedimiento" },
          { id: "CPC_LI_T17", label: "Título XVII: De las resoluciones judiciales" },
          { id: "CPC_LI_T18", label: "Título XVIII: De la apelación" },
          {
            id: "CPC_LI_T19",
            label: "Título XIX: De la ejecución de las resoluciones",
            parrafos: [
              "1. De las resoluciones pronunciadas por tribunales chilenos",
              "2. De las resoluciones pronunciadas por tribunales extranjeros",
            ],
          },
          { id: "CPC_LI_T20", label: "Título XX: De las multas" },
        ],
      },

      // ─── Libro II: Del Juicio Ordinario ────────────────────
      {
        id: "LIBRO_II_CPC",
        libro: "LIBRO_II_CPC",
        label: "Libro Segundo: Del Juicio Ordinario",
        titulos: [
          { id: "CPC_LII_T1", label: "Título I: De la demanda" },
          { id: "CPC_LII_T2", label: "Título II: De la conciliación" },
          { id: "CPC_LII_T3", label: "Título III: De la jactancia" },
          { id: "CPC_LII_T4", label: "Título IV: De las medidas prejudiciales" },
          { id: "CPC_LII_T5", label: "Título V: De las medidas precautorias" },
          { id: "CPC_LII_T6", label: "Título VI: De las excepciones dilatorias" },
          { id: "CPC_LII_T7", label: "Título VII: De la contestación y demás trámites hasta el estado de prueba o de sentencia" },
          { id: "CPC_LII_T8", label: "Título VIII: De la reconvención" },
          { id: "CPC_LII_T9", label: "Título IX: De la prueba en general" },
          { id: "CPC_LII_T10", label: "Título X: Del término probatorio" },
          {
            id: "CPC_LII_T11",
            label: "Título XI: De los medios de prueba en particular",
            parrafos: [
              "1. Disposiciones generales",
              "2. De los instrumentos",
              "3. De los testigos y de las tachas",
              "4. De la confesión en juicio",
              "5. De la inspección personal del tribunal",
              "6. Del informe de peritos",
              "7. De las presunciones",
              "8. De la apreciación comparativa de los medios de prueba",
            ],
          },
          { id: "CPC_LII_T12", label: "Título XII: De los procedimientos posteriores a la prueba" },
        ],
      },

      // ─── Libro III: De los Juicios Especiales ──────────────
      {
        id: "LIBRO_III_CPC",
        libro: "LIBRO_III_CPC",
        label: "Libro Tercero: De los Juicios Especiales",
        leyesAnexas: [
          { id: "ley_18101_proc", ley: "Ley 18.101", label: "Arrendamiento de Predios Urbanos (Procedimiento)", nombreCorto: "Ley Arriendo (Procesal)" },
        ],
        titulos: [
          {
            id: "CPC_LIII_T1",
            label: "Título I: Del juicio ejecutivo en las obligaciones de dar",
            parrafos: [
              "1. Del procedimiento ejecutivo",
              "2. De la administración de los bienes embargados y del procedimiento de apremio",
              "3. De las tercerías",
            ],
          },
          { id: "CPC_LIII_T2", label: "Título II: Del procedimiento ejecutivo en las obligaciones de hacer y de no hacer" },
          { id: "CPC_LIII_T3", label: "Título III: De los efectos del derecho legal de retención" },
          {
            id: "CPC_LIII_T4",
            label: "Título IV: De los interdictos",
            parrafos: [
              "1. Definiciones y reglas generales",
              "2. De las querellas posesorias en particular",
              "3. De la denuncia de obra nueva",
              "4. De la denuncia de obra ruinosa",
              "5. De los interdictos especiales",
              "6. Disposiciones comunes",
            ],
          },
          { id: "CPC_LIII_T5", label: "Título V: De la citación de evicción" },
          {
            id: "CPC_LIII_T6",
            label: "Título VI: De los juicios especiales del contrato de arrendamiento",
            parrafos: [
              "1. Del desahucio, del lanzamiento y de la retención",
              "2. De la terminación inmediata del arrendamiento",
              "3. Disposiciones comunes",
            ],
          },
          { id: "CPC_LIII_T7", label: "Título VII: De los juicios sobre consentimiento para el matrimonio" },
          {
            id: "CPC_LIII_T8",
            label: "Título VIII: Del juicio arbitral",
            parrafos: [
              "1. Del juicio seguido ante árbitros de derecho",
              "2. Del juicio seguido ante arbitradores",
              "3. Disposición común",
            ],
          },
          { id: "CPC_LIII_T9", label: "Título IX: De los juicios sobre partición de bienes" },
          { id: "CPC_LIII_T10", label: "Título X: De los juicios sobre distribución de aguas" },
          { id: "CPC_LIII_T11", label: "Título XI: Del procedimiento sumario" },
          { id: "CPC_LIII_T12", label: "Título XII: Juicios sobre cuentas" },
          { id: "CPC_LIII_T13", label: "Título XIII: De los juicios sobre pago de ciertos honorarios" },
          {
            id: "CPC_LIII_T14",
            label: "Título XIV: De los juicios de menor y de mínima cuantía",
            parrafos: [
              "1. De los juicios de menor cuantía",
              "2. De los juicios de mínima cuantía",
            ],
          },
          { id: "CPC_LIII_T15", label: "Título XV: Del juicio sobre arreglo de la avería común" },
          { id: "CPC_LIII_T16", label: "Título XVI: De los juicios de hacienda" },
          { id: "CPC_LIII_T17", label: "Título XVII: De los juicios de nulidad de matrimonio y de divorcio" },
          { id: "CPC_LIII_T18", label: "Título XVIII: De la acción de desposeimiento contra terceros poseedores de la finca hipotecada" },
          {
            id: "CPC_LIII_T19",
            label: "Título XIX: Del recurso de casación",
            parrafos: [
              "1. Disposiciones generales",
              "2. Disposiciones especiales del recurso de casación en juicios de mínima cuantía",
              "3. Disposiciones especiales en primera o única instancia en juicios de mayor o menor cuantía",
              "4. Disposiciones especiales en segunda instancia",
            ],
          },
          { id: "CPC_LIII_T20", label: "Título XX: Del recurso de revisión" },
        ],
      },

      // ─── Libro IV: Actos Judiciales No Contenciosos ────────
      {
        id: "LIBRO_IV_CPC",
        libro: "LIBRO_IV_CPC",
        label: "Libro Cuarto: De los Actos Judiciales No Contenciosos",
        titulos: [
          { id: "CPC_LIV_T1", label: "Título I: Disposiciones generales" },
          { id: "CPC_LIV_T2", label: "Título II: De la habilitación para comparecer en juicio" },
          { id: "CPC_LIV_T3", label: "Título III: De la autorización judicial para repudiar la legitimación de un interdicto" },
          { id: "CPC_LIV_T4", label: "Título IV: De la emancipación voluntaria" },
          { id: "CPC_LIV_T5", label: "Título V: De la autorización judicial para repudiar el reconocimiento de un interdicto como hijo natural" },
          {
            id: "CPC_LIV_T6",
            label: "Título VI: Del nombramiento de tutores y curadores y del discernimiento",
            parrafos: [
              "1. Del nombramiento de tutores y curadores",
              "2. Del discernimiento de la tutela o curaduría",
            ],
          },
          { id: "CPC_LIV_T7", label: "Título VII: Del inventario solemne" },
          {
            id: "CPC_LIV_T8",
            label: "Título VIII: De los procedimientos a que da lugar la sucesión por causa de muerte",
            parrafos: [
              "1. De los procedimientos especiales de la sucesión testamentaria",
              "2. De la guarda de los muebles y papeles de la sucesión",
              "3. De la dación de la posesión efectiva de la herencia",
              "4. De la declaración de herencia yacente",
              "5. Disposiciones comunes",
            ],
          },
          { id: "CPC_LIV_T9", label: "Título IX: De la insinuación de donaciones" },
          { id: "CPC_LIV_T10", label: "Título X: De la autorización judicial para enajenar, gravar o dar en arrendamiento bienes de incapaces" },
          { id: "CPC_LIV_T11", label: "Título XI: De la venta en pública subasta" },
          { id: "CPC_LIV_T12", label: "Título XII: De las tasaciones" },
          { id: "CPC_LIV_T13", label: "Título XIII: De la declaración del derecho al goce de censos" },
          { id: "CPC_LIV_T14", label: "Título XIV: De las informaciones para perpetua memoria" },
          { id: "CPC_LIV_T15", label: "Título XV: De la expropiación por causa de utilidad pública" },
          { id: "CPC_LIV_TFINAL", label: "Título Final: De la derogación de las leyes de procedimiento" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DERECHO ORGÁNICO — Código Orgánico de Tribunales
  // ═══════════════════════════════════════════════════════════════
  DERECHO_ORGANICO: {
    label: "Derecho Orgánico de Tribunales",
    codigo: "CODIGO_ORGANICO_TRIBUNALES",
    leyesAnexasRama: [
      { id: "ley_19665_reforma_cot", ley: "Ley 19.665", label: "Reforma del Código Orgánico de Tribunales", nombreCorto: "Ley Reforma COT" },
      { id: "ley_16618_menores", ley: "Ley 16.618", label: "Ley de Menores", nombreCorto: "Ley de Menores" },
      { id: "ley_18287_policia_local", ley: "Ley 18.287", label: "Procedimiento ante Juzgados de Policía Local", nombreCorto: "Ley Juzgados Policía Local" },
      { id: "ds_307_org_policia_local", ley: "DS 307", label: "Organización y Atribuciones de los Juzgados de Policía Local", nombreCorto: "DS Org. Juzgados Policía Local" },
      { id: "aa_recursos_queja", ley: "Auto Acordado", label: "Tramitación y Fallo de los Recursos de Queja", nombreCorto: "AA Recursos de Queja" },
      { id: "aa_distribucion_salas_cs", ley: "Auto Acordado", label: "Distribución de Materias entre las Salas de la Corte Suprema", nombreCorto: "AA Distribución Salas CS" },
      { id: "acta_107_2017", ley: "Acta 107-2017", label: "Distribución de Materias Salas Especializadas CS", nombreCorto: "Acta 107-2017 Salas CS" },
      { id: "aa_funcionamiento_tribunales", ley: "Auto Acordado", label: "Forma de Funcionamiento de Tribunales y Servicios Judiciales", nombreCorto: "AA Funcionamiento Tribunales" },
      { id: "acta_71_2016", ley: "Acta 71-2016", label: "Funcionamiento de Tribunales que Tramitan Electrónicamente", nombreCorto: "Acta 71-2016 Tram. Electrónica" },
      { id: "acta_85_2019", ley: "Acta 85-2019", label: "Aplicación Ley Nº 20.886 Tramitación Digital", nombreCorto: "Acta 85-2019 Tram. Digital" },
      { id: "acta_108_2020", ley: "Acta 108-2020", label: "Procedimiento Responsabilidad Disciplinaria Poder Judicial", nombreCorto: "Acta 108-2020 Resp. Disciplinaria" },
      { id: "ley_19968_familia", ley: "Ley 19.968", label: "Crea los Tribunales de Familia", nombreCorto: "Ley Tribunales de Familia" },
      { id: "ley_21226_covid_cot", ley: "Ley 21.226", label: "Régimen Jurídico de Excepción COVID-19", nombreCorto: "Ley Excepción COVID-19" },
      { id: "ley_21394_reformas", ley: "Ley 21.394", label: "Reformas al Sistema de Justicia post Estado de Excepción", nombreCorto: "Ley Reformas Justicia" },
      { id: "decreto_62_deudores", ley: "Decreto 62", label: "Reglamento Registro Nacional de Deudores de Pensiones de Alimentos", nombreCorto: "Regl. Registro Deudores Pensiones" },
      { id: "acta_258_2022", ley: "Acta 258-2022", label: "Aplicación Art. 47 D y 68 bis del COT", nombreCorto: "Acta 258-2022" },
    ],
    secciones: [
      {
        id: "LIBRO_COT",
        libro: "LIBRO_COT",
        label: "Código Orgánico de Tribunales",
        titulos: [
          {
            id: "COT_T1",
            label: "Título I: Del Poder Judicial y de la Administración de Justicia en general",
          },
          {
            id: "COT_T2",
            label: "Título II: De los Juzgados de Garantía y de los Tribunales de Juicio Oral en lo Penal",
            parrafos: [
              "§1. De los Juzgados de Garantía",
              "§2. De los Tribunales de Juicio Oral en lo Penal",
              "§3. Del Comité de Jueces",
              "§4. Del Juez Presidente del Comité de Jueces",
              "§5. De la organización administrativa de los Juzgados de Garantía y de los Tribunales de Juicio Oral en lo Penal",
            ],
          },
          {
            id: "COT_T3",
            label: "Título III: De los Jueces de Letras",
          },
          {
            id: "COT_T4",
            label: "Título IV: De los Presidentes y Ministros de Corte como Tribunales Unipersonales",
          },
          {
            id: "COT_T5",
            label: "Título V: Las Cortes de Apelaciones",
            parrafos: [
              "1. Su organización y atribuciones",
              "2. Los acuerdos de las Cortes de Apelaciones",
              "3. Los Presidentes de las Cortes de Apelaciones",
            ],
          },
          {
            id: "COT_T6",
            label: "Título VI: La Corte Suprema",
            parrafos: [
              "1. Su organización y atribuciones",
              "2. El Presidente de la Corte Suprema",
            ],
          },
          {
            id: "COT_T6B",
            label: "Título VI bis: De la realización de audiencias bajo la modalidad semipresencial o vía remota",
          },
          {
            id: "COT_T7",
            label: "Título VII: La Competencia",
            parrafos: [
              "1. Reglas generales",
              "2. Reglas que determinan la cuantía de las materias judiciales",
              "3. Supresión del fuero personal en algunos negocios judiciales",
              "4. Reglas que determinan la competencia en materias civiles entre tribunales de igual jerarquía",
              "5. Reglas que determinan la competencia en materias criminales entre tribunales de igual jerarquía",
              "6. Reglas sobre competencia civil de los tribunales en lo criminal",
              "7. Reglas que determinan la distribución de causas",
              "8. De la prórroga de la competencia",
              "9. De la competencia para fallar en única o en primera instancia",
              "10. De los tribunales que deben conocer en las contiendas y cuestiones de competencia",
              "11. De la implicancia y recusación de los jueces y de los abogados integrantes",
            ],
          },
          {
            id: "COT_T8",
            label: "Título VIII: De la Subrogación e Integración",
          },
          {
            id: "COT_T9",
            label: "Título IX: De los Jueces Árbitros",
          },
          {
            id: "COT_T10",
            label: "Título X: De los Magistrados y del Nombramiento y Escalafón de los Funcionarios Judiciales",
            parrafos: [
              "1. Calidades en que pueden ser nombrados los jueces",
              "2. Requisitos, inhabilidades e incompatibilidades",
              "3. De los nombramientos y del escalafón de los funcionarios judiciales",
              "4. De la instalación de los jueces",
              "5. De los honores y prerrogativas de los jueces",
              "6. De las permutas y traslados",
              "7. De los deberes y prohibiciones a que están sujetos los jueces",
              "8. De la responsabilidad de los jueces",
              "9. La expiración y suspensión de las funciones de los jueces. De las licencias",
            ],
          },
          {
            id: "COT_T11",
            label: "Título XI: Los Auxiliares de la Administración de Justicia",
            parrafos: [
              "1. Fiscalía Judicial",
              "2. Los Defensores Públicos",
              "3. Los Relatores",
              "4. Los Secretarios",
              "4 bis. Los administradores de tribunales con competencia en lo criminal",
              "5. Los Receptores",
              "6. De los Procuradores y especialmente de los Procuradores del Número",
              "7. Los Notarios",
              "8. Los Conservadores",
              "9. Los Archiveros",
              "10. De los Consejos Técnicos",
              "11. Los Bibliotecarios Judiciales",
            ],
          },
          {
            id: "COT_T12",
            label: "Título XII: Disposiciones generales aplicables a los Auxiliares de la Administración de Justicia",
            parrafos: [
              "1. Nombramiento, requisitos, inhabilidades e incompatibilidades",
              "2. Juramento e instalación",
              "3. Obligaciones y prohibiciones",
              "4. De las implicancias y recusaciones",
              "5. De su remuneración y de su previsión",
              "6. Suspensión y expiración de funciones. De las licencias",
            ],
          },
          {
            id: "COT_T13",
            label: "Título XIII: De los Empleados u Oficiales de Secretaría",
          },
          {
            id: "COT_T14",
            label: "Título XIV: La Corporación Administrativa del Poder Judicial",
          },
          {
            id: "COT_T15",
            label: "Título XV: Los Abogados",
          },
          {
            id: "COT_T16",
            label: "Título XVI: De la Jurisdicción Disciplinaria y de la Inspección y Vigilancia de los Servicios Judiciales",
            parrafos: [
              "1. Las facultades disciplinarias",
              "2. De las visitas",
              "3. Estados y publicaciones",
            ],
          },
          {
            id: "COT_T17",
            label: "Título XVII: De la Asistencia Judicial y del Privilegio de Pobreza",
          },
          {
            id: "COT_TFINAL",
            label: "Título Final: Disposiciones derogadas por la Ley de Organización y Atribuciones de los Tribunales",
          },
        ],
      },
    ],
  },
};

/* ─── Helpers ────────────────────────────────────────────── */

/** Rama labels para UI */
export const RAMA_LABELS: Record<string, string> = {
  DERECHO_CIVIL: "Derecho Civil",
  DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil",
  DERECHO_ORGANICO: "Derecho Orgánico de Tribunales",
};

/** Libro labels para UI */
export const LIBRO_LABELS: Record<string, string> = {};
for (const rama of Object.values(CURRICULUM)) {
  for (const sec of rama.secciones) {
    LIBRO_LABELS[sec.libro] = sec.label;
  }
}

/** Titulo labels para UI (tituloId → label legible) */
export const TITULO_LABELS: Record<string, string> = {};
for (const rama of Object.values(CURRICULUM)) {
  for (const sec of rama.secciones) {
    for (const titulo of sec.titulos) {
      TITULO_LABELS[titulo.id] = titulo.label;
    }
  }
}

/** Dificultad labels */
export const DIFICULTAD_LABELS: Record<string, string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

/** Get all titulos for a given libro */
export function getTitulosForLibro(
  ramaKey: string,
  libroKey: string
): TituloNode[] {
  const rama = CURRICULUM[ramaKey];
  if (!rama) return [];
  const seccion = rama.secciones.find((s) => s.libro === libroKey);
  return seccion?.titulos ?? [];
}

/** Get all parrafos for a given titulo */
export function getParrafosForTitulo(
  ramaKey: string,
  libroKey: string,
  tituloId: string
): string[] {
  const titulos = getTitulosForLibro(ramaKey, libroKey);
  const titulo = titulos.find((t) => t.id === tituloId);
  return titulo?.parrafos ?? [];
}

/** Get libros for a rama */
export function getLibrosForRama(ramaKey: string): SeccionNode[] {
  return CURRICULUM[ramaKey]?.secciones ?? [];
}

/** Count total titulos in a rama */
export function countTitulosInRama(ramaKey: string): number {
  const rama = CURRICULUM[ramaKey];
  if (!rama) return 0;
  return rama.secciones.reduce((sum, sec) => sum + sec.titulos.length, 0);
}

/** Count total titulos in a libro */
export function countTitulosInLibro(
  ramaKey: string,
  libroKey: string
): number {
  const rama = CURRICULUM[ramaKey];
  if (!rama) return 0;
  const seccion = rama.secciones.find((s) => s.libro === libroKey);
  return seccion?.titulos.length ?? 0;
}

/** Find titulo label by id across the whole curriculum */
export function findTituloLabel(tituloId: string): string | undefined {
  for (const rama of Object.values(CURRICULUM)) {
    for (const sec of rama.secciones) {
      const titulo = sec.titulos.find((t) => t.id === tituloId);
      if (titulo) return titulo.label;
    }
  }
  return undefined;
}
