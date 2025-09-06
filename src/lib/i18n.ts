"use client";
import { useEffect, useState } from 'react';

const catalogs = {
  en: {
    createSession: 'Create Session',
    joinSession: 'Join Session',
  },
  pl: {
    createSession: 'Utwórz sesję',
    joinSession: 'Dołącz do sesji',
  },
};

export type Lang = keyof typeof catalogs;

export function useI18n(initial?: Lang) {
  const [lang, setLang] = useState<Lang>(initial || (navigator.language.startsWith('pl') ? 'pl' : 'en'));
  const t = catalogs[lang];
  useEffect(() => {
    try { localStorage.setItem('kudos_lang', lang); } catch {}
  }, [lang]);
  return { t, lang, setLang };
}

