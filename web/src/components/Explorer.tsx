"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  HelpCircle,
  Layers,
  LoaderCircle,
  Maximize2,
  MousePointer2,
  RotateCcw,
  X,
  Search,
} from "lucide-react";
import { loadData, useExplorer } from "@/lib/store";
import { indexOf } from "@/lib/geometry";
import {
  regions,
  windowPresets,
  type RegionId,
  type WindowPreset,
} from "@/lib/regions";
import SlicePanel from "./SlicePanel";
import LearningPanel, { type LearningMode } from "./LearningPanel";
const AnatomyScene = dynamic(() => import("./AnatomyScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <LoaderCircle className="spin" size={20} /> Preparando o modelo 3D
    </div>
  ),
});
const notes: Record<string, string> = {
  liver:
    "Explore sua relação com o estômago, os grandes vasos e o rim direito.",
  spleen: "Observe sua posição lateral ao estômago e próxima ao rim esquerdo.",
  stomach: "Acompanhe o contorno do estômago entre o fígado e o baço.",
  kidney_right:
    "Compare os rins e observe a posição do rim direito abaixo do fígado.",
  kidney_left:
    "Localize o rim esquerdo nas três vistas e compare com o rim direito.",
  aorta: "Acompanhe o trajeto da aorta ao longo da coluna vertebral.",
  inferior_vena_cava:
    "Explore a relação entre a veia cava, a aorta e o fígado.",
  spine: "Use a coluna como referência para se orientar entre os cortes.",
};
export default function Explorer() {
  const s = useExplorer();
  const organList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = organList.current;
    const row = list?.querySelector<HTMLElement>(".organ-row.active");
    if (!list || !row) return;
    const a = list.getBoundingClientRect(),
      b = row.getBoundingClientRect();
    if (list.scrollWidth > list.clientWidth)
      list.scrollLeft += b.left - a.left - (a.width - b.width) / 2;
    else if (b.top < a.top || b.bottom > a.bottom)
      list.scrollTop += b.top - a.top - (a.height - b.height) / 2;
  }, [s.selected, s.meta, s.quizTarget]);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [retry, setRetry] = useState(0);
  const [region, setRegion] = useState<RegionId>("abdomen");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [mode, setMode] = useState<LearningMode>("explore");
  const activeRegion = regions.find((r) => r.id === region)!;
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setQuery("");
    setGroup("");
    loadData(region, controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => {
      controller.abort();
    };
  }, [retry, region]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelp(false);
      if (e.key === "Tab") {
        const modal = document.querySelector(".help-dialog");
        const controls = modal?.querySelectorAll<HTMLButtonElement>("button");
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const organ = s.meta?.organs.find((o) => o.id === s.selected);
  const currentLabel =
    s.meta && s.labels ? s.labels[indexOf(s.crosshair, s.meta.shape)] : 0;
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const listed =
    s.meta?.organs.filter(
      (o) =>
        (!group || o.group === group) &&
        normalize(`${o.display_name} ${o.latin}`).includes(normalize(query)),
    ) ?? [];
  const groups = [
    ...new Set(s.meta?.organs.map((o) => o.group).filter(Boolean)),
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="Anatomy Atlas, início"
        >
          <span className="brand-mark">
            <img
              src="/atlas-mark.svg"
              width={44}
              height={44}
              alt=""
            />
          </span>
          <span className="brand-wordmark">
            <strong>Anatomy Atlas</strong>
            <span>
              <b>Versão educacional</b>
            </span>
          </span>
          <span className="brand-divider" />
          <span className="brand-subtitle">Anatomia em perspectiva</span>
        </a>
        <div className="top-actions">
          <span className="education-pill">
            <span /> Laboratório de anatomia
          </span>
          <button className="quiet-button" onClick={() => setHelp(true)}>
            <HelpCircle size={16} />
            <span>Como explorar</span>
          </button>
        </div>
      </header>
      <main>
        <div className="workspace-heading">
          <div>
            <span className="section-kicker">Atlas interativo</span>
            <h1>Anatomia em quatro perspectivas.</h1>
          </div>
          <div className="dataset-info">
            <span className="live-dot" />
            {s.meta?.modality === "MRI" ? "RM · atlas médio" : "TC real"}
            <span className="separator">/</span>
            <span>
              {s.meta
                ? `${s.meta.modality === "MRI" ? "" : "Caso "}${s.meta.subject}`
                : "Carregando caso"}
            </span>
          </div>
        </div>
        <nav className="region-nav" aria-label="Regiões anatômicas">
          {regions.map((r) => (
            <button
              key={r.id}
              aria-pressed={region === r.id}
              onClick={() => setRegion(r.id)}
              data-testid={`region-${r.id}`}
            >
              <span>{r.short}</span>
              {r.name}
            </button>
          ))}
        </nav>
        <div className="region-caption">
          <p>{activeRegion.description}</p>
          <span>Exames de referência distintos por região</span>
        </div>
        <div className="learning-toolbar">
          <div
            className="mode-switch"
            role="group"
            aria-label="Modo de aprendizagem"
          >
            {(
              [
                ["explore", "Explorar"],
                ["study", "Estudar"],
                ["quiz", "Quiz"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <p>
            {mode === "explore"
              ? "Gire. Selecione. Compare."
              : mode === "study"
                ? "Fichas com referências e percursos pelas estruturas."
                : "Reconheça a anatomia sem os nomes visíveis."}
          </p>
          {s.meta?.modality === "MRI" && (
            <label className="window-picker">
              Sequência de RM
              <select
                aria-label="Sequência de RM"
                value={s.sequence}
                onChange={(e) =>
                  useExplorer.setState({
                    sequence: e.target.value as "t1" | "t2",
                  })
                }
              >
                <option value="t1">T1 · anatomia</option>
                <option value="t2">T2 · contraste de tecidos</option>
              </select>
            </label>
          )}
        </div>
        {s.meta && !error && (
          <LearningPanel key={region} mode={mode} region={region} />
        )}
        {error ? (
          <div className="loading-card" role="alert">
            <h2>Não foi possível carregar o exame</h2>
            <p>{error}</p>
            <button
              className="primary-button"
              onClick={() => {
                setError("");
                setRetry((r) => r + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : !s.meta ? (
          <div className="loading-card" role="status">
            <LoaderCircle className="spin" size={28} />
            <h2>Preparando {activeRegion.name.toLowerCase()}</h2>
            <p>Carregando as imagens e as estruturas anatômicas…</p>
          </div>
        ) : (
          <div
            className="workspace"
            data-testid="explorer"
            data-crosshair={s.crosshair.join(",")}
            data-current-label={currentLabel}
            data-region={region}
          >
            <aside className="sidebar">
              {s.quizTarget !== null ? (
                <div className="quiz-sidebar">
                  <span className="section-kicker">
                    Reconhecimento anatômico
                  </span>
                  <h3>Observe a seleção</h3>
                  <p>
                    Os nomes ficam ocultos durante a pergunta. Use o modelo e os
                    cortes para decidir.
                  </p>
                  <p>Responda nas alternativas acima para continuar.</p>
                </div>
              ) : (
                <>
                  <div className="sidebar-heading">
                    <span>Estruturas</span>
                    <span className="count">
                      {String(s.meta.organs.length).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="sidebar-intro">
                    Selecione uma estrutura para encontrá-la nas quatro vistas.
                  </p>
                  <label className="structure-search">
                    <Search size={13} />
                    <input
                      aria-label="Buscar estrutura"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar estrutura…"
                      type="search"
                    />
                  </label>
                  {groups.length > 1 && (
                    <select
                      className="group-select"
                      aria-label="Filtrar estruturas"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="">Todas as estruturas</option>
                      {groups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="organ-list" ref={organList}>
                    {!listed.length && (
                      <p className="empty-search">
                        Nenhuma estrutura encontrada.
                      </p>
                    )}
                    {listed.map((o) => (
                      <div
                        key={o.id}
                        className={`organ-row ${s.selected === o.id ? "active" : ""} ${!s.visible.includes(o.id) ? "hidden-organ" : ""}`}
                        style={
                          { "--organ-color": o.color } as React.CSSProperties
                        }
                      >
                        <button
                          className="organ-select"
                          onClick={() => s.select(o.id)}
                          aria-pressed={s.selected === o.id}
                          data-testid={`select-${o.name}`}
                        >
                          <span className="organ-swatch" />
                          <span>{o.display_name}</span>
                          <ChevronRight size={12} className="organ-chevron" />
                        </button>
                        <button
                          className="visibility-button"
                          onClick={() => s.toggle(o.id)}
                          aria-label={`${s.visible.includes(o.id) ? "Ocultar" : "Mostrar"} ${o.display_name.toLowerCase()}`}
                          aria-pressed={s.visible.includes(o.id)}
                        >
                          {s.visible.includes(o.id) ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="sidebar-bottom">
                    <div className="selected-note">
                      <span className="section-kicker">Olhe mais de perto</span>
                      <p>
                        {organ &&
                          (organ.note ||
                            notes[organ.name] ||
                            "Selecione, isole e compare esta estrutura nos três planos da tomografia.")}
                      </p>
                    </div>
                    <button className="reset-button" onClick={s.reset}>
                      <RotateCcw size={14} />
                      Restaurar exploração
                    </button>
                  </div>
                </>
              )}
            </aside>
            <div className="views-grid">
              <section className="panel model-panel">
                <header className="panel-header">
                  <div>
                    <span className="panel-index">01</span>
                    <h2>Visão tridimensional</h2>
                  </div>
                  <span className="tiny-tag">3D</span>
                </header>
                <div className="model-viewport">
                  <div className="organ-title" key={organ?.id}>
                    <span className="section-kicker">
                      {s.quizHidden
                        ? "Observe a forma e a posição"
                        : organ?.latin}
                    </span>
                    <h2 style={{ color: organ?.color }}>
                      {s.quizHidden
                        ? "Estrutura em destaque"
                        : organ?.display_name}
                    </h2>
                  </div>
                  <AnatomyScene key={region} />
                  <div className="model-hint">
                    <MousePointer2 size={11} /> Arraste para girar · Role para
                    aproximar
                  </div>
                </div>
                <div className="model-controls">
                  <button
                    onClick={() => s.setPlanes(!s.planes)}
                    aria-pressed={s.planes}
                  >
                    <Layers size={13} />
                    Planos
                    <span className={`mini-toggle ${s.planes ? "on" : ""}`} />
                  </button>
                  <button
                    onClick={s.isolate}
                    aria-pressed={
                      s.visible.length === 1 && s.visible[0] === s.selected
                    }
                  >
                    <Focus size={13} />
                    {s.visible.length === 1 ? "Ver todos" : "Isolar estrutura"}
                  </button>
                  <button
                    className="icon-only"
                    aria-label="Restaurar câmera"
                    onClick={() =>
                      useExplorer.setState({ cameraReset: s.cameraReset + 1 })
                    }
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </section>
              <SlicePanel plane="axial" />
              <SlicePanel plane="coronal" />
              <SlicePanel plane="sagittal" />
            </div>
          </div>
        )}
        {s.meta && (
          <div className="workspace-bottom">
            <span className="sync-status">
              <Check size={13} />
              Vistas sincronizadas{" "}
              <span className="coordinates">
                i {s.crosshair[0]} · j {s.crosshair[1]} · k {s.crosshair[2]}
              </span>
            </span>
            {s.meta.ct_dtype && s.meta.modality !== "MRI" && (
              <label className="window-picker">
                Janela de TC
                <select
                  aria-label="Janela de TC"
                  value={s.windowPreset}
                  onChange={(e) =>
                    useExplorer.setState({
                      windowPreset: e.target.value as WindowPreset,
                    })
                  }
                >
                  {Object.entries(windowPresets).map(([id, w]) => (
                    <option key={id} value={id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="window-picker">
              Camada anatômica
              <select
                aria-label="Camada anatômica"
                value={
                  !s.overlays ? "off" : s.overlayFill ? "color" : "outline"
                }
                onChange={(e) =>
                  useExplorer.setState({
                    overlays: e.target.value !== "off",
                    overlayFill: e.target.value === "color",
                  })
                }
              >
                <option value="outline">Contorno da seleção</option>
                <option value="color">Contornos e cores</option>
                <option value="off">Sem sobreposição</option>
              </select>
            </label>
            <button
              className="overlay-toggle"
              aria-pressed={s.smoothImages}
              onClick={() =>
                useExplorer.setState({ smoothImages: !s.smoothImages })
              }
              title="Suaviza a ampliação dos pixels na tela. Os valores do volume permanecem intactos."
            >
              <span className={`mini-toggle ${s.smoothImages ? "on" : ""}`} />
              Interpolação suave
            </button>
          </div>
        )}
        {s.meta?.coverage && <p className="coverage-note">{s.meta.coverage}</p>}
      </main>
      <footer>
        <span>Feito para aprender. Não utilizar para diagnóstico.</span>
        <a
          href={s.meta?.source.url ?? "https://zenodo.org/records/10047263"}
          target="_blank"
          rel="noreferrer"
        >
          {s.meta
            ? `${s.meta.source.attribution} · ${s.meta.source.license}`
            : "Dados e atribuição do exame"}
          <ArrowUpRight size={12} />
        </a>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close-dialog"
              aria-label="Fechar ajuda"
              onClick={() => setHelp(false)}
            >
              <X size={18} />
            </button>
            <span className="section-kicker">Seu guia de exploração</span>
            <h2 id="help-title">Encontre. Gire. Conecte.</h2>
            <ol>
              <li>
                <strong>Escolha uma estrutura.</strong> O nome na lista leva a
                mira para dentro da estrutura nas quatro vistas. Use a busca e
                os filtros para encontrar os ossos menores.
              </li>
              <li>
                <strong>Explore o modelo.</strong> Arraste para girar, use a
                roda ou o gesto de pinça para aproximar e clique em uma
                estrutura para localizá-lo.
              </li>
              <li>
                <strong>Percorra os cortes.</strong> Clique ou arraste a mira.
                Use os controles abaixo da imagem ou a roda do mouse para mudar
                de corte.
              </li>
            </ol>
            <p>
              <strong>Orientação:</strong> R é o lado direito do paciente; L, o
              esquerdo. A/P indicam anterior/posterior e S/I, superior/inferior.
            </p>
            <p className="help-keyboard">
              Teclado nos cortes: setas movem a mira; Page Up e Page Down mudam
              o corte. O seletor “Janela de TC” ajusta o contraste para
              encéfalo, tecidos moles ou ossos nos volumes com dados HU.
            </p>
            <p>
              Use o ícone de expansão no cabeçalho de cada corte para vê-lo
              maior. Escape retorna às quatro vistas. “Interpolação suave” reduz
              os blocos visíveis ao ampliar; “Camada anatômica” permite ver
              somente o contorno, as cores ou a TC sem sobreposição.
            </p>
            <p>
              Neuroanatomia usa um atlas médio de ressonância T1/T2 com 95
              estruturas. Estudar abre fichas e roteiros; Quiz propõe cinco
              perguntas e salva o progresso neste navegador. Cabeça e pescoço,
              abdômen e membros inferiores são exames de indivíduos diferentes.
              Pelve, coxas, pernas e pés compartilham o mesmo caso. Na parte
              inferior, as estruturas selecionáveis são ósseas.
            </p>
            <button className="primary-button" onClick={() => setHelp(false)}>
              Começar a explorar <ArrowUpRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
