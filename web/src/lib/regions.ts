export const regions = [
  {
    id: "neuro",
    name: "Neuroanatomia · RM",
    short: "RM",
    path: "/data/neuro",
    description:
      "Ressonância T1 e T2, córtex e estruturas profundas do atlas CerebrA.",
  },
  {
    id: "head-neck",
    name: "Cabeça e pescoço",
    short: "01",
    path: "/data/head-neck",
    description: "Encéfalo, crânio, coluna cervical e estruturas do pescoço.",
  },
  {
    id: "abdomen",
    name: "Abdômen",
    short: "02",
    path: "/data",
    description: "Órgãos abdominais, grandes vasos e coluna vertebral.",
  },
  {
    id: "pelvis",
    name: "Pelve",
    short: "03",
    path: "/data/pelvis",
    description: "Sacro, ossos do quadril e porções proximais dos fêmures.",
  },
  {
    id: "legs",
    name: "Coxas e pernas",
    short: "04",
    path: "/data/legs",
    description:
      "Fêmures, patelas, tíbias e fíbulas, dos quadris aos tornozelos.",
  },
  {
    id: "feet",
    name: "Tornozelos e pés",
    short: "05",
    path: "/data/feet",
    description:
      "Tíbias e fíbulas distais, tarsos, metatarsos e falanges dos dois pés.",
  },
] as const;
export type RegionId = (typeof regions)[number]["id"];
export const windowPresets = {
  soft: { width: 400, level: 50, label: "Tecidos moles" },
  bone: { width: 1800, level: 400, label: "Ossos" },
  brain: { width: 80, level: 40, label: "Encéfalo" },
};
export type WindowPreset = keyof typeof windowPresets;
