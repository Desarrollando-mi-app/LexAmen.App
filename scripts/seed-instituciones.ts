/**
 * Seed 72 instituciones jurídicas + classify existing content
 * Usage: npx tsx scripts/seed-instituciones.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const instituciones = [
  { id: 1, nombre: "La Ley", area: "CIVIL", grupo: "Teoría de la Ley", tag: "fundamental", orden: 1, descripcion: "Definición, promulgación, publicación, efectos, interpretación y derogación de la ley", subContenido: "Definición (art. 1) · Promulgación (art. 6-7) · Publicación · Presunción de conocimiento (art. 8) · Obligatoriedad (art. 14) · Efectos en el tiempo (art. 9) · Efecto territorial (arts. 14-18) · Derogación (arts. 52-53)", articulosCC: "Arts. 1-53", articulosCPC: null, articulosCOT: null },
  { id: 2, nombre: "Interpretación de la Ley", area: "CIVIL", grupo: "Teoría de la Ley", tag: "fundamental", orden: 2, descripcion: "Los 4 elementos de interpretación de Savigny más equidad natural", subContenido: "Elemento gramatical (art. 19-20) · Lógico (art. 22 inc.1) · Histórico (art. 19 inc.2) · Sistemático (art. 22 inc.2) · Espíritu general y equidad (art. 24) · Interpretación auténtica (art. 3)", articulosCC: "Arts. 19-24, 3", articulosCPC: null, articulosCOT: null },
  { id: 3, nombre: "Costumbre", area: "CIVIL", grupo: "Teoría de la Ley", tag: "básico", orden: 3, descripcion: "Costumbre como fuente del derecho: según la ley, en silencio de ley, contra ley", subContenido: "Según la ley (art. 2 CC, secundum legem) · En silencio de ley (CdC) · Contra ley · Requisitos", articulosCC: "Art. 2", articulosCPC: null, articulosCOT: null },
  { id: 4, nombre: "Personas Naturales", area: "CIVIL", grupo: "Personas", tag: "fundamental", orden: 4, descripcion: "Existencia legal y natural, muerte natural y presunta, comurientes", subContenido: "Existencia legal (art. 74) · Existencia natural (art. 75) · Presunción de concepción (art. 76) · Muerte (art. 78) · Muerte presunta (arts. 80-94) · Comurientes (art. 79)", articulosCC: "Arts. 54-97", articulosCPC: null, articulosCOT: null },
  { id: 5, nombre: "Atributos de la Personalidad", area: "CIVIL", grupo: "Personas", tag: "fundamental", orden: 5, descripcion: "Nombre, capacidad de goce, nacionalidad, domicilio, estado civil, patrimonio", subContenido: "Nombre · Capacidad de goce · Nacionalidad (arts. 56-57) · Domicilio (arts. 59-73) · Estado civil (arts. 304-320) · Patrimonio", articulosCC: "Arts. 55-73, 304-320", articulosCPC: null, articulosCOT: null },
  { id: 6, nombre: "Capacidad", area: "TRANSVERSAL", grupo: "Personas", tag: "transversal", orden: 6, descripcion: "Capacidad de goce vs ejercicio, incapacidades absolutas y relativas, capacidad procesal", subContenido: "De goce vs. de ejercicio · Incapacidad absoluta (art. 1447 inc.1) · Relativa (art. 1447 inc.3) · Especiales · Procesal", articulosCC: "Arts. 1446-1447", articulosCPC: "Arts. 4-8 CPC", articulosCOT: null },
  { id: 7, nombre: "Personas Jurídicas", area: "CIVIL", grupo: "Personas", tag: "importante", orden: 7, descripcion: "Corporaciones, fundaciones, sociedades, constitución, responsabilidad", subContenido: "Derecho público vs. privado (art. 547) · Con/sin fines de lucro · Constitución · Atributos · Disolución", articulosCC: "Arts. 545-564", articulosCPC: null, articulosCOT: null },
  { id: 8, nombre: "Matrimonio", area: "CIVIL", grupo: "Familia", tag: "fundamental", orden: 8, descripcion: "Definición, requisitos, impedimentos, deberes conyugales", subContenido: "Definición (art. 102) · Requisitos · Impedimentos · Deberes (arts. 131-134) · Putativo (art. 51 LMC)", articulosCC: "Arts. 102-134", articulosCPC: null, articulosCOT: null },
  { id: 9, nombre: "Terminación del Matrimonio", area: "CIVIL", grupo: "Familia", tag: "fundamental", orden: 9, descripcion: "Divorcio, separación, nulidad matrimonial, compensación económica", subContenido: "Divorcio unilateral/mutuo/culpa · Separación · Nulidad matrimonial · Compensación económica (arts. 61-66 LMC)", articulosCC: "Art. 42", articulosCPC: null, articulosCOT: null },
  { id: 10, nombre: "AUC", area: "CIVIL", grupo: "Familia", tag: "importante", orden: 10, descripcion: "Acuerdo de Unión Civil: requisitos, efectos, terminación", subContenido: "Ley 20.830 · Requisitos · Efectos patrimoniales · Terminación", articulosCC: null, articulosCPC: null, articulosCOT: null },
  { id: 11, nombre: "Regímenes Patrimoniales", area: "CIVIL", grupo: "Familia", tag: "complejo", orden: 11, descripcion: "Sociedad conyugal, participación en gananciales, separación de bienes", subContenido: "SC: haberes, pasivos, recompensas, administración, liquidación · Art. 150 · Participación gananciales · Separación · Capitulaciones", articulosCC: "Arts. 135-178, 1715-1792-27", articulosCPC: null, articulosCOT: null },
  { id: 12, nombre: "Bienes Familiares", area: "CIVIL", grupo: "Familia", tag: "importante", orden: 12, descripcion: "Declaración, efectos, desafectación", subContenido: "Declaración (arts. 141-142) · Beneficio de excusión (art. 148) · Desafectación", articulosCC: "Arts. 141-149", articulosCPC: null, articulosCOT: null },
  { id: 13, nombre: "Filiación", area: "CIVIL", grupo: "Familia", tag: "fundamental", orden: 13, descripcion: "Determinación, acciones de filiación, prueba ADN", subContenido: "Presunción paternidad (art. 184) · Reconocimiento · Acciones · ADN (art. 199)", articulosCC: "Arts. 179-227", articulosCPC: null, articulosCOT: null },
  { id: 14, nombre: "Cuidado Personal y Patria Potestad", area: "CIVIL", grupo: "Familia", tag: "fundamental", orden: 14, descripcion: "Corresponsabilidad parental, representación legal, emancipación", subContenido: "Cuidado personal (arts. 224-228) · Relación directa (art. 229) · Patria potestad (arts. 243-273) · Emancipación", articulosCC: "Arts. 224-273", articulosCPC: null, articulosCOT: null },
  { id: 15, nombre: "Alimentos", area: "CIVIL", grupo: "Familia", tag: "frecuente", orden: 15, descripcion: "Titulares, cuantía, apremios, Ley 14.908", subContenido: "Legales/voluntarios · Congruos/necesarios (art. 323) · Titulares (art. 321) · Apremios · Provisorios", articulosCC: "Arts. 321-337", articulosCPC: null, articulosCOT: null },
  { id: 16, nombre: "Guardas", area: "CIVIL", grupo: "Familia", tag: "específico", orden: 16, descripcion: "Tutela y curaduría", subContenido: "Tutela · Curaduría · General/adjunta/especial · Testamentaria/legítima/dativa", articulosCC: "Arts. 338-514", articulosCPC: null, articulosCOT: null },
  { id: 17, nombre: "VIF y Adopción", area: "CIVIL", grupo: "Familia", tag: "específico", orden: 17, descripcion: "Violencia intrafamiliar y adopción plena", subContenido: "Ley 20.066 (VIF) · Ley 19.620 (Adopción)", articulosCC: null, articulosCPC: null, articulosCOT: null },
  { id: 18, nombre: "Bienes y su Clasificación", area: "CIVIL", grupo: "Bienes", tag: "fundamental", orden: 18, descripcion: "Clasificación: corporales, muebles, inmuebles, derechos reales y personales", subContenido: "Corporales/incorporales (art. 565) · Muebles/inmuebles · Derechos reales (art. 577) vs. personales (art. 578) · Bienes nacionales (art. 589)", articulosCC: "Arts. 565-601", articulosCPC: null, articulosCOT: null },
  { id: 19, nombre: "Dominio", area: "CIVIL", grupo: "Bienes", tag: "fundamental", orden: 19, descripcion: "Definición, facultades, características, limitaciones, copropiedad", subContenido: "Art. 582 · Uso, goce, disposición · Absoluto, exclusivo, perpetuo · Limitaciones · Propiedad fiduciaria · Copropiedad", articulosCC: "Arts. 582-584, 733-763", articulosCPC: null, articulosCOT: null },
  { id: 20, nombre: "Modos de Adquirir el Dominio", area: "CIVIL", grupo: "Bienes", tag: "fundamental", orden: 20, descripcion: "6 modos: ocupación, accesión, tradición, sucesión, prescripción, ley", subContenido: "Art. 588 · Originarios/derivativos · Sistema dual título + modo", articulosCC: "Art. 588", articulosCPC: null, articulosCOT: null },
  { id: 21, nombre: "Tradición", area: "CIVIL", grupo: "Bienes", tag: "fundamental", orden: 21, descripcion: "Modo derivativo: muebles, inmuebles (inscripción CBR), derechos personales", subContenido: "Art. 670 · Muebles (art. 684) · Inmuebles (art. 686) · Derechos personales (art. 699)", articulosCC: "Arts. 670-699", articulosCPC: null, articulosCOT: null },
  { id: 22, nombre: "Posesión", area: "CIVIL", grupo: "Bienes", tag: "complejo", orden: 22, descripcion: "Regular, irregular, viciosa, mera tenencia, justo título, buena fe", subContenido: "Art. 700: corpus + animus · Regular (art. 702) · Irregular (art. 708) · Viciosa · Justo título vs. injusto · Buena fe · Mera tenencia", articulosCC: "Arts. 700-731", articulosCPC: null, articulosCOT: null },
  { id: 23, nombre: "Inscripción CBR", area: "CIVIL", grupo: "Bienes", tag: "técnico", orden: 23, descripcion: "3 registros, triple rol, estudio de títulos", subContenido: "Propiedad, Hipotecas, Interdicciones · Tradición, posesión, publicidad · Inscripciones herencia (art. 688)", articulosCC: "Arts. 686-688", articulosCPC: null, articulosCOT: null },
  { id: 24, nombre: "Acciones Protectoras", area: "TRANSVERSAL", grupo: "Bienes", tag: "transversal", orden: 24, descripcion: "Reivindicatoria, posesorias, publiciana, precario", subContenido: "Reivindicatoria (art. 889) · Publiciana (art. 894) · Posesorias (arts. 916-950) · Precario (art. 2195)", articulosCC: "Arts. 889-950, 2195", articulosCPC: "Arts. 549-583 CPC", articulosCOT: null },
  { id: 25, nombre: "Usufructo, Uso, Habitación y Servidumbres", area: "CIVIL", grupo: "Bienes", tag: "específico", orden: 25, descripcion: "Limitaciones al dominio", subContenido: "Usufructo (art. 764) · Uso (art. 811) · Habitación (art. 812) · Servidumbres (arts. 820-888)", articulosCC: "Arts. 764-888", articulosCPC: null, articulosCOT: null },
  { id: 26, nombre: "Sucesión por Causa de Muerte", area: "CIVIL", grupo: "Sucesiones", tag: "fundamental", orden: 26, descripcion: "Apertura, delación, aceptación, transmisión, representación", subContenido: "Apertura (art. 955) · Delación (art. 956) · Herencia yacente · Beneficio de inventario · Transmisión (art. 957) · Representación", articulosCC: "Arts. 951-1002", articulosCPC: null, articulosCOT: null },
  { id: 27, nombre: "Sucesión Intestada", area: "CIVIL", grupo: "Sucesiones", tag: "fundamental", orden: 27, descripcion: "5 órdenes sucesorios", subContenido: "1° hijos · 2° cónyuge/ascendientes · 3° hermanos · 4° colaterales · 5° Fisco", articulosCC: "Arts. 983-995", articulosCPC: null, articulosCOT: null },
  { id: 28, nombre: "Sucesión Testada", area: "CIVIL", grupo: "Sucesiones", tag: "complejo", orden: 28, descripcion: "Testamento, asignaciones forzosas, legítimas, reforma", subContenido: "Testamento (art. 999) · Asignaciones forzosas (art. 1167) · Legítimas (art. 1182) · Reforma (art. 1216) · Desheredamiento", articulosCC: "Arts. 999-1212", articulosCPC: null, articulosCOT: null },
  { id: 29, nombre: "Partición de Bienes", area: "CIVIL", grupo: "Sucesiones", tag: "técnico", orden: 29, descripcion: "3 formas, juicio de partición, adjudicación declarativa", subContenido: "Testador, herederos, juez partidor · Adjudicación (art. 1344) · Imprescriptible", articulosCC: "Arts. 1317-1353", articulosCPC: "Arts. 646-666 CPC", articulosCOT: null },
  { id: 30, nombre: "Acto Jurídico", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 30, descripcion: "Definición, clasificación, requisitos de existencia y validez", subContenido: "Clasificación · Requisitos existencia · Requisitos validez (art. 1445)", articulosCC: "Arts. 1437-1469", articulosCPC: null, articulosCOT: null },
  { id: 31, nombre: "Voluntad y Consentimiento", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 31, descripcion: "Formación del consentimiento, oferta y aceptación", subContenido: "Voluntad real vs. declarada · Formación (arts. 97-108 CdC) · Oferta y aceptación", articulosCC: "Arts. 1445, 1451-1459", articulosCPC: null, articulosCOT: null },
  { id: 32, nombre: "Vicios del Consentimiento", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 32, descripcion: "Error, fuerza, dolo, lesión enorme", subContenido: "Error: 5 tipos · Fuerza · Dolo: principal vs. incidental · Lesión enorme (arts. 1889-1900)", articulosCC: "Arts. 1451-1459, 1889-1900", articulosCPC: null, articulosCOT: null },
  { id: 33, nombre: "Objeto y Causa", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 33, descripcion: "Requisitos del objeto, objeto ilícito, causa lícita", subContenido: "Objeto: real, comerciable, determinado, lícito · Art. 1464 · Causa (arts. 1467-1469)", articulosCC: "Arts. 1460-1469", articulosCPC: null, articulosCOT: null },
  { id: 34, nombre: "Modalidades", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "complejo", orden: 34, descripcion: "Condición, plazo, modo, CRT, pacto comisorio", subContenido: "Condición · CRT (art. 1489) · Pacto comisorio · Plazo · Modo", articulosCC: "Arts. 1473-1498, 1089-1096", articulosCPC: null, articulosCOT: null },
  { id: 35, nombre: "Nulidad", area: "TRANSVERSAL", grupo: "Acto Jurídico y Obligaciones", tag: "transversal", orden: 35, descripcion: "Absoluta, relativa, conversión, nulidad procesal", subContenido: "Absoluta (art. 1682) · Relativa · Efectos (art. 1687) · Procesal (arts. 83-84 CPC)", articulosCC: "Arts. 1681-1697", articulosCPC: "Arts. 83-84 CPC", articulosCOT: null },
  { id: 36, nombre: "Inoponibilidad", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "importante", orden: 36, descripcion: "Acto válido que no afecta a terceros", subContenido: "Por falta de publicidad · Fecha cierta · Fraude (pauliana art. 2468)", articulosCC: "Arts. 1707, 2468", articulosCPC: null, articulosCOT: null },
  { id: 37, nombre: "Representación y Simulación", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "importante", orden: 37, descripcion: "Representación legal/voluntaria, simulación absoluta/relativa", subContenido: "Art. 1448 · Simulación absoluta/relativa · Inoponibilidad", articulosCC: "Arts. 1448-1450", articulosCPC: null, articulosCOT: null },
  { id: 38, nombre: "Obligaciones", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 38, descripcion: "Fuentes, clasificación, naturales, solidaridad, indivisibilidad", subContenido: "Fuentes (art. 1437) · Civiles/naturales (art. 1470) · Solidaridad vs. indivisibilidad", articulosCC: "Arts. 1437-1544", articulosCPC: null, articulosCOT: null },
  { id: 39, nombre: "Efectos de las Obligaciones", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "complejo", orden: 39, descripcion: "Cumplimiento forzado, indemnización, mora, derechos auxiliares", subContenido: "Cumplimiento forzado · Indemnización · Mora (art. 1551) · Mora purga mora (art. 1552) · Avaluación · Derechos auxiliares", articulosCC: "Arts. 1545-1559", articulosCPC: null, articulosCOT: null },
  { id: 40, nombre: "Modos de Extinguir Obligaciones", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 40, descripcion: "11 modos del art. 1567: pago, novación, compensación, etc.", subContenido: "11 modos (art. 1567) · Pago · Novación · Compensación · Confusión · Pago por subrogación", articulosCC: "Arts. 1567-1680", articulosCPC: null, articulosCOT: null },
  { id: 41, nombre: "Responsabilidad Contractual", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 41, descripcion: "Incumplimiento, mora, culpa tripartita, presunción, riesgos", subContenido: "Incumplimiento · Mora · Culpa tripartita (art. 1547) · Presunción de culpa · Extensión daño (art. 1558) · Riesgos (art. 1550) · Cláusula penal", articulosCC: "Arts. 1545-1559, 1535-1544", articulosCPC: null, articulosCOT: null },
  { id: 42, nombre: "Responsabilidad Extracontractual", area: "CIVIL", grupo: "Acto Jurídico y Obligaciones", tag: "fundamental", orden: 42, descripcion: "5 elementos, prueba de culpa, hecho ajeno, daño moral", subContenido: "5 elementos (art. 2314) · Víctima prueba culpa · Prescripción 4 años · Hecho ajeno (art. 2320) · Solidaridad (art. 2317)", articulosCC: "Arts. 2314-2340", articulosCPC: null, articulosCOT: null },
  { id: 43, nombre: "Prescripción", area: "TRANSVERSAL", grupo: "Acto Jurídico y Obligaciones", tag: "transversal", orden: 43, descripcion: "Adquisitiva y extintiva integradas", subContenido: "Adquisitiva: ordinaria + extraordinaria · Extintiva: ordinaria 5 años, ejecutiva 3 · Interrupción · Suspensión · Renuncia · Tabla maestra", articulosCC: "Arts. 2492-2524", articulosCPC: "Art. 310 CPC", articulosCOT: null },
  { id: 44, nombre: "Buena Fe", area: "TRANSVERSAL", grupo: "Acto Jurídico y Obligaciones", tag: "transversal", orden: 44, descripcion: "Subjetiva (posesión) y objetiva (contratos), principio general", subContenido: "Subjetiva (art. 706) · Objetiva (art. 1546) · Presunción (art. 707)", articulosCC: "Arts. 706-707, 1546", articulosCPC: null, articulosCOT: null },
  { id: 45, nombre: "Compraventa", area: "CIVIL", grupo: "Contratos", tag: "fundamental", orden: 45, descripcion: "Cosa + precio, saneamiento, lesión enorme, cosa ajena", subContenido: "Art. 1793 · EP inmuebles (art. 1801) · Evicción · Vicios redhibitorios · Lesión enorme · Cosa ajena (art. 1815)", articulosCC: "Arts. 1793-1900", articulosCPC: null, articulosCOT: null },
  { id: 46, nombre: "Mandato", area: "CIVIL", grupo: "Contratos", tag: "importante", orden: 46, descripcion: "Obligaciones, terminación, mandato judicial", subContenido: "Art. 2116 · Terminación (art. 2163): 9 causales · Mandato judicial (arts. 6-7 CPC)", articulosCC: "Arts. 2116-2173", articulosCPC: "Arts. 6-7 CPC", articulosCOT: null },
  { id: 47, nombre: "Arrendamiento", area: "CIVIL", grupo: "Contratos", tag: "importante", orden: 47, descripcion: "Obligaciones, Ley 18.101, tácita reconducción", subContenido: "Art. 1915 · Ley 18.101 · Tácita reconducción (art. 1956)", articulosCC: "Arts. 1915-2021", articulosCPC: null, articulosCOT: null },
  { id: 48, nombre: "Sociedad", area: "CIVIL", grupo: "Contratos", tag: "específico", orden: 48, descripcion: "Civil vs. comercial, tipos, disolución", subContenido: "Art. 2053 · Tipos · Disolución (arts. 2098-2115)", articulosCC: "Arts. 2053-2115", articulosCPC: null, articulosCOT: null },
  { id: 49, nombre: "Cauciones", area: "CIVIL", grupo: "Contratos", tag: "complejo", orden: 49, descripcion: "Fianza, prenda, hipoteca", subContenido: "Fianza (arts. 2335-2383) · Prenda (arts. 2384-2406) · Hipoteca (arts. 2407-2434)", articulosCC: "Arts. 2335-2444", articulosCPC: null, articulosCOT: null },
  { id: 50, nombre: "Otros Contratos", area: "CIVIL", grupo: "Contratos", tag: "específico", orden: 50, descripcion: "Comodato, mutuo, depósito, transacción, donación, cuasicontratos", subContenido: "Comodato · Mutuo · Depósito · Transacción · Donación · Cuasicontratos", articulosCC: "Arts. 2174-2464, 1386-1436, 2284-2313", articulosCPC: null, articulosCOT: null },
  { id: 51, nombre: "Autonomía de la Voluntad", area: "TRANSVERSAL", grupo: "Contratos", tag: "transversal", orden: 51, descripcion: "Art. 1545, buena fe contractual, efecto relativo, imprevisión", subContenido: "Art. 1545 · Buena fe (art. 1546) · Estipulación a favor de tercero · Contrato de adhesión", articulosCC: "Arts. 1545-1546, 1449-1450", articulosCPC: null, articulosCOT: null },
  { id: 52, nombre: "Jurisdicción", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 52, descripcion: "Definición, momentos, equivalentes, bases orgánicas", subContenido: "Art. 1 COT · Conocer, juzgar, ejecutar · Equivalentes · Bases orgánicas", articulosCC: null, articulosCPC: null, articulosCOT: "Arts. 1-13 COT" },
  { id: 53, nombre: "Competencia", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 53, descripcion: "Absoluta vs relativa, reglas, prórroga", subContenido: "Art. 108 COT · Absoluta: cuantía, materia, fuero · Relativa: territorio · Reglas · Prórroga", articulosCC: null, articulosCPC: null, articulosCOT: "Arts. 108-193 COT" },
  { id: 54, nombre: "Partes y Representación Procesal", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 54, descripcion: "Capacidad procesal, litisconsorcio, terceros, mandato judicial", subContenido: "Capacidad · Litisconsorcio · Terceros · Ley 18.120", articulosCC: null, articulosCPC: "Arts. 4-24 CPC", articulosCOT: null },
  { id: 55, nombre: "Acciones y Excepciones", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 55, descripcion: "Dilatorias, perentorias, mixtas, anómalas art. 310, reconvención", subContenido: "Dilatorias (art. 303) · Perentorias · Art. 310 · Reconvención (art. 314)", articulosCC: null, articulosCPC: "Arts. 254, 303-314 CPC", articulosCOT: null },
  { id: 56, nombre: "Notificaciones", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 56, descripcion: "Personal, subsidiaria, cédula, estado diario, avisos, tácita", subContenido: "Personal (art. 40) · Subsidiaria (art. 44) · Cédula (art. 48) · Estado diario (art. 50) · Avisos · Tácita (art. 55)", articulosCC: null, articulosCPC: "Arts. 38-58 CPC", articulosCOT: null },
  { id: 57, nombre: "Resoluciones Judiciales", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 57, descripcion: "Decreto, auto, interlocutoria, definitiva, desasimiento", subContenido: "4 tipos (art. 158) · Requisitos art. 170 · Desasimiento (art. 182) · Aclaración", articulosCC: null, articulosCPC: "Arts. 158-185 CPC", articulosCOT: null },
  { id: 58, nombre: "Plazos Procesales", area: "PROCESAL", grupo: "Procesal Civil", tag: "técnico", orden: 58, descripcion: "Tabla maestra de plazos del CPC", subContenido: "3d incidente · 5d apelación · 6d réplica · 15d contestación · 20d probatorio · 60d sentencia", articulosCC: null, articulosCPC: "Arts. 64-68 CPC", articulosCOT: null },
  { id: 59, nombre: "Incidentes", area: "PROCESAL", grupo: "Procesal Civil", tag: "importante", orden: 59, descripcion: "Ordinarios y especiales: abandono, desistimiento, costas", subContenido: "Art. 82 · Tramitación · Especiales: abandono (art. 152), desistimiento (art. 148), costas (art. 138)", articulosCC: null, articulosCPC: "Arts. 82-157 CPC", articulosCOT: null },
  { id: 60, nombre: "Juicio Ordinario", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 60, descripcion: "Etapas: discusión, conciliación, prueba, sentencia", subContenido: "Demanda (art. 254) · Contestación · Conciliación (art. 262) · Prueba · Sentencia · Medidas", articulosCC: null, articulosCPC: "Arts. 253-433 CPC", articulosCOT: null },
  { id: 61, nombre: "Prueba", area: "TRANSVERSAL", grupo: "Procesal Civil", tag: "fundamental", orden: 61, descripcion: "6 medios, carga, valoración, sistemas", subContenido: "6 medios (art. 341) · Carga (art. 1698 CC) · IP plena fe · Confesión ficta · 3 sistemas", articulosCC: "Arts. 1698-1714", articulosCPC: "Arts. 341-429 CPC", articulosCOT: null },
  { id: 62, nombre: "Cosa Juzgada", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 62, descripcion: "Acción, excepción, triple identidad, formal vs material", subContenido: "Acción (art. 175) · Excepción (art. 177): triple identidad · Firmeza (art. 174)", articulosCC: null, articulosCPC: "Arts. 174-178 CPC", articulosCOT: null },
  { id: 63, nombre: "Recursos Procesales", area: "PROCESAL", grupo: "Procesal Civil", tag: "complejo", orden: 63, descripcion: "Reposición, apelación, casación, queja, revisión", subContenido: "Reposición · Apelación · Casación forma (art. 768) · Casación fondo · Queja (art. 545 COT) · Revisión · De hecho · Casación de oficio", articulosCC: null, articulosCPC: "Arts. 181-810 CPC", articulosCOT: "Art. 545 COT" },
  { id: 64, nombre: "Juicio Ejecutivo", area: "PROCESAL", grupo: "Procesal Civil", tag: "fundamental", orden: 64, descripcion: "Títulos ejecutivos, excepciones, embargo, remate, tercerías", subContenido: "Títulos (art. 434) · Excepciones (art. 464): 18 taxativas · Embargo · Remate · Tercerías", articulosCC: null, articulosCPC: "Arts. 434-544 CPC", articulosCOT: null },
  { id: 65, nombre: "Juicios Especiales", area: "PROCESAL", grupo: "Procesal Civil", tag: "importante", orden: 65, descripcion: "Sumario, interdictos, menor y mínima cuantía", subContenido: "Sumario (art. 680) · Interdictos posesorios · Menor/mínima cuantía", articulosCC: null, articulosCPC: "Arts. 680-738 CPC", articulosCOT: null },
  { id: 66, nombre: "Actos No Contenciosos", area: "PROCESAL", grupo: "Procesal Civil", tag: "específico", orden: 66, descripcion: "Sin contienda, revocables, muerte presunta, posesión efectiva", subContenido: "Art. 817 · No cosa juzgada · Revocable (art. 821) · Muerte presunta · Posesión efectiva", articulosCC: null, articulosCPC: "Arts. 817-925 CPC", articulosCOT: null },
  { id: 67, nombre: "Nulidad Procesal", area: "TRANSVERSAL", grupo: "Procesal Civil", tag: "transversal", orden: 67, descripcion: "Incidente de nulidad, casación como vía, principios", subContenido: "Incidente (arts. 83-84) · De oficio · Principios: especificidad, trascendencia, convalidación", articulosCC: null, articulosCPC: "Arts. 79-84 CPC", articulosCOT: null },
  { id: 68, nombre: "Organización de Tribunales", area: "ORGANICO", grupo: "Orgánico", tag: "fundamental", orden: 68, descripcion: "Estructura judicial, bases orgánicas, TC", subContenido: "Juzgados · CA · CS · Unipersonales excepción · TC: inaplicabilidad, inconstitucionalidad", articulosCC: null, articulosCPC: null, articulosCOT: "Arts. 1-53 COT" },
  { id: 69, nombre: "Auxiliares de la Administración de Justicia", area: "ORGANICO", grupo: "Orgánico", tag: "específico", orden: 69, descripcion: "Notarios, conservadores, receptores, relatores, etc.", subContenido: "Fiscalía · Defensores · Relatores · Secretarios · Receptores · Notarios · Conservadores", articulosCC: null, articulosCPC: null, articulosCOT: "Arts. 350-457 COT" },
  { id: 70, nombre: "Implicancias y Recusaciones", area: "ORGANICO", grupo: "Orgánico", tag: "específico", orden: 70, descripcion: "Causales, inhabilitación del juez", subContenido: "Implicancias (art. 195 COT) · Recusaciones (art. 196 COT) · Procedimiento", articulosCC: null, articulosCPC: "Arts. 113-128 CPC", articulosCOT: "Arts. 195-205 COT" },
  { id: 71, nombre: "Propiedad Intelectual", area: "TRANSVERSAL", grupo: "Transversales", tag: "específico", orden: 71, descripcion: "Ley 17.336: protección automática, derechos morales y patrimoniales", subContenido: "Protección automática · Morales (art. 14) · Patrimoniales (art. 11) · Excepciones · Convenio de Berna", articulosCC: null, articulosCPC: null, articulosCOT: null },
  { id: 72, nombre: "Interpretación Contractual", area: "CIVIL", grupo: "Contratos", tag: "importante", orden: 72, descripcion: "Reglas arts. 1560-1566: intención, favor debitoris", subContenido: "Intención (art. 1560) · Naturaleza contrato (1563) · En contra del redactor (1566)", articulosCC: "Arts. 1560-1566", articulosCPC: null, articulosCOT: null },
];

// ─── Titulo → InstitucionId mapping ──────────────────────
const TITULO_MAP: Record<string, number> = {
  // Teoría de la Ley
  TP_1: 1, TP_2: 1, TP_6: 1,
  TP_3: 1, // Efectos de la ley
  TP_4: 2, // Interpretación
  TP_5: 1, // Definiciones frecuentes
  // Personas
  LI_T1: 4, LI_T2: 4, LI_T3: 8,
  LI_T4: 8, LI_T5: 9,
  LI_T6: 11, // Obligaciones cónyuges → regímenes
  LI_T7: 13, LI_T8: 13, // Filiación
  LI_T9: 14, LI_T10: 14, // Cuidado personal / patria potestad
  LI_T16: 16, LI_T17: 5, LI_T18: 15, // Habilitación, estado civil, alimentos
  LI_T19: 16, LI_T20: 16, LI_T21: 16, LI_T22: 16, LI_T23: 16, LI_T24: 16,
  LI_T25: 16, LI_T26: 16, LI_T27: 16, LI_T28: 16, LI_T29: 16,
  LI_T30: 16, LI_T31: 16, LI_T32: 16,
  LI_T33: 7, // Personas jurídicas
  // Bienes
  LII_T1: 18, LII_T2: 19, LII_T3: 18,
  LII_T4: 20, LII_T5: 20, // Ocupación, accesión → modos
  LII_T6: 21, // Tradición
  LII_T7: 22, // Posesión
  LII_T8: 19, LII_T9: 25, LII_T10: 25, LII_T11: 25, // Limitaciones
  LII_T12: 24, LII_T13: 24, LII_T14: 24, // Acciones protectoras
  // Sucesiones
  LIII_T1: 26, LIII_T2: 27, LIII_T3: 28, LIII_T4: 28, LIII_T5: 28,
  LIII_T6: 28, LIII_T7: 26, LIII_T8: 28, LIII_T9: 28,
  LIII_T10: 29, LIII_T11: 26, LIII_T12: 26, LIII_T13: 50,
  // Obligaciones y contratos (Libro IV)
  LIV_T1: 30, LIV_T2: 31, LIV_T3: 38, LIV_T4: 34, LIV_T5: 34,
  LIV_T6: 38, LIV_T7: 38, LIV_T8: 38, LIV_T9: 38, LIV_T10: 38,
  LIV_T11: 38, LIV_T12: 39, LIV_T13: 72, // Interpretación contractual
  LIV_T14: 40, LIV_T15: 40, LIV_T16: 40, LIV_T17: 40, LIV_T18: 40,
  LIV_T19: 40, LIV_T20: 35, LIV_T21: 61, // Prueba obligaciones
  LIV_T22: 11, LIV_T22A: 11, // Regímenes patrimoniales
  LIV_T23: 45, LIV_T24: 50, LIV_T25: 50, LIV_T26: 47, LIV_T27: 50,
  LIV_T28: 48, LIV_T29: 46, LIV_T30: 50, LIV_T31: 50, LIV_T32: 50,
  LIV_T33: 50, LIV_T34: 42, LIV_T35: 42, // Delitos y cuasidelitos
  LIV_T36: 49, LIV_T37: 49, LIV_T38: 49, // Cauciones
  LIV_T39: 50, LIV_T40: 50, LIV_T41: 49, LIV_T42: 43, // Prescripción
  LIV_TFINAL: 1,
  // CPC
  CPC_LI_T1: 52, CPC_LI_T2: 54, CPC_LI_T3: 54,
  CPC_LI_T4: 58, CPC_LI_T5: 60, CPC_LI_T6: 56,
  CPC_LI_T7: 60, CPC_LI_T7B: 60, CPC_LI_T8: 60,
  CPC_LI_T9: 59, CPC_LI_T10: 59, CPC_LI_T11: 53,
  CPC_LI_T12: 70, CPC_LI_T13: 58, CPC_LI_T14: 58,
  CPC_LI_T15: 59, CPC_LI_T16: 59,
  CPC_LI_T17: 57, CPC_LI_T18: 63, CPC_LI_T19: 64, CPC_LI_T20: 58,
  CPC_LII_T1: 60, CPC_LII_T2: 60, CPC_LII_T3: 55,
  CPC_LII_T4: 60, CPC_LII_T5: 60, CPC_LII_T6: 55,
  CPC_LII_T7: 60, CPC_LII_T8: 55, CPC_LII_T9: 61,
  CPC_LII_T10: 61, CPC_LII_T11: 61, CPC_LII_T12: 60,
  CPC_LIII_T1: 64, CPC_LIII_T2: 64, CPC_LIII_T3: 65,
  CPC_LIII_T4: 65, CPC_LIII_T5: 65, CPC_LIII_T6: 65,
  CPC_LIII_T7: 65, CPC_LIII_T8: 65, CPC_LIII_T9: 29,
  CPC_LIII_T10: 65, CPC_LIII_T11: 65, CPC_LIII_T12: 65,
  CPC_LIII_T13: 65, CPC_LIII_T14: 65, CPC_LIII_T15: 65,
  CPC_LIII_T16: 65, CPC_LIII_T17: 9, CPC_LIII_T18: 49,
  CPC_LIII_T19: 63, CPC_LIII_T20: 63,
  CPC_LIV_T1: 66, CPC_LIV_T2: 66, CPC_LIV_T3: 66,
  CPC_LIV_T4: 66, CPC_LIV_T5: 66, CPC_LIV_T6: 16,
  CPC_LIV_T7: 66, CPC_LIV_T8: 26, CPC_LIV_T9: 66,
  CPC_LIV_T10: 66, CPC_LIV_T11: 66, CPC_LIV_T12: 66,
  CPC_LIV_T13: 66, CPC_LIV_T14: 66, CPC_LIV_T15: 66,
  CPC_LIV_TFINAL: 66,
  // COT
  COT_T1: 68, COT_T2: 68, COT_T3: 68, COT_T4: 68, COT_T5: 68, COT_T6: 68,
  COT_T6B: 68, COT_T7: 53, COT_T8: 68, COT_T9: 68,
  COT_T10: 68, COT_T11: 69, COT_T12: 69,
  COT_T13: 69, COT_T14: 68, COT_T15: 69,
  COT_T16: 70, COT_T17: 69, COT_TFINAL: 68,
};

async function main() {
  console.log("═══ SEED INSTITUCIONES ═══\n");

  // 1. Upsert 72 instituciones
  let created = 0;
  for (const inst of instituciones) {
    await prisma.institucionJuridica.upsert({
      where: { id: inst.id },
      create: inst,
      update: inst,
    });
    created++;
  }
  console.log(`✅ ${created} instituciones insertadas\n`);

  // 2. Classify existing content using TITULO_MAP
  console.log("── Clasificando contenido existente ──\n");

  const stats: Record<string, { updated: number; skipped: number }> = {};

  // Helper for enum-titulo models (flashcard, mcq, trueFalse)
  async function classifyEnum(
    modelName: string,
    findAll: () => Promise<{ id: string; titulo: string }[]>,
    updateOne: (id: string, instId: number) => Promise<void>
  ) {
    const rows = await findAll();
    let updated = 0, skipped = 0;
    for (const row of rows) {
      const instId = TITULO_MAP[row.titulo];
      if (instId) {
        await updateOne(row.id, instId);
        updated++;
      } else {
        skipped++;
      }
    }
    stats[modelName] = { updated, skipped };
    console.log(`  ${modelName}: ${updated} clasificados, ${skipped} sin match`);
  }

  // Helper for string-titulo models
  async function classifyString(
    modelName: string,
    findAll: () => Promise<{ id: string; titulo: string | null }[]>,
    updateOne: (id: string, instId: number) => Promise<void>
  ) {
    const rows = await findAll();
    let updated = 0, skipped = 0;
    for (const row of rows) {
      if (!row.titulo) { skipped++; continue; }
      const instId = TITULO_MAP[row.titulo];
      if (instId) {
        await updateOne(row.id, instId);
        updated++;
      } else {
        skipped++;
      }
    }
    stats[modelName] = { updated, skipped };
    console.log(`  ${modelName}: ${updated} clasificados, ${skipped} sin match`);
  }

  // Helper for tituloMateria models
  async function classifyTM(
    modelName: string,
    findAll: () => Promise<{ id: string; tituloMateria: string | null }[]>,
    updateOne: (id: string, instId: number) => Promise<void>
  ) {
    const rows = await findAll();
    let updated = 0, skipped = 0;
    for (const row of rows) {
      if (!row.tituloMateria) { skipped++; continue; }
      const instId = TITULO_MAP[row.tituloMateria];
      if (instId) {
        await updateOne(row.id, instId);
        updated++;
      } else {
        skipped++;
      }
    }
    stats[modelName] = { updated, skipped };
    console.log(`  ${modelName}: ${updated} clasificados, ${skipped} sin match`);
  }

  await classifyEnum("Flashcard",
    () => prisma.flashcard.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.flashcard.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyEnum("MCQ",
    () => prisma.mCQ.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.mCQ.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyEnum("TrueFalse",
    () => prisma.trueFalse.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.trueFalse.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyString("Definicion",
    () => prisma.definicion.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.definicion.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyString("FillBlank",
    () => prisma.fillBlank.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.fillBlank.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyString("ErrorIdentification",
    () => prisma.errorIdentification.findMany({ where: { institucionId: null }, select: { id: true, titulo: true } }),
    async (id, instId) => { await prisma.errorIdentification.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyTM("OrderSequence",
    () => prisma.orderSequence.findMany({ where: { institucionId: null }, select: { id: true, tituloMateria: true } }),
    async (id, instId) => { await prisma.orderSequence.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyTM("MatchColumns",
    () => prisma.matchColumns.findMany({ where: { institucionId: null }, select: { id: true, tituloMateria: true } }),
    async (id, instId) => { await prisma.matchColumns.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyTM("CasoPractico",
    () => prisma.casoPractico.findMany({ where: { institucionId: null }, select: { id: true, tituloMateria: true } }),
    async (id, instId) => { await prisma.casoPractico.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyTM("DictadoJuridico",
    () => prisma.dictadoJuridico.findMany({ where: { institucionId: null }, select: { id: true, tituloMateria: true } }),
    async (id, instId) => { await prisma.dictadoJuridico.update({ where: { id }, data: { institucionId: instId } }); }
  );
  await classifyTM("Timeline",
    () => prisma.timeline.findMany({ where: { institucionId: null }, select: { id: true, tituloMateria: true } }),
    async (id, instId) => { await prisma.timeline.update({ where: { id }, data: { institucionId: instId } }); }
  );

  // Summary
  let totalUpdated = 0, totalSkipped = 0;
  for (const s of Object.values(stats)) {
    totalUpdated += s.updated;
    totalSkipped += s.skipped;
  }
  const total = totalUpdated + totalSkipped;
  const pct = total > 0 ? Math.round((totalUpdated / total) * 100) : 0;

  console.log(`\n═══ RESUMEN ═══`);
  console.log(`  Total clasificados: ${totalUpdated} / ${total} (${pct}%)`);
  console.log(`  Sin clasificar: ${totalSkipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
