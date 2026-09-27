"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { useExplorer } from "@/lib/store";
import {
  cardFor,
  sources,
  trails,
  PROGRESS_KEY,
  emptyProgress,
  parseProgress,
  recordAnswer,
  makeQuiz,
  type Progress,
  type Question,
  type Trail,
} from "@/lib/learning";
import type { RegionId } from "@/lib/regions";
export type LearningMode = "explore" | "study" | "quiz";
let sessionProgress: Progress = emptyProgress();
export default function LearningPanel({
  mode,
  region,
}: {
  mode: LearningMode;
  region: RegionId;
}) {
  const s = useExplorer();
  const [progress, setProgress] = useState<Progress>(() => sessionProgress);
  const saved = useRef<Progress>(sessionProgress);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [guide, setGuide] = useState<Trail | null>(null);
  const [step, setStep] = useState(0);
  const answerLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      saved.current = parseProgress(localStorage.getItem(PROGRESS_KEY));
      sessionProgress = saved.current;
      setProgress(saved.current);
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
  }, []);
  const persist = (next: Progress) => {
    sessionProgress = next;
    saved.current = next;
    setProgress(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      setStorageAvailable(false);
    }
  };
  useEffect(() => {
    if (mode !== "quiz") {
      setSession(null);
      setCompleted(false);
    }
    return () => useExplorer.setState({ quizTarget: null, quizHidden: false });
  }, [mode]);
  const question = session?.[index];
  useEffect(() => {
    if (mode !== "quiz" || !question || completed) return;
    useExplorer.setState({ quizTarget: null, quizHidden: false });
    useExplorer.getState().select(question.target.id);
    useExplorer.setState({
      quizTarget: question.target.id,
      quizHidden: true,
      overlays: true,
      visible: useExplorer.getState().meta!.organs.map((o) => o.id),
    });
    answerLock.current = false;
    setAnswer(null);
    setHint(false);
    heading.current?.focus();
  }, [mode, question, completed]);
  const organ = s.meta?.organs.find((o) => o.id === s.selected);
  if (!organ || !s.meta) return null;
  const card = cardFor(organ),
    key = `${region}:${organ.name}`;
  const start = () => {
    setIndex(0);
    setScore(0);
    setCompleted(false);
    setSession(makeQuiz(s.meta!.organs));
  };
  const respond = (id: number) => {
    if (!question || answerLock.current) return;
    answerLock.current = true;
    setAnswer(id);
    useExplorer.setState({ quizHidden: false });
    const correct = id === question.target.id;
    if (correct) setScore((n) => n + 1);
    persist(
      recordAnswer(
        saved.current,
        `${region}:${question.target.name}`,
        correct,
        hint,
      ),
    );
  };
  const next = () => {
    if (!session || answer === null) return;
    if (index + 1 === session.length) {
      setCompleted(true);
      useExplorer.setState({ quizTarget: null, quizHidden: false });
    } else setIndex((n) => n + 1);
  };
  const jump = (trail: Trail, n: number) => {
    setGuide(trail);
    setStep(n);
    const o = s.meta!.organs.find((o) => o.name === trail.steps[n].name);
    if (o) s.select(o.id);
  };
  if (mode === "explore") return null;
  return (
    <section
      className={`learning-panel ${mode === "quiz" ? "quiz-panel" : ""}`}
      aria-label={mode === "quiz" ? "Quiz anatômico" : "Estudo anatômico"}
    >
      <div className="learning-summary">
        <span>
          <BookOpen size={14} />
          {mode === "quiz" ? "Treine seu olhar" : "Aprenda explorando"}
        </span>
        <span data-testid="learning-progress">
          {progress.correct}/{progress.attempts} acertos ·{" "}
          {progress.trails.length}{" "}
          {progress.trails.length === 1
            ? "roteiro concluído"
            : "roteiros concluídos"}
        </span>
        <small>
          {storageAvailable
            ? "Progresso salvo neste navegador"
            : "Armazenamento indisponível · progresso apenas nesta sessão"}
        </small>
      </div>
      {mode === "study" ? (
        <div className="study-columns">
          <article className="anatomy-card" data-testid="anatomy-card">
            <div className="learning-eyebrow">
              Ficha anatômica{card.context ? " · contexto regional" : ""}
            </div>
            <h2>{organ.display_name}</h2>
            <dl>
              <div>
                <dt>{card.context ? "Contexto funcional" : "Função"}</dt>
                <dd>{card.function}</dd>
              </div>
              <div>
                <dt>Relações</dt>
                <dd>{card.relation}</dd>
              </div>
            </dl>
            <p className="observation">
              <Lightbulb size={14} />
              {card.observation}
            </p>
            {organ.note && <p className="card-source-note">{organ.note}</p>}
            <div className="card-links">
              {card.sources.map((id) => (
                <a
                  key={id}
                  href={sources[id].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {sources[id].title} ↗
                </a>
              ))}
            </div>
            <button
              className="learning-secondary"
              disabled={!ready || progress.seen.includes(key)}
              onClick={() =>
                persist({
                  ...saved.current,
                  seen: [...new Set([...saved.current.seen, key])],
                })
              }
            >
              <CheckCircle2 size={14} />
              {progress.seen.includes(key)
                ? "Estrutura estudada"
                : "Marcar como estudada"}
            </button>
          </article>
          <div className="guided-card" data-testid="guided-card">
            <div className="learning-eyebrow">Roteiros guiados</div>
            {!guide ? (
              <>
                <h2>Um caminho para começar.</h2>
                <p>Etapas curtas que posicionam a mira e conectam as vistas.</p>
                <div className="trail-list">
                  {trails[region].map((t) => (
                    <button key={t.id} onClick={() => jump(t, 0)}>
                      <span>
                        <strong>{t.title}</strong>
                        <small>
                          {t.steps.length} etapas · {t.duration}
                          {progress.trails.includes(t.id) ? " · Concluído" : ""}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2>{guide.title}</h2>
                <div
                  className="trail-progress"
                  aria-label={`Etapa ${step + 1} de ${guide.steps.length}`}
                >
                  {guide.steps.map((v, i) => (
                    <button
                      key={v.name}
                      disabled={i > step}
                      aria-label={`Etapa ${i + 1}`}
                      aria-current={i === step ? "step" : undefined}
                      onClick={() => jump(guide, i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <p className="trail-instruction" aria-live="polite">
                  {guide.steps[step].instruction}
                </p>
                <div className="learning-actions">
                  <button
                    className="learning-secondary"
                    onClick={() => jump(guide, step)}
                  >
                    Localizar etapa
                  </button>
                  <button
                    className="learning-primary"
                    onClick={() => {
                      if (step + 1 < guide.steps.length) jump(guide, step + 1);
                      else {
                        persist({
                          ...saved.current,
                          trails: [
                            ...new Set([...saved.current.trails, guide.id]),
                          ],
                        });
                        setGuide(null);
                      }
                    }}
                  >
                    {step + 1 === guide.steps.length
                      ? "Concluir roteiro"
                      : "Próxima etapa"}
                    <ArrowRight size={14} />
                  </button>
                </div>
                <button className="text-button" onClick={() => setGuide(null)}>
                  Ver todos os roteiros
                </button>
              </>
            )}
          </div>
        </div>
      ) : !session ? (
        <div className="quiz-intro">
          <div>
            <h2>Você reconhece a estrutura?</h2>
            <p>
              Cinco perguntas na região atual. Gire o modelo, percorra os cortes
              e escolha uma resposta. As pistas ficam registradas no progresso.
            </p>
            <small>{progress.assisted} respostas com pista até agora.</small>
          </div>
          <button
            className="learning-primary"
            onClick={start}
            disabled={!ready}
          >
            Iniciar quiz <ArrowRight size={16} />
          </button>
        </div>
      ) : completed ? (
        <div className="quiz-intro" role="status">
          <div>
            <div className="learning-eyebrow">
              <Trophy size={15} /> Sessão concluída
            </div>
            <h2>
              {score} de {session.length} acertos
            </h2>
            <p>
              Revise as fichas e tente outra sequência para consolidar o
              reconhecimento.
            </p>
          </div>
          <button className="learning-primary" onClick={start}>
            <RotateCcw size={14} />
            Novo quiz
          </button>
        </div>
      ) : (
        question && (
          <div className="quiz-question">
            <div className="quiz-prompt">
              <span className="learning-eyebrow">
                Questão {index + 1} de {session.length}
              </span>
              <h2 ref={heading} tabIndex={-1}>
                Qual estrutura está em destaque?
              </h2>
              <p>Observe a seleção colorida e a mira nas quatro vistas.</p>
              {answer === null ? (
                <>
                  <button
                    className="learning-secondary"
                    onClick={() => setHint(true)}
                    disabled={hint}
                  >
                    <Lightbulb size={14} />
                    Mostrar pista
                  </button>
                  {hint && (
                    <p className="hint" role="status">
                      Grupo:{" "}
                      {question.target.group ??
                        "Órgãos e referências do abdômen"}
                      .{" "}
                      {question.target.hemisphere === "L"
                        ? "Lado esquerdo."
                        : question.target.hemisphere === "R"
                          ? "Lado direito."
                          : ""}
                    </p>
                  )}
                </>
              ) : (
                <div className="quiz-feedback" role="status">
                  <strong>
                    {answer === question.target.id
                      ? "Resposta correta."
                      : "Vamos revisar."}
                  </strong>
                  <p>
                    {question.target.display_name}.{" "}
                    {cardFor(question.target).relation}
                  </p>
                  <button className="learning-primary" onClick={next}>
                    {index + 1 === session.length
                      ? "Ver resultado"
                      : "Próxima pergunta"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div
              className="quiz-options"
              role="group"
              aria-label="Alternativas"
            >
              {question.options.map((o, i) => (
                <button
                  key={o.id}
                  disabled={answer !== null}
                  data-testid={`quiz-option-${o.id}`}
                  className={
                    answer !== null
                      ? o.id === question.target.id
                        ? "correct"
                        : answer === o.id
                          ? "incorrect"
                          : ""
                      : ""
                  }
                  onClick={() => respond(o.id)}
                >
                  <span>{String.fromCharCode(65 + i)}</span>
                  {o.display_name}
                  {answer !== null && o.id === question.target.id && (
                    <CheckCircle2 size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}
