"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { BrandEmblem } from "./brand-emblem";
import {
  chapterAt,
  chapters,
  DURATION,
  VISIT_KEY,
  louisiana,
} from "@/lib/restore/story";
import type { World } from "@/lib/restore/world";
import type { createSound } from "@/lib/restore/audio";

type Sound = ReturnType<typeof createSound>;
type Mode = "entry" | "film" | "site";
const outline = louisiana
  .map(([x, y]) => `${(x + 8) * 12},${(y + 11) * 12}`)
  .join(" ");
export function RestoreExperience() {
  const [mode, setMode] = useState<Mode>("entry");
  const [returning, setReturning] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [lightweight, setLightweight] = useState(false);
  const [paused, setPaused] = useState(false);
  const [audible, setAudible] = useState(false);
  const [time, setTime] = useState(0);
  const [rendererReady, setRendererReady] = useState(false);
  const panel = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null),
    sound = useRef<Sound | null>(null);
  const elapsed = useRef(0),
    running = useRef(false),
    muted = useRef(true),
    generation = useRef(0);
  const chapter = chapterAt(time);
  const transitionAt = [6, 10, 14, 18].reduce(
    (opacity, at) =>
      Math.max(opacity, Math.max(0, 1 - Math.abs(time - at - 0.15) / 0.6)),
    0,
  );
  const openingOpacity = reduced
    ? 1
    : Math.min(1, Math.max(0, (time - 1.25) / 0.75));
  const finish = useCallback(() => {
    running.current = false;
    generation.current++;
    sound.current?.dispose();
    sound.current = null;
    world.current?.dispose();
    world.current = null;
    try {
      localStorage.setItem(VISIT_KEY, "seen");
    } catch {
      /* Storage is optional. */
    }
    setReturning(true);
    setMode("site");
    setAudible(false);
    muted.current = true;
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("#home-content h1");
      heading?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const update = () => {
      setReduced(media.matches);
      if (media.matches) {
        generation.current++;
        running.current = false;
        setPaused(true);
        world.current?.dispose();
        world.current = null;
        setRendererReady(false);
        sound.current?.active(false);
      }
    };
    const frame = requestAnimationFrame(() => {
      update();
      setLightweight(
        Boolean(
          nav.connection?.saveData ||
          (nav.deviceMemory && nav.deviceMemory <= 4) ||
          navigator.hardwareConcurrency <= 2,
        ),
      );
      try {
        setReturning(localStorage.getItem(VISIT_KEY) === "seen");
      } catch {}
    });
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (mode === "site") return;
    const blocked = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".site-header,.footer,.preview-banner,.skip-link,#home-content",
      ),
    );
    const originals = blocked.map((el) => el.inert);
    blocked.forEach((el) => (el.inert = true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],summary",
        ) ?? [],
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      blocked.forEach((el, i) => (el.inert = originals[i]));
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
    };
  }, [mode, finish]);

  useEffect(() => {
    if (mode !== "film") return;
    let frame = 0,
      last = performance.now(),
      lastUI = 0,
      lastRender = 0,
      lastChapter = -1,
      slowFrames = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (running.current && !document.hidden) {
        elapsed.current = Math.min(DURATION, elapsed.current + delta / 1000);
        if (now - lastRender > 32) {
          const start = performance.now();
          if (world.current) {
            try {
              setRendererReady(world.current.render(elapsed.current));
            } catch {
              world.current.dispose();
              world.current = null;
              setRendererReady(false);
              setLightweight(true);
            }
          }
          lastRender = now;
          if (world.current && (performance.now() - start > 65 || delta > 100))
            slowFrames++;
          else slowFrames = Math.max(0, slowFrames - 1);
          if (slowFrames > 12) {
            world.current?.dispose();
            world.current = null;
            setRendererReady(false);
            setLightweight(true);
          }
        }
        const next = chapterAt(elapsed.current);
        if (next !== lastChapter) {
          lastChapter = next;
          sound.current?.cue(next);
        }
        if (now - lastUI > 80) {
          setTime(elapsed.current);
          lastUI = now;
        }
        if (elapsed.current >= DURATION) {
          finish();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      if (document.hidden) {
        running.current = false;
        setPaused(true);
        sound.current?.active(false);
      }
      last = performance.now();
    };
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [mode, finish]);

  useEffect(
    () => () => {
      generation.current++;
      world.current?.dispose();
      sound.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    if (mode !== "film" || chapter >= 6) return;
    if (chapter === 0) {
      const emblem = new window.Image();
      emblem.src = "/brand/fix-it-collective-768.webp";
    }
    const image = new window.Image();
    image.src = `/restore/scene-${Math.max(1, chapter + 1)}.webp`;
  }, [mode, chapter]);

  async function start() {
    const token = ++generation.current;
    elapsed.current = 0;
    setTime(0);
    setPaused(reduced);
    setRendererReady(false);
    setMode("film");
    running.current = !reduced;
    if (reduced || lightweight) return;
    // Import only on activation. The lightweight film starts immediately while 3D initializes.
    const started = performance.now();
    try {
      const { createWorld } = await import("@/lib/restore/world");
      if (
        token !== generation.current ||
        !canvas.current ||
        performance.now() - started > 2500
      )
        return;
      const candidate = createWorld(canvas.current, () => {
        world.current?.dispose();
        world.current = null;
        setRendererReady(false);
        setLightweight(true);
      });
      if (token !== generation.current) {
        candidate.dispose();
        return;
      }
      world.current = candidate;
      setRendererReady(candidate.render(elapsed.current));
    } catch {
      if (token === generation.current) setLightweight(true);
    }
  }
  function togglePause() {
    running.current = paused;
    setPaused(!paused);
    sound.current?.active(paused && !muted.current);
  }
  async function toggleAudio() {
    const next = !audible,
      token = generation.current;
    setAudible(next);
    muted.current = !next;
    try {
      if (next && !sound.current) {
        const { createSound } = await import("@/lib/restore/audio");
        if (token !== generation.current || muted.current) return;
        sound.current = createSound();
      }
      sound.current?.active(next && running.current);
    } catch {
      setAudible(false);
      muted.current = true;
    }
  }
  function nextChapter() {
    const next = chapter + 1;
    if (next >= chapters.length) {
      finish();
      return;
    }
    elapsed.current = chapters[next].at;
    setTime(elapsed.current);
  }

  if (mode === "site")
    return (
      <button
        className="restore-replay"
        onClick={() => {
          setMode("entry");
          setRendererReady(false);
          setTime(0);
        }}
      >
        Replay Experience <ArrowUpRight size={14} />
      </button>
    );
  return (
    <section
      ref={panel}
      className={`restore ${mode} ${reduced ? "is-reduced" : ""} ${paused ? "is-paused" : ""} ${time >= 27 ? "is-passing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      data-renderer={rendererReady ? "webgl" : "lightweight"}
    >
      <div className="restore-atmosphere" aria-hidden="true" />
      {mode === "entry" ? (
        <>
          <div className="restore-top">
            <span>EUNICE, LOUISIANA</span>
            <span>A COLLECTIVE BUILT AROUND YOU</span>
          </div>
          <svg
            className="restore-state"
            viewBox="0 0 200 250"
            aria-hidden="true"
          >
            <polyline points={outline} />
          </svg>
          <div className="restore-entry">
            <BrandEmblem size={200} eager />
            <p className="restore-kicker">
              PEOPLE · BEAUTY · WELLNESS · COMMUNITY
            </p>
            <h2 id="restore-title">
              Restore
              <span>
                what makes you, <em>you.</em>
              </span>
            </h2>
            <p className="restore-invitation">
              A thread of care. A world of connection.
            </p>
            <button
              className="restore-enter"
              onClick={returning || reduced ? finish : start}
            >
              {returning || reduced ? "ENTER SITE" : "ENTER THE EXPERIENCE"}
              <ArrowUpRight size={17} />
            </button>
            {returning || reduced ? (
              <button className="restore-text-button" onClick={start}>
                {reduced
                  ? "Explore the story at your pace"
                  : "Replay Experience"}
              </button>
            ) : (
              <button className="restore-text-button" onClick={finish}>
                Skip Experience
              </button>
            )}
          </div>
          <div className="restore-bottom">
            <span>RESTORE CONFIDENCE. TOGETHER.</span>
            <span>
              {reduced
                ? "YOUR PACE · YOUR CHOICE"
                : "A 29-SECOND BRAND FILM · SOUND OPTIONAL"}
            </span>
          </div>
        </>
      ) : (
        <>
          <h2 id="restore-title" className="sr-only">
            RESTORE — the Fix It Collective story
          </h2>
          <div
            className={`restore-film-world ${rendererReady ? "is-ready" : ""}`}
            style={{ opacity: openingOpacity }}
            aria-hidden="true"
          >
            <div className="restore-stills">
              {[
                Math.max(1, Math.min(chapter, 6) - 1),
                Math.max(1, Math.min(chapter, 6)),
              ]
                .filter((value, index, all) => all.indexOf(value) === index)
                .map((i) => (
                  <Image
                    key={i}
                    src={`/restore/scene-${i}.webp`}
                    alt=""
                    fill
                    unoptimized
                    sizes="100vw"
                    loading="eager"
                    className={
                      i === Math.max(1, Math.min(chapter, 6))
                        ? "current-shot"
                        : "previous-shot"
                    }
                  />
                ))}
            </div>
            <canvas ref={canvas} />
            <div className="restore-vignette" />
            <div
              className="restore-thread"
              style={{ opacity: chapter < 6 ? 1 : 0 }}
            />
          </div>
          {time < 2 && !reduced ? (
            <div className="restore-opening-spark" aria-hidden="true" />
          ) : null}
          <div
            className="restore-passage"
            aria-hidden="true"
            style={{ opacity: reduced ? 0 : transitionAt * 0.74 }}
          />
          <div className="restore-film-top">
            <span>
              FIX IT COLLECTIVE <i>/</i> RESTORE
            </span>
            <button onClick={finish}>
              Skip Experience <ArrowUpRight size={14} />
            </button>
          </div>
          {chapter < 7 ? (
            <div className="restore-caption" key={chapter}>
              <span className="restore-kicker">
                {String(chapter + 1).padStart(2, "0")} /{" "}
                {chapters[chapter].name}
              </span>
              <p>{chapters[chapter].line}</p>
              {reduced ? (
                <span className="restore-description">
                  {chapters[chapter].description}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="restore-reveal">
              <div
                className="restore-seal"
                role="img"
                aria-label="Official Fix It Collective emblem"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div className={`restore-seal-piece piece-${i}`} key={i}>
                    <BrandEmblem size={420} decorative eager />
                  </div>
                ))}
              </div>
              <p>
                RESTORE CONFIDENCE.
                <br />
                <em>TOGETHER.</em>
              </p>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {chapters[chapter].description}
          </p>
          <div className="restore-controls">
            {reduced ? (
              <button onClick={nextChapter}>
                {chapter === 7 ? "Enter site" : "Continue story"}
                <ArrowUpRight size={16} />
              </button>
            ) : (
              <button
                onClick={togglePause}
                aria-label={paused ? "Resume experience" : "Pause experience"}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
                <span>{paused ? "Resume" : "Pause"}</span>
              </button>
            )}
            {!reduced ? (
              <button
                onClick={toggleAudio}
                aria-pressed={audible}
                aria-label={audible ? "Mute sound" : "Enable sound"}
              >
                {audible ? <Volume2 size={17} /> : <VolumeX size={17} />}
                <span>Sound {audible ? "on" : "off"}</span>
              </button>
            ) : null}
            <span className="restore-time">
              {String(Math.floor(time)).padStart(2, "0")} / 29
            </span>
          </div>
          <div
            className="restore-progress"
            role="progressbar"
            aria-label="Film progress"
            aria-valuemin={0}
            aria-valuemax={29}
            aria-valuenow={Math.floor(time)}
          >
            <span style={{ transform: `scaleX(${time / DURATION})` }} />
          </div>
        </>
      )}
      <noscript>
        <style>{`.restore{display:none!important}#home-content *{animation:none!important;transition:none!important}`}</style>
      </noscript>
    </section>
  );
}
