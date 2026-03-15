/**
 * Índice Maestro del Curriculum — Studio Iuris
 * Estructura jerárquica: Rama → Código → Libro → Título → Párrafo
 * Basado en el Código Civil y Código de Procedimiento Civil de Chile.
 */

export interface LeyAnexa {
  ley: string;
  label: string;
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
}

export type CurriculumTree = Record<string, RamaNode>;

export const CURRICULUM: CurriculumTree = {
  DERECHO_CIVIL: {
    label: "Derecho Civil",
    codigo: "CODIGO_CIVIL",
    secciones: [
      {
        id: "MENSAJE",
        libro: "MENSAJE",
        label: "Mensaje del Codigo Civil",
        titulos: [
          {
            id: "MENSAJE_BELLO",
            label: "Andres Bello al Congreso Nacional",
            parrafos: [
              "Contexto historico",
              "Necesidad de la codificacion",
              "Fuentes del Codigo",
            ],
          },
        ],
      },
      {
        id: "TITULO_PRELIMINAR",
        libro: "TITULO_PRELIMINAR",
        label: "Titulo Preliminar (Arts. 1-53)",
        titulos: [
          {
            id: "TP_1",
            label: "De la ley",
            articulosRef: "Arts. 1-3",
          },
          {
            id: "TP_2",
            label: "Promulgacion y obligatoriedad",
            articulosRef: "Arts. 4-9",
          },
          {
            id: "TP_3",
            label: "Efectos en el tiempo",
            articulosRef: "Arts. 9-10",
          },
          {
            id: "TP_4",
            label: "Efectos en el territorio",
            articulosRef: "Arts. 13-16",
          },
          {
            id: "TP_5",
            label: "Interpretacion de la ley",
            articulosRef: "Arts. 19-24",
          },
          {
            id: "TP_6",
            label: "Definicion de palabras de uso frecuente",
            articulosRef: "Arts. 25-53",
          },
        ],
        leyesAnexas: [
          { ley: "Ley 21.719", label: "Proteccion de datos personales" },
        ],
      },
      {
        id: "LIBRO_I",
        libro: "LIBRO_I",
        label: "Libro I — De las Personas (Arts. 54-564)",
        titulos: [
          {
            id: "LI_T1",
            label: "Titulo I — De las personas, nombre, nacionalidad y domicilio",
            parrafos: [
              "Division de las personas",
              "Del nombre",
              "Del domicilio",
              "Del domicilio legal",
            ],
          },
          {
            id: "LI_T2",
            label: "Titulo II — Del principio y fin de la existencia",
            parrafos: [
              "Del principio de existencia",
              "Del fin de la existencia",
            ],
          },
          {
            id: "LI_T3",
            label: "Titulo III — Del matrimonio",
            parrafos: [
              "Definicion y requisitos",
              "Impedimentos",
              "Celebracion",
              "Nulidad",
              "Separacion judicial",
              "Divorcio",
            ],
            leyesAnexas: [
              { ley: "Ley 19.947", label: "Ley de Matrimonio Civil" },
              { ley: "Ley 20.830", label: "Acuerdo de Union Civil" },
              { ley: "Ley 21.400", label: "Matrimonio igualitario" },
            ],
          },
          {
            id: "LI_T4",
            label: "Titulo IV — Obligaciones entre conyuges",
          },
          {
            id: "LI_T5",
            label: "Titulo V — Sociedad conyugal",
            parrafos: [
              "Reglas generales",
              "Del haber de la sociedad",
              "De las cargas",
              "De la administracion",
              "Disolucion y liquidacion",
            ],
          },
          {
            id: "LI_T6",
            label: "Titulo VI — Separacion de bienes",
          },
          {
            id: "LI_T7",
            label: "Titulo VII — De la filiacion",
            parrafos: [
              "Reglas generales",
              "Determinacion de la filiacion",
              "Acciones de filiacion",
            ],
            leyesAnexas: [{ ley: "Ley 19.585", label: "Filiacion" }],
          },
          {
            id: "LI_T8",
            label: "Titulo VIII — Derechos y obligaciones entre padres e hijos",
          },
          {
            id: "LI_T9",
            label: "Titulo IX — De la patria potestad",
          },
          {
            id: "LI_T10",
            label: "Titulo X — De los alimentos",
            leyesAnexas: [
              {
                ley: "Ley 14.908",
                label: "Abandono de familia y pago de pensiones",
              },
            ],
          },
          {
            id: "LI_T11",
            label: "Titulo XI — Tutelas y curadorias",
            parrafos: [
              "Reglas generales",
              "De la tutela",
              "De las curadorias",
              "De las incapacidades",
            ],
          },
          {
            id: "LI_T12",
            label: "Titulo XII — De la adopcion",
            leyesAnexas: [{ ley: "Ley 21.430", label: "Adopcion" }],
          },
          {
            id: "LI_T33",
            label: "Titulo XXXIII — Personas juridicas",
            parrafos: [
              "Corporaciones y fundaciones",
              "Reglas especiales",
            ],
            leyesAnexas: [
              {
                ley: "Ley 20.500",
                label: "Asociaciones y participacion ciudadana",
              },
            ],
          },
        ],
      },
      {
        id: "LIBRO_II",
        libro: "LIBRO_II",
        label: "Libro II — De los Bienes (Arts. 565-950)",
        titulos: [
          {
            id: "LII_T1",
            label: "Titulo I — Clases de bienes",
          },
          {
            id: "LII_T2",
            label: "Titulo II — Del dominio",
            parrafos: [
              "Definicion y facultades",
              "Copropiedad",
              "Propiedad fiduciaria",
            ],
            leyesAnexas: [
              { ley: "Ley 19.537", label: "Copropiedad inmobiliaria" },
            ],
          },
          {
            id: "LII_T3",
            label: "Titulo III — Bienes nacionales",
          },
          {
            id: "LII_T4",
            label: "Titulo IV — De la ocupacion",
          },
          {
            id: "LII_T5",
            label: "Titulo V — De la accesion",
            parrafos: ["Inmueble a inmueble", "Mueble a inmueble"],
          },
          {
            id: "LII_T6",
            label: "Titulo VI — De la tradicion",
            parrafos: ["Reglas generales", "Tradicion de derechos reales"],
          },
          {
            id: "LII_T7",
            label: "Titulo VII — De la posesion",
            parrafos: [
              "Posesion en general",
              "Posesion de derechos reales",
              "Posesion irregular",
            ],
            leyesAnexas: [
              {
                ley: "DL 2.695",
                label: "Regularizacion pequena propiedad raiz",
              },
            ],
          },
          {
            id: "LII_T8",
            label: "Titulo VIII — Limitaciones al dominio",
            parrafos: [
              "Usufructo",
              "Uso y habitacion",
              "Servidumbres prediales",
            ],
          },
          {
            id: "LII_T12",
            label: "Titulo XII — De la reivindicacion",
          },
          {
            id: "LII_T13",
            label: "Titulo XIII — Acciones posesorias",
          },
          {
            id: "LII_T14",
            label: "Titulo XIV — Prescripcion adquisitiva",
          },
        ],
      },
      {
        id: "LIBRO_III",
        libro: "LIBRO_III",
        label: "Libro III — De la Sucesion (Arts. 951-1436)",
        titulos: [
          {
            id: "LIII_T1",
            label: "Titulo I — Definiciones y reglas generales",
          },
          {
            id: "LIII_T2",
            label: "Titulo II — Sucesion intestada",
            parrafos: [
              "Ordenes de sucesion",
              "Representacion",
              "Acrecimiento",
            ],
          },
          {
            id: "LIII_T3",
            label: "Titulo III — Del testamento",
            parrafos: [
              "Del testamento en general",
              "Testamento solemne",
              "Testamentos privilegiados",
              "Revocacion",
            ],
          },
          {
            id: "LIII_T4",
            label: "Titulo IV — Asignaciones testamentarias",
            parrafos: [
              "Reglas generales",
              "Asignaciones condicionales",
              "Asignaciones a plazo",
              "Asignaciones modales",
            ],
          },
          {
            id: "LIII_T5",
            label: "Titulo V — Asignaciones forzosas",
            parrafos: [
              "Legitimas",
              "Cuarta de mejoras",
              "Accion de reforma",
            ],
          },
          {
            id: "LIII_T6",
            label: "Titulo VI — Apertura de la sucesion",
          },
          {
            id: "LIII_T7",
            label: "Titulo VII — De los albaceas",
          },
          {
            id: "LIII_T8",
            label: "Titulo VIII — Particion de bienes",
            parrafos: ["Reglas generales", "Del juicio de particion"],
            leyesAnexas: [
              { ley: "Ley 16.271", label: "Impuesto a las herencias" },
            ],
          },
          {
            id: "LIII_T9",
            label: "Titulo IX — Pago de deudas hereditarias",
          },
          {
            id: "LIII_T10",
            label: "Titulo X — Donaciones entre vivos",
          },
        ],
      },
      {
        id: "LIBRO_IV",
        libro: "LIBRO_IV",
        label: "Libro IV — Obligaciones y Contratos (Arts. 1437-2524)",
        titulos: [
          {
            id: "LIV_T1",
            label: "Titulo I — Clasificacion de obligaciones",
          },
          {
            id: "LIV_T2",
            label: "Titulo II — Del acto juridico",
            parrafos: [
              "Del acto juridico",
              "De la capacidad",
              "Del objeto",
              "De la causa",
              "De las formalidades",
            ],
          },
          {
            id: "LIV_T3",
            label: "Titulo III — Obligaciones naturales",
          },
          {
            id: "LIV_T4",
            label: "Titulo IV — Obligaciones condicionales",
          },
          {
            id: "LIV_T5",
            label: "Titulo V — Obligaciones a plazo",
          },
          {
            id: "LIV_T6",
            label: "Titulo VI — Obligaciones alternativas",
          },
          {
            id: "LIV_T7",
            label: "Titulo VII — Obligaciones facultativas",
          },
          {
            id: "LIV_T8",
            label: "Titulo VIII — Obligaciones de genero",
          },
          {
            id: "LIV_T9",
            label: "Titulo IX — Obligaciones solidarias",
          },
          {
            id: "LIV_T10",
            label: "Titulo X — Obligaciones divisibles e indivisibles",
          },
          {
            id: "LIV_T11",
            label: "Titulo XI — Clausula penal",
          },
          {
            id: "LIV_T12",
            label: "Titulo XII — Efecto de las obligaciones",
            parrafos: [
              "Cumplimiento forzado",
              "Indemnizacion de perjuicios",
              "Derechos auxiliares del acreedor",
            ],
          },
          {
            id: "LIV_T13",
            label: "Titulo XIII — Interpretacion de contratos",
          },
          {
            id: "LIV_T14",
            label: "Titulo XIV — Modos de extincion",
            parrafos: [
              "El pago",
              "La novacion",
              "La remision",
              "La compensacion",
              "La confusion",
              "Perdida de la cosa",
              "Nulidad y rescision",
              "Prescripcion extintiva",
            ],
          },
          {
            id: "LIV_CONTRATOS",
            label: "Titulos XV-XLII — Contratos en particular",
            parrafos: [
              "Compraventa",
              "Permutacion",
              "Cesion de derechos",
              "Arrendamiento",
              "Sociedad",
              "Mandato",
              "Comodato",
              "Mutuo",
              "Deposito",
              "Fianza",
              "Transaccion",
              "Hipoteca",
              "Prenda",
              "Cuasicontratos",
              "Responsabilidad extracontractual",
            ],
            leyesAnexas: [
              { ley: "Ley 19.496", label: "Proteccion al consumidor" },
              {
                ley: "Ley 18.101",
                label: "Arrendamiento predios urbanos",
              },
              { ley: "Ley 18.010", label: "Operaciones de credito" },
              { ley: "Ley 20.190", label: "Prenda sin desplazamiento" },
            ],
          },
        ],
      },
    ],
  },
  DERECHO_PROCESAL_CIVIL: {
    label: "Derecho Procesal Civil",
    codigo: "CODIGO_PROCEDIMIENTO_CIVIL",
    secciones: [
      {
        id: "LIBRO_I_CPC",
        libro: "LIBRO_I_CPC",
        label: "Libro I — Disposiciones comunes (Arts. 1-252)",
        titulos: [
          {
            id: "CPC_LI_T1",
            label: "Titulo I — Reglas generales",
          },
          {
            id: "CPC_LI_T2",
            label: "Titulo II — Comparecencia en juicio",
            leyesAnexas: [
              { ley: "Ley 18.120", label: "Comparecencia en juicio" },
            ],
          },
          {
            id: "CPC_LI_T3",
            label: "Titulo III — Jurisdiccion y competencia",
            leyesAnexas: [
              { ley: "COT", label: "Codigo Organico de Tribunales" },
            ],
          },
          {
            id: "CPC_LI_T4",
            label: "Titulo IV — Implicancias y recusaciones",
          },
          {
            id: "CPC_LI_T5",
            label: "Titulo V — Actuaciones judiciales",
          },
          {
            id: "CPC_LI_T6",
            label: "Titulo VI — Notificaciones",
          },
          {
            id: "CPC_LI_T7",
            label: "Titulo VII — Plazos",
          },
          {
            id: "CPC_LI_T8",
            label: "Titulo VIII — Resoluciones judiciales",
          },
          {
            id: "CPC_LI_T9",
            label: "Titulo IX — Cosa juzgada",
          },
          {
            id: "CPC_LI_T10",
            label: "Titulo X — Incidentes",
          },
          {
            id: "CPC_LI_T11",
            label: "Titulo XI — Medidas precautorias",
          },
        ],
      },
      {
        id: "LIBRO_II_CPC",
        libro: "LIBRO_II_CPC",
        label: "Libro II — Juicio ordinario (Arts. 253-433)",
        titulos: [
          {
            id: "CPC_LII_T1",
            label: "Titulo I — De la demanda",
          },
          {
            id: "CPC_LII_T2",
            label: "Titulo II — Contestacion",
          },
          {
            id: "CPC_LII_T3",
            label: "Titulo III — Replica y duplica",
          },
          {
            id: "CPC_LII_T4",
            label: "Titulo IV — Periodo de prueba",
            parrafos: [
              "De la prueba en general",
              "Prueba documental",
              "Prueba testimonial",
              "Confesion",
              "Inspeccion personal",
              "Informe de peritos",
              "Presunciones",
            ],
          },
          {
            id: "CPC_LII_T5",
            label: "Titulo V — Sentencia definitiva",
          },
        ],
      },
      {
        id: "LIBRO_III_CPC",
        libro: "LIBRO_III_CPC",
        label: "Libro III — Juicios especiales",
        titulos: [
          {
            id: "CPC_LIII_T1",
            label: "Titulo I — Juicio ejecutivo (dar)",
          },
          {
            id: "CPC_LIII_T2",
            label: "Titulo II — Juicio ejecutivo (hacer)",
          },
          {
            id: "CPC_LIII_T3",
            label: "Titulo III — Menor cuantia",
          },
          {
            id: "CPC_LIII_T4",
            label: "Titulo IV — Minima cuantia",
          },
          {
            id: "CPC_LIII_T5",
            label: "Titulo V — Juicio sumario",
          },
          {
            id: "CPC_LIII_T6",
            label: "Titulo VI — Otros procedimientos",
            leyesAnexas: [
              { ley: "Ley 19.968", label: "Tribunales de Familia" },
            ],
          },
        ],
      },
      {
        id: "LIBRO_IV_CPC",
        libro: "LIBRO_IV_CPC",
        label: "Libro IV — Recursos",
        titulos: [
          {
            id: "CPC_LIV_T1",
            label: "Titulo I — Actos no contenciosos",
          },
          {
            id: "CPC_LIV_T2",
            label: "Titulo II — Reposicion",
          },
          {
            id: "CPC_LIV_T3",
            label: "Titulo III — Apelacion",
          },
          {
            id: "CPC_LIV_T4",
            label: "Titulo IV — Casacion en la forma",
          },
          {
            id: "CPC_LIV_T5",
            label: "Titulo V — Casacion en el fondo",
          },
          {
            id: "CPC_LIV_T6",
            label: "Titulo VI — Revision",
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
};

/** Libro labels para UI */
export const LIBRO_LABELS: Record<string, string> = {};
for (const rama of Object.values(CURRICULUM)) {
  for (const sec of rama.secciones) {
    LIBRO_LABELS[sec.libro] = sec.label;
  }
}

/** Dificultad labels */
export const DIFICULTAD_LABELS: Record<string, string> = {
  BASICO: "Basico",
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
