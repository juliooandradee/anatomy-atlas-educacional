import type { Organ } from "./geometry";
import type { RegionId } from "./regions";
const book = "https://openstax.org/books/anatomy-and-physiology-2e/pages/";
export const sources = {
  cns: {
    title: "OpenStax · Sistema nervoso central",
    url: book + "13-2-the-central-nervous-system",
  },
  processing: {
    title: "OpenStax · Processamento central",
    url: book + "14-2-central-processing",
  },
  skull: { title: "OpenStax · Crânio", url: book + "7-2-the-skull" },
  spine: {
    title: "OpenStax · Coluna vertebral",
    url: book + "7-3-the-vertebral-column",
  },
  pelvis: {
    title: "OpenStax · Cintura pélvica",
    url: book + "8-3-the-pelvic-girdle-and-pelvis",
  },
  limb: {
    title: "OpenStax · Membro inferior",
    url: book + "8-4-bones-of-the-lower-limb",
  },
  liver: {
    title: "OpenStax · Órgãos digestivos acessórios",
    url:
      book +
      "23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder",
  },
  stomach: { title: "OpenStax · Estômago", url: book + "23-4-the-stomach" },
  kidney: {
    title: "OpenStax · Anatomia renal",
    url: book + "25-3-gross-anatomy-of-the-kidney",
  },
  vessels: {
    title: "OpenStax · Vias circulatórias",
    url: book + "20-5-circulatory-pathways",
  },
  spleen: {
    title: "OpenStax · Sistema linfático",
    url: book + "21-1-anatomy-of-the-lymphatic-and-immune-systems",
  },
  airway: {
    title: "OpenStax · Sistema respiratório",
    url: book + "22-1-organs-and-structures-of-the-respiratory-system",
  },
  thyroid: {
    title: "OpenStax · Tireoide",
    url: book + "17-4-the-thyroid-gland",
  },
  atlas: {
    title: "CerebrA · Manera et al., 2020",
    url: "https://doi.org/10.1038/s41597-020-0557-9",
  },
};
type Source = keyof typeof sources;
export type Card = {
  function: string;
  relation: string;
  observation: string;
  sources: Source[];
  context?: boolean;
};
const card = (
  fn: string,
  relation: string,
  source: Source,
  observation = "Isole a estrutura e acompanhe seus limites nos três planos.",
): Card => ({ function: fn, relation, observation, sources: [source] });
const cards: Record<string, Card> = {
  brain: card(
    "Integra percepção, movimento e funções cognitivas.",
    "O encéfalo ocupa a cavidade craniana.",
    "cns",
  ),
  skull: card(
    "Protege o encéfalo e sustenta estruturas da face.",
    "Circunda o conteúdo intracraniano.",
    "skull",
  ),
  spinal_cord: card(
    "Conduz informações e participa de reflexos.",
    "Percorre o canal vertebral.",
    "cns",
  ),
  thyroid_gland: card(
    "Produz hormônios envolvidos no metabolismo.",
    "Situa-se na região anterior do pescoço, junto à traqueia.",
    "thyroid",
  ),
  trachea: card(
    "Conduz o ar em direção aos brônquios.",
    "É anterior ao esôfago.",
    "airway",
  ),
  carotid: card(
    "Origina os ramos carotídeos interno e externo.",
    "Ascende lateralmente às estruturas viscerais do pescoço.",
    "vessels",
  ),
  liver: card(
    "Produz bile e participa do metabolismo e da síntese de proteínas.",
    "Ocupa principalmente o abdômen superior direito, sob o diafragma.",
    "liver",
  ),
  stomach: card(
    "Armazena e mistura o alimento, iniciando a digestão de proteínas.",
    "Comunica o esôfago com o duodeno.",
    "stomach",
  ),
  spleen: card(
    "Filtra o sangue e participa da resposta imune.",
    "Fica no abdômen superior esquerdo, lateral ao estômago.",
    "spleen",
  ),
  kidney: card(
    "Forma urina e participa do equilíbrio de água e eletrólitos.",
    "Os rins são retroperitoneais, de cada lado da coluna.",
    "kidney",
  ),
  aorta: card(
    "Distribui sangue arterial para a circulação sistêmica.",
    "Na região abdominal, passa à frente da coluna.",
    "vessels",
  ),
  inferior_vena_cava: card(
    "Conduz ao coração o retorno venoso de grande parte do corpo inferior.",
    "Ascende geralmente à direita da aorta abdominal.",
    "vessels",
  ),
  spine: card(
    "Sustenta o tronco e protege a medula.",
    "Forma o eixo posterior do esqueleto axial.",
    "spine",
  ),
  vertebra: card(
    "Sustenta a cabeça e permite mobilidade cervical.",
    "Integra a sequência C1–C7.",
    "spine",
  ),
  vertebrae_C1: card(
    "Sustenta o crânio.",
    "Articula-se com os côndilos occipitais e com C2.",
    "spine",
  ),
  vertebrae_C2: card(
    "Participa da rotação da cabeça.",
    "Seu dente relaciona-se com o atlas.",
    "spine",
  ),
  sacrum: card(
    "Transfere carga da coluna à pelve.",
    "Articula-se lateralmente com os ossos do quadril.",
    "pelvis",
  ),
  hip: card(
    "Transmite carga e integra a proteção pélvica.",
    "O acetábulo recebe a cabeça do fêmur.",
    "pelvis",
  ),
  femur: card(
    "Sustenta a coxa.",
    "Articula-se com o quadril e a tíbia.",
    "limb",
  ),
  patella: card(
    "Favorece a extensão do joelho.",
    "Localiza-se à frente do fêmur distal.",
    "limb",
  ),
  tibia: card("Sustenta a maior carga da perna.", "É medial à fíbula.", "limb"),
  fibula: card(
    "Contribui para estabilidade do tornozelo.",
    "É lateral à tíbia.",
    "limb",
  ),
  talus: card("Recebe carga da perna.", "Situa-se sobre o calcâneo.", "limb"),
  calcaneus: card("Compõe o calcanhar.", "Fica inferior ao tálus.", "limb"),
  navicular: card(
    "Integra o arco medial.",
    "Fica entre tálus e cuneiformes.",
    "limb",
  ),
  cuboid: card(
    "Integra a coluna lateral do pé.",
    "Articula-se posteriormente com o calcâneo.",
    "limb",
  ),
  cuneiform: card(
    "Integra os arcos do pé.",
    "Localiza-se entre navicular e metatarsos.",
    "limb",
  ),
  metatarsal: card(
    "Participa do apoio e da propulsão.",
    "Liga o tarso às falanges.",
    "limb",
  ),
  phalange: card(
    "Contribui para apoio e propulsão.",
    "Forma o esqueleto dos dedos.",
    "limb",
  ),
  precentral: card(
    "Abriga o córtex motor primário.",
    "Está anterior ao sulco central.",
    "processing",
  ),
  postcentral: card(
    "Abriga o córtex somatossensitivo primário.",
    "Está posterior ao sulco central.",
    "processing",
  ),
  thalamus: card(
    "Integra e retransmite informações ao córtex.",
    "É uma estrutura profunda do diencéfalo.",
    "processing",
  ),
  hippocampus: card(
    "Participa da formação de memórias.",
    "Ocupa a região temporal medial.",
    "cns",
  ),
  amygdala: card(
    "Participa de processos emocionais e de memória.",
    "Relaciona-se com a região temporal medial.",
    "cns",
  ),
  caudate: card(
    "Participa de circuitos dos núcleos da base.",
    "Tem trajeto curvo próximo ao ventrículo lateral.",
    "cns",
  ),
  putamen: card(
    "Participa de circuitos dos núcleos da base.",
    "É lateral ao globo pálido.",
    "cns",
  ),
  pallidum: card(
    "Integra circuitos dos núcleos da base.",
    "É medial ao putâmen.",
    "cns",
  ),
  brainstem: card(
    "Conecta vias e participa do controle de funções vitais.",
    "Une regiões encefálicas à medula.",
    "processing",
  ),
  optic_chiasm: card(
    "Contém cruzamento parcial de fibras visuais.",
    "Continua em direção aos tratos ópticos.",
    "processing",
  ),
  ventricle: card(
    "Integra os espaços de circulação do líquor.",
    "É uma cavidade no interior do encéfalo.",
    "cns",
  ),
  cerebellum: card(
    "Contribui para coordenação motora e equilíbrio.",
    "Situa-se posteriormente ao tronco encefálico.",
    "processing",
  ),
};
export function cardFor(o: Organ): Card {
  if (cards[o.name]) return cards[o.name];
  const base = o.name.replace(/_(l|r|left|right)$/, "");
  if (cards[base]) return cards[base];
  if (o.name.startsWith("vertebrae_")) return cards.vertebra;
  if (o.name.startsWith("common_carotid")) return cards.carotid;
  if (o.name.startsWith("kidney_")) return cards.kidney;
  if (o.name.includes("cuneiform")) return cards.cuneiform;
  if (o.name.startsWith("metatarsal")) return cards.metatarsal;
  if (o.name.startsWith("phalange")) return cards.phalange;
  if (o.name.includes("ventricle")) return cards.ventricle;
  if (o.name.startsWith("cerebellum") || o.name.startsWith("vermis"))
    return cards.cerebellum;
  // The atlas defines parcels, not isolated functional modules. Keep the
  // broader context explicit for areas without a dedicated authored card.
  const regional: Record<string, string> = {
    "Córtex frontal":
      "O conjunto frontal participa de controle motor, planejamento e funções executivas.",
    "Córtex parietal":
      "O conjunto parietal participa do processamento somatossensitivo e da integração espacial.",
    "Córtex temporal":
      "O conjunto temporal participa de processamento auditivo e memória.",
    "Córtex occipital":
      "O conjunto occipital participa do processamento visual.",
    "Córtex paracentral":
      "A região reúne porções mediais relacionadas às áreas motoras e somatossensitivas.",
    "Cíngulo e ínsula":
      "Estas regiões participam de redes de integração de informação, emoção e estado corporal.",
  };
  const relations: Record<string, string> = {
    "Córtex frontal": "O lobo frontal fica anterior ao sulco central.",
    "Córtex parietal": "O lobo parietal fica posterior ao sulco central.",
    "Córtex temporal":
      "Compare a parcela com o hipocampo e o córtex vizinho nos cortes coronais.",
    "Córtex occipital": "Ocupa a região posterior do hemisfério cerebral.",
    "Córtex paracentral":
      "Relaciona-se à face medial dos giros pré-central e pós-central.",
    "Cíngulo e ínsula":
      base === "insula"
        ? "A ínsula fica profunda ao sulco lateral."
        : "Observe o cíngulo na face medial, junto ao corpo caloso.",
  };
  return {
    function:
      regional[o.group ?? ""] ??
      "Integra circuitos encefálicos; este atlas apresenta sua localização anatômica.",
    relation:
      relations[o.group ?? ""] ??
      `Grupo do atlas: ${o.group ?? "Estruturas profundas"}.`,
    observation:
      "Compare a parcela com suas vizinhas. Limites anatômicos não equivalem a fronteiras funcionais exclusivas.",
    sources: ["atlas", "cns"],
    context: true,
  };
}
export type Trail = {
  id: string;
  title: string;
  duration: string;
  steps: { name: string; instruction: string }[];
};
export const trails: Record<RegionId, Trail[]> = {
  neuro: [
    {
      id: "neuro-cortex",
      title: "Do movimento à percepção",
      duration: "4 min",
      steps: [
        {
          name: "precentral_l",
          instruction:
            "Localize o giro pré-central. Gire o modelo para observar sua extensão.",
        },
        {
          name: "postcentral_l",
          instruction:
            "Compare sua posição com a parcela anterior e acompanhe o limite nos cortes.",
        },
        {
          name: "thalamus_l",
          instruction:
            "Isole o tálamo e observe sua profundidade em relação ao córtex.",
        },
        {
          name: "hippocampus_l",
          instruction:
            "Alterne T1 e T2 sem mover a mira. Compare o contraste e o contexto anatômico.",
        },
      ],
    },
    {
      id: "neuro-liquor",
      title: "Cavidades e referências centrais",
      duration: "3 min",
      steps: [
        {
          name: "lateral_ventricle_l",
          instruction: "Observe a forma da cavidade nas três vistas.",
        },
        {
          name: "third_ventricle",
          instruction: "Localize esta cavidade na linha média.",
        },
        {
          name: "fourth_ventricle",
          instruction: "Compare sua posição com tronco e cerebelo.",
        },
        {
          name: "brainstem",
          instruction:
            "Percorra os cortes de cima para baixo e acompanhe o tronco.",
        },
      ],
    },
  ],
  "head-neck": [
    {
      id: "head-axis",
      title: "Do crânio ao pescoço",
      duration: "4 min",
      steps: [
        {
          name: "skull",
          instruction:
            "Use o contorno ósseo para reconhecer as referências externas.",
        },
        {
          name: "brain",
          instruction:
            "Compare a superfície do encéfalo com o limite interno do crânio.",
        },
        {
          name: "vertebrae_C1",
          instruction: "Encontre o atlas e acompanhe sua forma em anel.",
        },
        {
          name: "vertebrae_C2",
          instruction: "Compare C2 com C1 nas vistas coronal e sagital.",
        },
        {
          name: "thyroid_gland",
          instruction: "Observe a relação espacial da glândula com a traqueia.",
        },
      ],
    },
  ],
  abdomen: [
    {
      id: "abdomen-relations",
      title: "Relações do abdômen",
      duration: "4 min",
      steps: [
        {
          name: "liver",
          instruction:
            "Observe o lado predominante do fígado usando os marcadores R e L.",
        },
        {
          name: "stomach",
          instruction:
            "Localize o estômago e compare sua posição com o fígado.",
        },
        {
          name: "spleen",
          instruction: "Observe sua relação com o estômago nos três planos.",
        },
        {
          name: "kidney_left",
          instruction: "Compare a posição do rim com as estruturas anteriores.",
        },
        { name: "aorta", instruction: "Acompanhe o vaso ao longo da coluna." },
      ],
    },
  ],
  pelvis: [
    {
      id: "pelvis-support",
      title: "O anel pélvico",
      duration: "3 min",
      steps: [
        {
          name: "sacrum",
          instruction: "Localize a referência posterior central.",
        },
        {
          name: "hip_l",
          instruction:
            "Observe o acetábulo e a continuidade do osso do quadril.",
        },
        {
          name: "hip_r",
          instruction: "Compare os dois lados pelas letras R e L.",
        },
        {
          name: "femur_l",
          instruction:
            "Localize a cabeça femoral. Este módulo mostra apenas a porção proximal.",
        },
      ],
    },
  ],
  legs: [
    {
      id: "leg-axis",
      title: "Da coxa ao tornozelo",
      duration: "3 min",
      steps: [
        {
          name: "femur_l",
          instruction: "Percorra o fêmur e observe sua extremidade distal.",
        },
        {
          name: "patella_l",
          instruction: "Localize sua posição anterior no joelho.",
        },
        {
          name: "tibia_l",
          instruction: "Siga a tíbia em direção ao tornozelo.",
        },
        {
          name: "fibula_l",
          instruction: "Compare sua posição com a tíbia no corte axial.",
        },
      ],
    },
  ],
  feet: [
    {
      id: "foot-columns",
      title: "Do retropé aos dedos",
      duration: "4 min",
      steps: [
        {
          name: "talus_l",
          instruction: "Observe sua relação com a pinça do tornozelo.",
        },
        {
          name: "calcaneus_l",
          instruction: "Reconheça a região do calcanhar no plano sagital.",
        },
        {
          name: "navicular_l",
          instruction: "Acompanhe a sequência de ossos do lado medial.",
        },
        {
          name: "metatarsal_1_l",
          instruction:
            "Localize o primeiro metatarso e compare com os vizinhos.",
        },
        {
          name: "phalange_foot_1_1_l",
          instruction: "Finalize na falange proximal do hálux.",
        },
      ],
    },
  ],
};
export type Progress = {
  version: 1;
  attempts: number;
  correct: number;
  assisted: number;
  seen: string[];
  trails: string[];
};
export const emptyProgress = (): Progress => ({
  version: 1,
  attempts: 0,
  correct: 0,
  assisted: 0,
  seen: [],
  trails: [],
});
export const PROGRESS_KEY = "anatomy-atlas-progress-v1";
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? "null");
    if (
      p?.version !== 1 ||
      !Number.isSafeInteger(p.attempts) ||
      p.attempts < 0 ||
      !Number.isSafeInteger(p.correct) ||
      p.correct < 0 ||
      p.correct > p.attempts ||
      !Number.isSafeInteger(p.assisted) ||
      p.assisted < 0 ||
      p.assisted > p.attempts ||
      !Array.isArray(p.seen) ||
      !Array.isArray(p.trails)
    )
      return emptyProgress();
    return {
      ...p,
      seen: p.seen.filter((x: unknown) => typeof x === "string").slice(-2000),
      trails: p.trails
        .filter((x: unknown) => typeof x === "string")
        .slice(-100),
    };
  } catch {
    return emptyProgress();
  }
}
export function recordAnswer(
  p: Progress,
  key: string,
  correct: boolean,
  assisted: boolean,
): Progress {
  return {
    ...p,
    attempts: p.attempts + 1,
    correct: p.correct + Number(correct),
    assisted: p.assisted + Number(assisted),
    seen: [...new Set([...p.seen, key])],
  };
}
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export type Question = { target: Organ; options: Organ[] };
export function makeQuiz(
  organs: Organ[],
  count = 5,
  random = Math.random,
): Question[] {
  return shuffle(organs, random)
    .slice(0, count)
    .map((target) => {
      const others = shuffle(
        organs.filter((o) => o.id !== target.id),
        random,
      );
      const related = others.filter((o) => o.group === target.group);
      const options = [
        ...new Map([...related, ...others].map((o) => [o.id, o])).values(),
      ].slice(0, 3);
      return { target, options: shuffle([target, ...options], random) };
    });
}
