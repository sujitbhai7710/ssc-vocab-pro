'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { loadDataset, SECTION_COLORS, SECTION_ICONS, type Question, type Section } from '@/lib/questions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, BookOpen, BookmarkPlus, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExplainSection } from '@/components/word-explain';

const QUESTIONS_PER_PAGE = 20;

export function ReadMode() {
  const {
    sections,
    setSections,
    selectedSection,
    setSelectedSection,
    readSearchQuery,
    setReadSearchQuery,
    readPage,
    setReadPage,
    readWords,
    addReadWord,
    problematicWords,
    addProblematicWord,
  } = useAppStore();

  const loading = sections.length === 0;

  useEffect(() => {
    if (!sections.length) {
      loadDataset().then((data) => {
        setSections(data.sections);
      });
    }
  }, [sections, setSections]);

  const currentSection = useMemo(
    () => sections.find((s) => s.id === selectedSection),
    [sections, selectedSection]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading vocabulary data...</p>
        </div>
      </div>
    );
  }

  // Section selection view
  if (!currentSection) {
    return <SectionList sections={sections} onSelect={setSelectedSection} />;
  }

  // Question list view
  return (
    <QuestionList
      section={currentSection}
      onBack={() => setSelectedSection(null)}
      searchQuery={readSearchQuery}
      setSearchQuery={setReadSearchQuery}
      page={readPage}
      setPage={setReadPage}
      readWords={readWords}
      addReadWord={addReadWord}
      problematicWords={problematicWords}
      addProblematicWord={addProblematicWord}
    />
  );
}

function SectionList({
  sections,
  onSelect,
}: {
  sections: Section[];
  onSelect: (id: string) => void;
}) {
  const { readWords } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d]">Read Mode</h1>
        <p className="text-gray-500 mt-1">Select a section to start studying vocabulary</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const readCount = section.questions.filter((q) =>
            readWords.some((rw) => rw.word === q.word && rw.type === q.type)
          ).length;
          const progress = section.total_questions > 0 ? (readCount / section.total_questions) * 100 : 0;
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
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{readCount} / {section.total_questions} read</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function QuestionList({
  section,
  onBack,
  searchQuery,
  setSearchQuery,
  page,
  setPage,
  readWords,
  addReadWord,
  problematicWords,
  addProblematicWord,
}: {
  section: Section;
  onBack: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  page: number;
  setPage: (p: number) => void;
  readWords: { word: string; type: string }[];
  addReadWord: (entry: { word: string; type: string; exam?: string; readAt: number }) => void;
  problematicWords: { word: string; type: string }[];
  addProblematicWord: (entry: { word: string; type: string; exam?: string; source: string; questionId?: string; addedAt: number }) => void;
}) {
  const { toast } = useToast();
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Extract available years from section questions
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    section.questions.forEach((q) => {
      if (q.date) {
        const match = q.date.match(/20\d{2}/);
        if (match) years.add(match[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [section.questions]);

  const filteredQuestions = useMemo(() => {
    let questions = section.questions;
    // Apply year filter
    if (yearFilter !== 'all') {
      questions = questions.filter((q) => {
        if (!q.date) return false;
        const match = q.date.match(/20\d{2}/);
        return match && match[0] === yearFilter;
      });
    }
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      questions = questions.filter(
        (question) =>
          question.word.toLowerCase().includes(q) ||
          question.options.some((opt) => opt.toLowerCase().includes(q))
      );
    }
    return questions;
  }, [section.questions, searchQuery, yearFilter]);

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (page - 1) * QUESTIONS_PER_PAGE,
    page * QUESTIONS_PER_PAGE
  );

  const { isLoggedIn, setCurrentView, removeReadWord, removeProblematicWord, setReadPage } = useAppStore();

  const requireAuth = () => {
    if (!isLoggedIn) {
      toast({ title: 'Login Required', description: 'Please register or login to use this feature', variant: 'destructive' });
      setCurrentView('auth');
      return true;
    }
    return false;
  };

  const handleMarkRead = (question: Question) => {
    if (requireAuth()) return;
    const isRead = readWords.some((rw) => rw.word === question.word && rw.type === question.type);
    if (isRead) {
      removeReadWord(question.word, question.type);
      toast({ title: 'Removed from read list', description: question.word });
    } else {
      addReadWord({
        word: question.word,
        type: question.type,
        exam: question.exam,
        readAt: Date.now(),
      });
      toast({ title: 'Marked as read', description: question.word });
    }
  };

  const handleAddProblematic = (question: Question) => {
    if (requireAuth()) return;
    const isProb = problematicWords.some((pw) => pw.word === question.word && pw.type === question.type);
    if (isProb) {
      removeProblematicWord(question.word, question.type);
      toast({ title: 'Removed from problematic list', description: question.word });
    } else {
      addProblematicWord({
        word: question.word,
        type: question.type,
        exam: question.exam,
        source: question.source,
        questionId: question.id,
        addedAt: Date.now(),
      });
      toast({ title: 'Added to problematic list', description: question.word });
    }
  };

  const isWordRead = (word: string, type: string) =>
    readWords.some((rw) => rw.word === word && rw.type === type);

  const isProblematic = (word: string, type: string) =>
    problematicWords.some((pw) => pw.word === word && pw.type === type);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1a365d]">{section.name}</h1>
          <p className="text-sm text-gray-500">
            {yearFilter === 'all' ? `${section.total_questions} questions` : `${filteredQuestions.length} of ${section.total_questions} questions`}
          </p>
        </div>
      </div>

      {/* Search & Year Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search words or options..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setReadPage(1); }}
            className="pl-9"
          />
        </div>
        {availableYears.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                yearFilter === 'all'
                  ? 'bg-[#1a365d] text-white border-[#1a365d]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => { setYearFilter('all'); setReadPage(1); }}
            >
              All ({section.total_questions})
            </button>
            {availableYears.map((year) => {
              const count = section.questions.filter((q) => {
                if (!q.date) return false;
                const match = q.date.match(/20\d{2}/);
                return match && match[0] === year;
              }).length;
              return (
                <button
                  key={year}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    yearFilter === year
                      ? 'bg-[#1a365d] text-white border-[#1a365d]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => { setYearFilter(year); setReadPage(1); }}
                >
                  {year} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {paginatedQuestions.map((question) => {
          const read = isWordRead(question.word, question.type);
          const problematic = isProblematic(question.word, question.type);

          return (
            <Card
              key={question.id}
              className={`transition-all ${read ? 'border-l-4 border-l-green-400' : ''} ${
                problematic ? 'border-l-4 border-l-red-400' : ''
              } ${read && problematic ? 'border-l-4 border-l-amber-400' : ''}`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">Q{question.question_number}</span>
                    <span className="font-semibold text-[#1a365d] text-base sm:text-lg">
                      {question.word}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        question.type === 'synonym'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {question.type === 'synonym' ? 'Synonym' : 'Antonym'}
                    </Badge>
                    {question.exam && question.exam !== 'MIXED' && (
                      <Badge variant="secondary" className="text-xs">
                        {question.exam}
                      </Badge>
                    )}
                    {question.date && (
                      <span className="text-xs text-gray-400 hidden sm:inline">{question.date}</span>
                    )}
                  </div>
                </div>

                {question.sentence && (
                  <p className="text-sm text-gray-600 italic mb-2 bg-gray-50 p-2 rounded">
                    {question.sentence}
                  </p>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2">
                  {question.options.map((option, idx) => {
                    const isCorrect = idx + 1 === question.correct_answer;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded text-xs sm:text-sm ${
                          isCorrect
                            ? 'bg-green-50 border border-green-200 text-green-800 font-medium'
                            : 'bg-gray-50 border border-gray-200 text-gray-600'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                            isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="truncate">{option}</span>
                        {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Button
                    variant={read ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-7 sm:h-8 ${read ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                    onClick={() => handleMarkRead(question)}
                  >
                    <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {read ? '✓ Read' : 'Mark Read'}
                  </Button>
                  <Button
                    variant={problematic ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-7 sm:h-8 ${problematic ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                    onClick={() => handleAddProblematic(question)}
                  >
                    <BookmarkPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {problematic ? '✓ Problematic' : 'Mark Problematic'}
                  </Button>
                </div>

                {/* Explain Section */}
                <ExplainSection question={question} />
              </CardContent>
            </Card>
          );
        })}
      </div>

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
            Page {page} of {totalPages}
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
