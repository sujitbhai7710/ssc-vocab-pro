'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, ChevronDown, ChevronUp, Loader2, BookOpen, Languages, Quote, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DictMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: DictMeaning[];
  sourceUrls?: string[];
}

interface BengaliEntry {
  bengali?: string;
  bengali_translit?: string;
  meaning?: string;
}

interface WordExplainData {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: DictMeaning[];
  allSynonyms: string[];
  allAntonyms: string[];
  bengali?: string;
  bengaliTranslit?: string;
  error?: string;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const dictCache = new Map<string, WordExplainData>();
let bengaliDict: Map<string, BengaliEntry> | null = null;
let bengaliLoadPromise: Promise<Map<string, BengaliEntry>> | null = null;

async function loadBengaliDict(): Promise<Map<string, BengaliEntry>> {
  if (bengaliDict) return bengaliDict;
  if (bengaliLoadPromise) return bengaliLoadPromise;

  bengaliLoadPromise = (async () => {
    try {
      const res = await fetch('/bengali-dictionary.json');
      if (res.ok) {
        const data = await res.json();
        bengaliDict = new Map(Object.entries(data));
      } else {
        bengaliDict = new Map();
      }
    } catch {
      bengaliDict = new Map();
    }
    return bengaliDict;
  })();

  return bengaliLoadPromise;
}

// ─── Free Dictionary API ────────────────────────────────────────────────────

async function fetchDictionaryData(word: string): Promise<DictEntry | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

async function getWordExplainData(word: string): Promise<WordExplainData> {
  const key = word.toLowerCase();
  if (dictCache.has(key)) return dictCache.get(key)!;

  const [dictEntry, bengaliMap] = await Promise.all([
    fetchDictionaryData(word),
    loadBengaliDict(),
  ]);

  const result: WordExplainData = {
    word,
    meanings: [],
    allSynonyms: [],
    allAntonyms: [],
  };

  if (dictEntry) {
    result.phonetic = dictEntry.phonetic || '';
    // Find best audio URL
    if (dictEntry.phonetics) {
      const withAudio = dictEntry.phonetics.find(p => p.audio && p.audio.length > 0);
      if (withAudio) result.audioUrl = withAudio.audio;
      if (!result.phonetic) {
        const withText = dictEntry.phonetics.find(p => p.text && p.text.length > 0);
        if (withText) result.phonetic = withText.text;
      }
    }
    result.meanings = dictEntry.meanings || [];
    
    // Collect all synonyms and antonyms
    const synSet = new Set<string>();
    const antSet = new Set<string>();
    for (const m of result.meanings) {
      if (m.synonyms) m.synonyms.forEach(s => synSet.add(s));
      if (m.antonyms) m.antonyms.forEach(a => antSet.add(a));
      for (const d of m.definitions) {
        if (d.synonyms) d.synonyms.forEach(s => synSet.add(s));
        if (d.antonyms) d.antonyms.forEach(a => antSet.add(a));
      }
    }
    result.allSynonyms = [...synSet].slice(0, 10);
    result.allAntonyms = [...antSet].slice(0, 8);
  }

  // Bengali meaning
  const bengaliEntry = bengaliMap.get(key);
  if (bengaliEntry) {
    result.bengali = bengaliEntry.bengali || bengaliEntry.meaning || '';
    result.bengaliTranslit = bengaliEntry.bengali_translit || '';
  }

  if (!dictEntry && !bengaliEntry) {
    result.error = 'No data found for this word';
  }

  dictCache.set(key, result);
  return result;
}

// ─── Pronunciation (Web Speech API) ─────────────────────────────────────────

function speakWord(word: string, audioUrl?: string) {
  // Try audio URL first (from dictionary API)
  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        // Fallback to speech synthesis
        speechSynthesisSpeak(word);
      });
      return;
    } catch {
      // Fall through to speech synthesis
    }
  }
  speechSynthesisSpeak(word);
}

function speechSynthesisSpeak(word: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

// ─── Word Chip Component ────────────────────────────────────────────────────

function WordChip({
  word,
  isCorrect,
  isQuestionWord,
  type,
}: {
  word: string;
  isCorrect: boolean;
  isQuestionWord: boolean;
  type: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<WordExplainData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!data) {
      setLoading(true);
      const result = await getWordExplainData(word);
      setData(result);
      setLoading(false);
    }
  }, [expanded, data, word]);

  // Color scheme based on role
  let chipColor = 'bg-gray-100 border-gray-300 text-gray-700';
  if (isQuestionWord) {
    chipColor = 'bg-indigo-50 border-indigo-300 text-indigo-800';
  } else if (isCorrect) {
    chipColor = 'bg-green-50 border-green-300 text-green-800';
  }

  return (
    <div className="mb-2">
      {/* Clickable chip */}
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:shadow-sm active:scale-95 ${chipColor}`}
      >
        {isQuestionWord && <span className="text-xs opacity-60">Q:</span>}
        {isCorrect && !isQuestionWord && <span className="text-xs">✓</span>}
        <span>{word}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
          {type}
        </Badge>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Expanded detail card */}
      {expanded && data && (
        <div className="mt-2 ml-2 border-l-2 border-indigo-200 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <WordDetailCard data={data} />
        </div>
      )}

      {expanded && loading && (
        <div className="mt-2 ml-2 border-l-2 border-indigo-200 pl-3 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking up &ldquo;{word}&rdquo;...
          </div>
        </div>
      )}

      {expanded && data?.error && (
        <div className="mt-2 ml-2 border-l-2 border-indigo-200 pl-3 py-2 text-sm text-gray-500 italic">
          {data.error}
        </div>
      )}
    </div>
  );
}

// ─── Word Detail Card ───────────────────────────────────────────────────────

function WordDetailCard({ data }: { data: WordExplainData }) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    setSpeaking(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setSpeaking(false), 1500);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden max-w-full">
      {/* Header with pronunciation */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
        <span className="font-bold text-indigo-900 text-base">{data.word}</span>
        {data.phonetic && (
          <span className="text-xs text-gray-500 font-mono">{data.phonetic}</span>
        )}
        <button
          onClick={handleSpeak}
          className={`ml-auto p-1.5 rounded-full transition-colors ${
            speaking
              ? 'bg-indigo-500 text-white'
              : 'bg-white hover:bg-indigo-100 text-indigo-600'
          }`}
          title="Listen to pronunciation"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Bengali Meaning */}
        {(data.bengali || data.bengaliTranslit) && (
          <div className="flex items-start gap-2">
            <Languages className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-teal-700 font-semibold mb-0.5">Bengali Meaning</div>
              {data.bengali && (
                <div className="text-base font-semibold text-teal-900">{data.bengali}</div>
              )}
              {data.bengaliTranslit && (
                <div className="text-xs text-teal-600 italic">({data.bengaliTranslit})</div>
              )}
            </div>
          </div>
        )}

        {/* Definitions */}
        {data.meanings.length > 0 && (
          <div>
            {data.meanings.map((m, mi) => (
              <div key={mi} className="mb-2">
                <Badge variant="secondary" className="text-xs mb-1">
                  {m.partOfSpeech}
                </Badge>
                {m.definitions.slice(0, 2).map((d, di) => (
                  <div key={di} className="ml-2 mb-1">
                    <div className="text-sm text-gray-700">
                      <span className="text-gray-400 mr-1">{di + 1}.</span>
                      {d.definition}
                    </div>
                    {d.example && (
                      <div className="text-xs text-gray-500 italic ml-4 mt-0.5">
                        &ldquo;{d.example}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Synonyms */}
        {data.allSynonyms.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700">Synonyms</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.allSynonyms.map((s, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Antonyms */}
        {data.allAntonyms.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Lightbulb className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-700">Antonyms</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.allAntonyms.map((a, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-100"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Example Sentences from definitions */}
        {data.meanings.some(m => m.definitions.some(d => d.example)) && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Quote className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Examples</span>
            </div>
            <div className="space-y-1">
              {data.meanings
                .flatMap(m => m.definitions)
                .filter(d => d.example)
                .slice(0, 3)
                .map((d, i) => (
                  <div key={i} className="text-xs text-gray-600 italic bg-amber-50/50 rounded px-2 py-1 border-l-2 border-amber-200">
                    &ldquo;{d.example}&rdquo;
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No data message */}
        {!data.meanings.length && !data.bengali && !data.allSynonyms.length && (
          <div className="text-sm text-gray-500 italic flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Limited data available for this word
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Explain Section Component ─────────────────────────────────────────

interface ExplainSectionProps {
  question: {
    word: string;
    type: string;
    options?: string[];
    correct_answer?: number;
  };
}

export function ExplainSection({ question }: ExplainSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = question.options || [];

  // All words: question word + options (if available)
  const words = [
    { word: question.word, isQuestionWord: true, isCorrect: false },
    ...options.map((opt, idx) => ({
      word: opt,
      isQuestionWord: false,
      isCorrect: (idx + 1) === question.correct_answer,
    })),
  ];

  // For single words (no options), show just the word detail directly
  const isSingleWord = options.length === 0;

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs h-7 px-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Lightbulb className="h-3.5 w-3.5 mr-1" />
        {isSingleWord ? 'Explain Word' : 'Explain'}
        {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </Button>

      {isOpen && isSingleWord && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <SingleWordExplain word={question.word} type={question.type} />
        </div>
      )}

      {isOpen && !isSingleWord && (
        <div className="mt-2 p-3 bg-gradient-to-b from-indigo-50/50 to-slate-50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-gray-500 mb-3">
            Click on any word below to see its detailed explanation with synonyms, antonyms, Bengali meaning, and more.
          </p>
          <div className="flex flex-wrap gap-2">
            {words.map((w, idx) => (
              <WordChip
                key={idx}
                word={w.word}
                isCorrect={w.isCorrect}
                isQuestionWord={w.isQuestionWord}
                type={question.type}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Word Explain (for Problematic/Read lists) ──────────────────────

function SingleWordExplain({ word, type }: { word: string; type: string }) {
  const [data, setData] = useState<WordExplainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWordExplainData(word).then(result => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [word]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Looking up &ldquo;{word}&rdquo;...
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="text-sm text-gray-500 italic p-3">
        No detailed data found for &ldquo;{word}&rdquo;
      </div>
    );
  }

  return <WordDetailCard data={data} />;
}
