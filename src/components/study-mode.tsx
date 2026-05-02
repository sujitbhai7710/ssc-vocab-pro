'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { loadDataset, SECTION_COLORS, SECTION_ICONS, type Section } from '@/lib/questions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Volume2, ChevronLeft, ArrowRight, Search, BookOpen, Languages, Lightbulb, Quote, Loader2, GraduationCap, List } from 'lucide-react';

const WORDS_PER_PAGE = 30;

interface WordDetail {
  meaning: string;
  sentence: string;
  synonyms: string[];
  antonyms: string[];
}

interface BengaliEntry {
  bengali?: string;
  bengali_translit?: string;
  meaning?: string;
}

// ─── Caches ─────────────────────────────────────────────────────────────────

let wordDetailsMap: Map<string, WordDetail> | null = null;
let wordDetailsLoadPromise: Promise<Map<string, WordDetail>> | null = null;

async function loadWordDetails(): Promise<Map<string, WordDetail>> {
  if (wordDetailsMap) return wordDetailsMap;
  if (wordDetailsLoadPromise) return wordDetailsLoadPromise;

  wordDetailsLoadPromise = (async () => {
    try {
      const res = await fetch('/word-details.json');
      if (res.ok) {
        const data = await res.json();
        wordDetailsMap = new Map(Object.entries(data));
      } else {
        wordDetailsMap = new Map();
      }
    } catch {
      wordDetailsMap = new Map();
    }
    return wordDetailsMap;
  })();

  return wordDetailsLoadPromise;
}

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

// ─── Pronunciation ──────────────────────────────────────────────────────────

function speakWord(word: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

// ─── Unique Word Entry ──────────────────────────────────────────────────────

interface UniqueWord {
  word: string;
  type: string; // synonym or antonym
  exam: string;
  sections: string[]; // which sections contain this word
  dates: string[]; // exam dates
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function StudyMode() {
  const {
    sections,
    setSections,
  } = useAppStore();

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [wordDetails, setWordDetails] = useState<Map<string, WordDetail> | null>(null);
  const [bengaliMap, setBengaliMap] = useState<Map<string, BengaliEntry> | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loading = sections.length === 0;

  useEffect(() => {
    if (!sections.length) {
      loadDataset().then((data) => {
        setSections(data.sections);
      });
    }
  }, [sections, setSections]);

  // Load word details and bengali dictionary
  useEffect(() => {
    Promise.all([loadWordDetails(), loadBengaliDict()]).then(([details, bengali]) => {
      setWordDetails(details);
      setBengaliMap(bengali);
    });
  }, []);

  // Build unique words list (deduplicated by word+type)
  const uniqueWords = useMemo(() => {
    const wordMap = new Map<string, UniqueWord>();
    for (const section of sections) {
      for (const q of section.questions) {
        const key = `${q.word.toLowerCase()}::${q.type}`;
        if (!wordMap.has(key)) {
          wordMap.set(key, {
            word: q.word,
            type: q.type,
            exam: q.exam,
            sections: [section.id],
            dates: q.date ? [q.date] : [],
          });
        } else {
          const existing = wordMap.get(key)!;
          if (!existing.sections.includes(section.id)) {
            existing.sections.push(section.id);
          }
          if (q.date && !existing.dates.includes(q.date)) {
            existing.dates.push(q.date);
          }
        }
      }
    }
    return Array.from(wordMap.values());
  }, [sections]);

  // Filter by selected section (__all__ means all sections)
  const filteredBySection = useMemo(() => {
    if (!selectedSection || selectedSection === '__all__') return uniqueWords;
    return uniqueWords.filter(w => w.sections.includes(selectedSection));
  }, [uniqueWords, selectedSection]);

  // Apply search and type filters
  const filteredWords = useMemo(() => {
    let words = filteredBySection;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      words = words.filter(w =>
        w.word.toLowerCase().includes(q) ||
        (wordDetails?.get(w.word.toLowerCase())?.meaning || '').toLowerCase().includes(q) ||
        (wordDetails?.get(w.word.toLowerCase())?.synonyms || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') {
      words = words.filter(w => w.type === typeFilter);
    }
    // Sort alphabetically (spread to avoid mutating memoized array)
    return [...words].sort((a, b) => a.word.localeCompare(b.word));
  }, [filteredBySection, searchQuery, typeFilter, wordDetails]);

  // Pagination
  const totalPages = Math.ceil(filteredWords.length / WORDS_PER_PAGE);
  // Clamp page to valid bounds to prevent flash of empty content
  const effectivePage = Math.min(page, totalPages || 1);
  const paginatedWords = filteredWords.slice(
    (effectivePage - 1) * WORDS_PER_PAGE,
    effectivePage * WORDS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, selectedSection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading study data...</p>
        </div>
      </div>
    );
  }

  // Section selection view
  if (!selectedSection) {
    return (
      <StudySectionList
        sections={sections}
        uniqueWords={uniqueWords}
        onSelect={setSelectedSection}
      />
    );
  }

  // Word list view
  const currentSection = selectedSection === '__all__'
    ? null
    : sections.find(s => s.id === selectedSection);
  const sectionName = currentSection?.name || 'All Words';
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSection(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1a365d]">
            {sectionName} — Word List
          </h1>
          <p className="text-sm text-gray-500">
            {filteredWords.length} unique words
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search words, meanings, synonyms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              typeFilter === 'all'
                ? 'bg-[#1a365d] text-white border-[#1a365d]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setTypeFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              typeFilter === 'synonym'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setTypeFilter('synonym')}
          >
            Synonyms
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              typeFilter === 'antonym'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => setTypeFilter('antonym')}
          >
            Antonyms
          </button>
        </div>
      </div>

      {/* Loading indicator for word details */}
      {!wordDetails && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading word details...
        </div>
      )}

      {/* Word Cards */}
      <div className="space-y-3">
        {paginatedWords.map((wordEntry) => (
          <StudyWordCard
            key={`${wordEntry.word}-${wordEntry.type}`}
            wordEntry={wordEntry}
            wordDetail={wordDetails?.get(wordEntry.word.toLowerCase())}
            bengaliEntry={bengaliMap?.get(wordEntry.word.toLowerCase())}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredWords.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No words found matching your search</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 px-3">
            Page {effectivePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Section Selection ──────────────────────────────────────────────────────

function StudySectionList({
  sections,
  uniqueWords,
  onSelect,
}: {
  sections: Section[];
  uniqueWords: UniqueWord[];
  onSelect: (id: string) => void;
}) {


  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d] flex items-center gap-2">
          <GraduationCap className="h-7 w-7" />
          Study Mode
        </h1>
        <p className="text-gray-500 mt-1">
          Study all words with meanings, sentences, synonyms & antonyms — no MCQs
        </p>
      </div>

      {/* "All Words" card */}
      <div className="mb-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] border-l-4 border-l-[#1a365d]"
          onClick={() => onSelect('__all__')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#1a365d] flex items-center justify-center shrink-0">
              <List className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1a365d]">All Words</h3>
              <p className="text-sm text-gray-500">{uniqueWords.length} unique words from all sections</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      {/* Section cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const wordCount = new Set(
            section.questions.map(q => `${q.word.toLowerCase()}::${q.type}`)
          ).size;
          const colorClass = SECTION_COLORS[section.exam] || SECTION_COLORS.MIXED;
          const icon = SECTION_ICONS[section.exam] || '📚';

          return (
            <Card
              key={section.id}
              className="cursor-pointer hover:shadow-md transition-all border-l-4 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => onSelect(section.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm text-[#1a365d] leading-tight">
                        {section.name}
                      </h3>
                      <Badge variant="outline" className={`text-xs mt-1 ${colorClass}`}>
                        {section.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 mt-1" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{wordCount} unique words</span>
                  <span>{section.total_questions} total questions</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Study Word Card ────────────────────────────────────────────────────────

function StudyWordCard({
  wordEntry,
  wordDetail,
  bengaliEntry,
}: {
  wordEntry: UniqueWord;
  wordDetail?: WordDetail;
  bengaliEntry?: BengaliEntry;
}) {
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    setSpeaking(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordEntry.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setSpeaking(false), 1200);
    }
  }, [wordEntry.word]);

  const bengali = bengaliEntry?.bengali || bengaliEntry?.meaning;
  const bengaliTranslit = bengaliEntry?.bengali_translit;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Word Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-lg font-bold text-[#1a365d]">{wordEntry.word}</span>
              <Badge
                variant="outline"
                className={
                  wordEntry.type === 'synonym'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                    : 'bg-red-50 text-red-700 border-red-200 text-xs'
                }
              >
                {wordEntry.type === 'synonym' ? 'Synonym' : 'Antonym'}
              </Badge>
              {wordEntry.exam && wordEntry.exam !== 'MIXED' && (
                <Badge variant="secondary" className="text-xs">{wordEntry.exam}</Badge>
              )}
            </div>
          </div>
          {/* Pronunciation Button */}
          <button
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              speaking
                ? 'bg-[#1a365d] text-white'
                : 'bg-gray-100 hover:bg-[#1a365d]/10 text-[#1a365d]'
            }`}
            title="Listen to pronunciation"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {/* English Meaning */}
        {wordDetail?.meaning && (
          <div className="mt-3 flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-[#1a365d] mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[#1a365d] mb-0.5">Meaning</div>
              <div className="text-sm text-gray-700">{wordDetail.meaning}</div>
            </div>
          </div>
        )}

        {/* Bengali Meaning */}
        {(bengali || bengaliTranslit) && (
          <div className="mt-2 flex items-start gap-2">
            <Languages className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-teal-700 mb-0.5">Bengali Meaning</div>
              {bengali && (
                <div className="text-sm font-semibold text-teal-900">{bengali}</div>
              )}
              {bengaliTranslit && (
                <div className="text-xs text-teal-600 italic">({bengaliTranslit})</div>
              )}
            </div>
          </div>
        )}

        {/* Example Sentence */}
        {wordDetail?.sentence && (
          <div className="mt-2 flex items-start gap-2">
            <Quote className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-amber-700 mb-0.5">Example Sentence</div>
              <div className="text-sm text-gray-600 italic bg-amber-50/50 rounded px-2 py-1 border-l-2 border-amber-200">
                &ldquo;{wordDetail.sentence}&rdquo;
              </div>
            </div>
          </div>
        )}

        {/* Synonyms */}
        {wordDetail?.synonyms && wordDetail.synonyms.length > 0 && (
          <div className="mt-2 flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-blue-700 mb-1">Synonyms</div>
              <div className="flex flex-wrap gap-1">
                {wordDetail.synonyms.map((s, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Antonyms */}
        {wordDetail?.antonyms && wordDetail.antonyms.length > 0 && (
          <div className="mt-2 flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-red-700 mb-1">Antonyms</div>
              <div className="flex flex-wrap gap-1">
                {wordDetail.antonyms.map((a, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-100"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exam info footer */}
        {wordEntry.dates.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {wordEntry.dates.slice(0, 3).map((d, i) => (
                <Badge key={i} variant="outline" className="text-[10px] text-gray-400">
                  {d}
                </Badge>
              ))}
              {wordEntry.dates.length > 3 && (
                <Badge variant="outline" className="text-[10px] text-gray-400">
                  +{wordEntry.dates.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
