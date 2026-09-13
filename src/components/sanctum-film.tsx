"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sanctumFilm as film } from "@/lib/sanctum-film";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

export function SanctumFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const stopped = useRef(false);
  const synchronize = useRef<() => void>(() => {});
  const [still, setStill] = useState(false);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audible, setAudible] = useState(false);
  const [chapter, setChapter] = useState<string>(film.chapters[0].word);

  useEffect(() => {
    const media = video.current;
    const container = surface.current;
    if (!media || !container) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const source = matchMedia("(max-width: 760px)").matches
      ? film.mobile
      : film.desktop;
    let visible = container.getBoundingClientRect().bottom > 0;
    let disposed = false;
    let failed = false;
    let pending = false;
    let request = 0;
    const conserve = () =>
      preference.matches ||
      connection?.saveData ||
      /(^|-)2g$/.test(connection?.effectiveType ?? "");
    const pause = () => {
      request++;
      pending = false;
      media.pause();
      media.muted = true;
      setAudible(false);
    };
    const sync = () => {
      if (disposed) return;
      const limited = conserve();
      setAvailable(!limited && !failed);
      if (limited || failed || stopped.current || !visible || document.hidden) {
        pause();
        if (limited || failed) {
          media.removeAttribute("src");
          media.load();
          setPlaying(false);
        }
        return;
      }
      if (!media.getAttribute("src")) {
        media.src = source;
        media.muted = true;
      }
      if (pending || !media.paused) return;
      const token = ++request;
      pending = true;
      void media
        .play()
        .then(() => {
          if (disposed) {
            media.pause();
            return;
          }
          if (token !== request) return;
          pending = false;
          if (conserve() || stopped.current || !visible || document.hidden)
            pause();
        })
        .catch((error: DOMException) => {
          if (disposed || token !== request) return;
          pending = false;
          if (error.name === "AbortError") return;
          // Autoplay refusal is a valid still-image experience, never an entry gate.
          stopped.current = true;
          setStill(true);
          setPlaying(false);
        });
    };
    const error = () => {
      failed = true;
      sync();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(container);
    media.addEventListener("error", error);
    preference.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    synchronize.current = sync;
    sync();
    return () => {
      disposed = true;
      request++;
      synchronize.current = () => {};
      observer.disconnect();
      preference.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener("error", error);
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  }, []);

  function toggleMotion() {
    stopped.current = !stopped.current;
    setStill(stopped.current);
    if (stopped.current) setPlaying(false);
    synchronize.current();
  }

  function toggleSound() {
    const media = video.current;
    if (!media || media.paused) return;
    media.muted = !media.muted;
    setAudible(!media.muted);
  }

  return (
    <>
      <div className="sanctum-media" ref={surface} aria-hidden="true">
        <picture>
          <source
            media="(max-width: 760px)"
            srcSet="/sanctum/poster-mobile.webp"
          />
          <Image
            src={film.poster}
            alt=""
            fill
            sizes="100vw"
            fetchPriority="high"
            loading="eager"
            className="sanctum-poster"
          />
        </picture>
        <video
          ref={video}
          className={`sanctum-video ${playing && !still ? "is-playing" : ""}`}
          autoPlay
          muted
          playsInline
          loop
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onTimeUpdate={() => {
            const time = video.current?.currentTime ?? 0;
            setChapter(
              [...film.chapters].reverse().find((item) => time >= item.at)
                ?.word ?? film.chapters[0].word,
            );
          }}
        />
      </div>
      <div className="sanctum-shade" aria-hidden="true" />
      <span className="sanctum-chapter" aria-hidden="true">
        {playing && !still ? chapter : "BECOME"}
      </span>
      {available && (
        <button
          className="sanctum-motion"
          onClick={toggleMotion}
          aria-pressed={still}
        >
          {still ? "Enable motion" : "Still image"}
        </button>
      )}
      {film.hasAudio && playing && !still && (
        <button
          className="sanctum-sound"
          onClick={toggleSound}
          aria-label={audible ? "Mute sound" : "Enable sound"}
          aria-pressed={audible}
        >
          {audible ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      )}
    </>
  );
}
