"use client";

import { useCallback, useEffect, useState } from "react";

export const PLAYLIST_ID = "18243794271";
// 歌单数据源:按顺序尝试,哪个能拉到用哪个(避免单点故障)
const METING_SOURCES = [
  `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${PLAYLIST_ID}`,
  `https://api.i-meto.com/meting/api?server=netease&type=playlist&id=${PLAYLIST_ID}`,
];

const APLAYER_CDN = {
  css: "https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css",
  js: "https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js",
};

export type Track = {
  name: string;
  artist: string;
  url: string;
  pic: string;
  lrc?: string;
  title?: string;
  author?: string;
  cover?: string;
};

export type APlayerAudio = {
  name: string;
  artist: string;
  url: string;
  cover?: string;
  lrc?: string;
};

export type APlayerInstance = {
  audio: HTMLAudioElement;
  list: {
    audios: APlayerAudio[];
    switch: (index: number) => void;
    index: number;
  };
  options: { audio: APlayerAudio[] };
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
};

export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface EngineState {
  tracks: Track[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  lyric: string;
  lyricNext: string;
  engineReady: boolean;
  failed: boolean;
}

type Listener = () => void;

let singleton: {
  ap: APlayerInstance | null;
  state: EngineState;
  listeners: Set<Listener>;
  initPromise: Promise<void> | null;
} | null = null;

function loadScript(src: string, css = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      css
        ? `link[data-aplayer][href="${src}"]`
        : `script[data-aplayer][src="${src}"]`
    );
    if (existing) {
      resolve();
      return;
    }
    const el = css
      ? (() => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = src;
          return link;
        })()
      : (() => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          return script;
        })();
    el.dataset.aplayer = "true";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function loadPlayerDeps(): Promise<boolean> {
  return Promise.all([
    loadScript(APLAYER_CDN.css, true),
    loadScript(APLAYER_CDN.js),
  ])
    .then(() => true)
    .catch(() => false);
}

async function fetchPlaylist(): Promise<Track[]> {
  for (const base of METING_SOURCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const sep = base.includes("?") ? "&" : "?";
      const res = await fetch(base + sep + "r=" + Math.random(), {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as Track[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map((t) => ({
          name: t.name || t.title || "未知歌曲",
          artist: t.artist || t.author || "未知歌手",
          url: t.url,
          pic: t.pic || t.cover || "",
          lrc: t.lrc,
        }));
      }
    } catch {
      // 当前源失败,尝试下一个
    }
  }
  throw new Error("歌单加载失败");
}

function getSingleton() {
  if (singleton) return singleton;
  singleton = {
    ap: null,
    state: {
      tracks: [],
      index: 0,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      lyric: "",
      lyricNext: "",
      engineReady: false,
      failed: false,
    },
    listeners: new Set(),
    initPromise: null,
  };
  return singleton;
}

function patchState(s: Partial<EngineState>) {
  if (!singleton) return;
  Object.assign(singleton.state, s);
  singleton.listeners.forEach((fn) => fn());
}

async function ensureEngine() {
  const s = getSingleton();
  if (s.ap || s.initPromise) return s.initPromise;

  s.initPromise = (async () => {
    let list: Track[] = [];
    try {
      list = await fetchPlaylist();
    } catch {
      patchState({ failed: true });
      return;
    }
    patchState({ tracks: list });
    if (list.length === 0) return;

    const ok = await loadPlayerDeps();
    if (!ok) return;

    const container = document.createElement("div");
    container.dataset.musicEngine = "shared";
    document.body.appendChild(container);

    const audioList = list.map((t) => ({
      name: t.name,
      artist: t.artist,
      url: t.url,
      cover: t.pic || undefined,
      lrc: t.lrc,
    }));

    // @ts-expect-error APlayer 从 CDN 全局加载
    const ap = new window.APlayer({
      container,
      audio: audioList,
      theme: "#15803d",
      listFolded: true,
      mutex: false,
      preload: "auto",
      order: "list",
      volume: 0.8,
      lrcType: 3,
    }) as APlayerInstance;
    s.ap = ap;
    patchState({ index: ap.list.index, volume: ap.audio.volume });

    const audio = ap.audio;
    const syncTime = () => {
      patchState({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    const onPlay = () => patchState({ playing: true });
    const onPause = () => patchState({ playing: false });
    const onEnded = () =>
      patchState({ playing: false, index: ap.list.index });
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    window.setInterval(() => {
      patchState({ index: ap.list.index });
      syncTime();
    }, 400);

    window.setInterval(() => {
      const contents = document.querySelector(
        '[data-music-engine="shared"] .aplayer-lrc-contents'
      );
      if (!contents) return;
      const lines = Array.from(contents.querySelectorAll("p")).map(
        (p) => p.textContent ?? ""
      );
      const active = contents.querySelector(".aplayer-lrc-current");
      const i = active ? lines.indexOf(active.textContent ?? "") : -1;
      patchState({
        lyric: i >= 0 ? lines[i] : lines[0] ?? "",
        lyricNext: i >= 0 && i + 1 < lines.length ? lines[i + 1] : "",
      });
    }, 400);

    patchState({ engineReady: true });
  })();

  return s.initPromise;
}

export function useMusicEngine() {
  const [, force] = useState(0);
  const s = getSingleton();

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    s.listeners.add(listener);
    ensureEngine();
    return () => {
      s.listeners.delete(listener);
    };
  }, [s]);

  const togglePlay = useCallback(() => {
    const ap = s.ap;
    if (!ap) return;
    if (ap.audio.paused) ap.play();
    else ap.pause();
  }, [s]);

  const skipTo = useCallback(
    (i: number) => {
      const ap = s.ap;
      const total = ap?.list?.audios?.length ?? 0;
      if (!ap || !total) return;
      const target = Math.max(0, Math.min(total - 1, i));
      ap.list.switch(target);
      ap.play();
    },
    [s]
  );

  const seekTo = useCallback(
    (ratio: number) => {
      const ap = s.ap;
      if (!ap || !Number.isFinite(ap.audio.duration)) return;
      ap.seek(ratio * ap.audio.duration);
    },
    [s]
  );

  const changeVolume = useCallback(
    (v: number) => {
      const ap = s.ap;
      if (!ap) return;
      ap.audio.volume = v;
      ap.audio.muted = v === 0;
      patchState({ volume: v, muted: v === 0 });
    },
    [s]
  );

  const toggleMute = useCallback(() => {
    const ap = s.ap;
    if (!ap) return;
    ap.audio.muted = !ap.audio.muted;
    patchState({ muted: ap.audio.muted });
  }, [s]);

  return { ...s.state, togglePlay, skipTo, seekTo, changeVolume, toggleMute };
}
