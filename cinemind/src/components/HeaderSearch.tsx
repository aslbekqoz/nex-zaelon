"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { moveActive } from "@/lib/listbox";

type Result =
  | { kind: "movie"; id: number; title: string; titleUz: string | null; year: number | null; posterUrl: string | null }
  | { kind: "person"; id: number; name: string; knownFor: string | null; profileUrl: string | null };

const DEBOUNCE_MS = 180;
const href = (r: Result) => (r.kind === "movie" ? `/movies/${r.id}` : `/people/${r.id}`);

// The header search box with type-ahead suggestions (ARIA combobox pattern). Without
// JavaScript it is still a plain form that opens the search page.
export function HeaderSearch() {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setActive(-1);
      } catch {
        // Aborted by newer typing, or offline: keep the last suggestions
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text]);

  // Close when focus or a click goes elsewhere
  useEffect(() => {
    const close = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("focusin", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("focusin", close);
    };
  }, []);

  const shown = open && text.trim().length >= 2 && results.length > 0;
  const go = (r: Result) => {
    setOpen(false);
    setText("");
    router.push(href(r));
  };

  return (
    <form
      ref={box}
      action="/search"
      className="header-search"
      role="search"
      onSubmit={(e) => {
        if (shown && active >= 0) {
          e.preventDefault();
          go(results[active]);
        } else {
          setOpen(false);
        }
      }}
    >
      <label className="sr-only" htmlFor="header-q">
        Search movies
      </label>
      <input
        id="header-q"
        name="q"
        className="input"
        placeholder="Search for a movie…"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (shown) e.preventDefault();
            setOpen(false);
            setActive(-1);
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!results.length) return;
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => moveActive(i, step, results.length));
          }
        }}
      />
      <ul id={listId} role="listbox" aria-label="Suggestions" className="suggest" hidden={!shown}>
        {results.map((r, i) => (
          <li
            key={`${r.kind}-${r.id}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`suggest-item${i === active ? " active" : ""}`}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => go(r)}
            onPointerEnter={() => setActive(i)}
          >
            <span className={`suggest-thumb${r.kind === "person" ? " round" : ""}`} aria-hidden="true">
              {r.kind === "movie" && r.posterUrl ? <img src={r.posterUrl} alt="" loading="lazy" /> : null}
              {r.kind === "person" && r.profileUrl ? <img src={r.profileUrl} alt="" loading="lazy" /> : null}
            </span>
            <span className="suggest-text">
              <span className="suggest-title">{r.kind === "movie" ? r.title : r.name}</span>
              <span className="suggest-sub">
                {r.kind === "movie"
                  ? [r.year, r.titleUz && r.titleUz !== r.title ? r.titleUz : null].filter(Boolean).join(" · ")
                  : r.knownFor === "Acting" ? "Actor" : r.knownFor || "Person"}
              </span>
            </span>
          </li>
        ))}
        <li
          id={`${listId}-all`}
          role="option"
          aria-selected={false}
          className="suggest-all"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(text.trim())}`);
          }}
        >
          See all results for “{text.trim()}”
        </li>
      </ul>
    </form>
  );
}
