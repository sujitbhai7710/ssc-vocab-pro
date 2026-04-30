'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Trash2,
  ListChecks,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExplainSection } from '@/components/word-explain';

export function ReadList() {
  const { readWords, removeReadWord, sections, isLoggedIn, setCurrentView } = useAppStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterExam, setFilterExam] = useState<string>('all');

  const filteredWords = useMemo(() => {
    return readWords.filter((w) => {
      if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== 'all' && w.type !== filterType) return false;
      if (filterExam !== 'all' && w.exam !== filterExam) return false;
      return true;
    });
  }, [readWords, searchQuery, filterType, filterExam]);

  const exams = useMemo(
    () => [...new Set(readWords.map((w) => w.exam).filter(Boolean))] as string[],
    [readWords]
  );

  // Section-wise progress
  const sectionProgress = useMemo(() => {
    if (!sections.length) return [];
    return sections.map((section) => {
      const readCount = section.questions.filter((q) =>
        readWords.some((rw) => rw.word === q.word && rw.type === q.type)
      ).length;
      return {
        id: section.id,
        name: section.name,
        total: section.total_questions,
        read: readCount,
        percentage: section.total_questions > 0 ? (readCount / section.total_questions) * 100 : 0,
      };
    });
  }, [sections, readWords]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <ListChecks className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#1a365d] mb-2">Login Required</h2>
            <p className="text-gray-500 mb-4">Please register or login to view your read words list</p>
            <Button className="bg-[#1a365d] hover:bg-[#1a365d]/90 text-white" onClick={() => setCurrentView('auth')}>
              Login / Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d]">Read Words</h1>
        <p className="text-gray-500 mt-1">{readWords.length} words read</p>
      </div>

      {/* Section Progress */}
      {sections.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1a365d] flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Reading Progress by Section
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectionProgress.map((sp) => (
                <div key={sp.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate mr-2">{sp.name}</span>
                    <span className="text-gray-400 shrink-0">
                      {sp.read}/{sp.total} ({Math.round(sp.percentage)}%)
                    </span>
                  </div>
                  <Progress value={sp.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="synonym">Synonyms</option>
          <option value="antonym">Antonyms</option>
        </select>
        <select
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
        >
          <option value="all">All Exams</option>
          {exams.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>
      </div>

      {/* Words List */}
      {filteredWords.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ListChecks className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {readWords.length === 0
                ? 'No words marked as read yet. Start reading and mark words as you go!'
                : 'No words match your search criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredWords.map((word) => (
            <Card key={`${word.word}-${word.type}`} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1a365d]">{word.word}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          word.type === 'synonym'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {word.type}
                      </Badge>
                      {word.exam && (
                        <Badge variant="secondary" className="text-xs">
                          {word.exam}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Read {new Date(word.readAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-600 shrink-0"
                    onClick={() => {
                      removeReadWord(word.word, word.type);
                      toast({
                        title: 'Removed',
                        description: `${word.word} removed from read list`,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Explain Section */}
                <ExplainSection
                  question={{
                    word: word.word,
                    type: word.type,
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
