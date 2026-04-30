'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  loadDataset,
  shuffleArray,
  shuffleQuestionOptions,
  SECTION_COLORS,
  SECTION_ICONS,
  type Question,
} from '@/lib/questions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Play,
  AlertTriangle,
  Clock,
  Shuffle,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuestionSet {
  id: string;
  sectionId: string;
  fromQ: number;
  toQ: number;
}

export function TestSetup() {
  const {
    sections,
    setSections,
    testConfig,
    setTestConfig,
    setTestQuestions,
    setCurrentView,
    setCurrentQuestionIndex,
    setTestStartTime,
    setTestTimeRemaining,
    setTestAnswers,
    problematicWords,
    isLoggedIn,
  } = useAppStore();
  const { toast } = useToast();

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(
    testConfig.selectedSets.length > 0
      ? testConfig.selectedSets.map((s, i) => ({
          id: `set-${i}`,
          sectionId: s.sectionId,
          fromQ: s.fromQ,
          toQ: s.toQ,
        }))
      : []
  );
  const [timePerQuestion, setTimePerQuestion] = useState(testConfig.timePerQuestion);
  const [randomizeQuestions, setRandomizeQuestions] = useState(testConfig.randomizeQuestions);
  const [randomizeOptions, setRandomizeOptions] = useState(testConfig.randomizeOptions);
  const [problematicOnly, setProblematicOnly] = useState(testConfig.problematicOnly);
  const [noTimer, setNoTimer] = useState(testConfig.timePerQuestion === 0);

  const loading = sections.length === 0;

  useEffect(() => {
    if (!sections.length) {
      loadDataset().then((data) => {
        setSections(data.sections);
      });
    }
  }, [sections, setSections]);

  const addQuestionSet = () => {
    if (sections.length === 0) return;
    setQuestionSets([
      ...questionSets,
      {
        id: `set-${Date.now()}`,
        sectionId: sections[0].id,
        fromQ: 1,
        toQ: sections[0].total_questions,
      },
    ]);
  };

  const removeQuestionSet = (id: string) => {
    setQuestionSets(questionSets.filter((s) => s.id !== id));
  };

  const updateQuestionSet = (id: string, updates: Partial<QuestionSet>) => {
    setQuestionSets(
      questionSets.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        // Reset range when section changes
        if (updates.sectionId) {
          const section = sections.find((sec) => sec.id === updates.sectionId);
          if (section) {
            updated.fromQ = 1;
            updated.toQ = section.total_questions;
          }
        }
        return updated;
      })
    );
  };

  const totalQuestions = useMemo(() => {
    if (problematicOnly) return problematicWords.length;
    return questionSets.reduce((sum, set) => {
      return sum + (set.toQ - set.fromQ + 1);
    }, 0);
  }, [questionSets, problematicOnly]);

  const totalTime = useMemo(() => {
    if (noTimer) return 0;
    return totalQuestions * timePerQuestion;
  }, [totalQuestions, timePerQuestion, noTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const startTest = () => {
    if (!isLoggedIn) {
      toast({
        title: 'Login Required',
        description: 'Please register or login to take tests',
        variant: 'destructive',
      });
      setCurrentView('auth');
      return;
    }

    if (problematicOnly) {
      if (problematicWords.length === 0) {
        toast({
          title: 'No problematic words',
          description: 'Add some words to your problematic list first',
          variant: 'destructive',
        });
        return;
      }
      // Build questions from problematic words
      const allQuestions: Question[] = [];
      sections.forEach((section) => {
        section.questions.forEach((q) => {
          if (problematicWords.some((pw) => pw.word === q.word && pw.type === q.type)) {
            allQuestions.push(q);
          }
        });
      });
      if (allQuestions.length === 0) {
        toast({
          title: 'No matching questions',
          description: 'Your problematic words could not be found in the question bank',
          variant: 'destructive',
        });
        return;
      }

      let finalQuestions = randomizeQuestions ? shuffleArray(allQuestions) : allQuestions;
      if (randomizeOptions) {
        finalQuestions = finalQuestions.map(shuffleQuestionOptions);
      }

      setTestConfig({
        selectedSets: [],
        timePerQuestion: noTimer ? 0 : timePerQuestion,
        randomizeQuestions,
        randomizeOptions,
        problematicOnly: true,
      });
      setTestQuestions(finalQuestions);
      setTestAnswers(
        finalQuestions.map((q) => ({
          questionId: q.id,
          selectedOption: null,
          markedForReview: false,
          timeSpent: 0,
        }))
      );
      setCurrentQuestionIndex(0);
      setTestStartTime(Date.now());
      setTestTimeRemaining(noTimer ? 0 : finalQuestions.length * timePerQuestion);
      setCurrentView('test-taking');
      return;
    }

    if (questionSets.length === 0) {
      toast({
        title: 'Add question sets',
        description: 'Please add at least one question set to start the test',
        variant: 'destructive',
      });
      return;
    }

    // Validate ranges
    for (const set of questionSets) {
      if (set.fromQ < 1 || set.toQ < set.fromQ) {
        toast({
          title: 'Invalid range',
          description: `Invalid question range for set`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Build question list
    const allQuestions: Question[] = [];
    const seenIds = new Set<string>();

    questionSets.forEach((set) => {
      const section = sections.find((s) => s.id === set.sectionId);
      if (!section) return;
      section.questions.forEach((q) => {
        if (
          q.question_number >= set.fromQ &&
          q.question_number <= set.toQ &&
          !seenIds.has(q.id)
        ) {
          seenIds.add(q.id);
          allQuestions.push(q);
        }
      });
    });

    if (allQuestions.length === 0) {
      toast({
        title: 'No questions found',
        description: 'The selected ranges contain no questions',
        variant: 'destructive',
      });
      return;
    }

    let finalQuestions = randomizeQuestions ? shuffleArray(allQuestions) : allQuestions;
    if (randomizeOptions) {
      finalQuestions = finalQuestions.map(shuffleQuestionOptions);
    }

    setTestConfig({
      selectedSets: questionSets.map((s) => ({
        sectionId: s.sectionId,
        fromQ: s.fromQ,
        toQ: s.toQ,
      })),
      timePerQuestion: noTimer ? 0 : timePerQuestion,
      randomizeQuestions,
      randomizeOptions,
      problematicOnly: false,
    });
    setTestQuestions(finalQuestions);
    setTestAnswers(
      finalQuestions.map((q) => ({
        questionId: q.id,
        selectedOption: null,
        markedForReview: false,
        timeSpent: 0,
      }))
    );
    setCurrentQuestionIndex(0);
    setTestStartTime(Date.now());
    setTestTimeRemaining(noTimer ? 0 : finalQuestions.length * timePerQuestion);
    setCurrentView('test-taking');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d]">Test Setup</h1>
        <p className="text-gray-500 mt-1">Configure your practice test</p>
      </div>

      {/* Problematic Only Toggle */}
      <Card className="mb-4 border-l-4 border-l-[#f97316]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#f97316]" />
              <div>
                <h3 className="font-semibold text-[#1a365d]">Problematic Words Only</h3>
                <p className="text-sm text-gray-500">Test only from your marked problematic words</p>
              </div>
            </div>
            <Switch
              checked={problematicOnly}
              onCheckedChange={setProblematicOnly}
            />
          </div>
          {problematicOnly && (
            <div className="mt-3 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">
                {problematicWords.length} problematic words will be included in the test
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!problematicOnly && (
        <>
          {/* Question Sets */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a365d]">Question Sets</CardTitle>
                <Button size="sm" variant="outline" onClick={addQuestionSet}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Set
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionSets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No question sets added yet</p>
                  <p className="text-sm">Click &quot;Add Set&quot; to get started</p>
                </div>
              ) : (
                questionSets.map((set, index) => {
                  const section = sections.find((s) => s.id === set.sectionId);
                  return (
                    <div
                      key={set.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-bold text-gray-400 mt-1">#{index + 1}</span>
                      <div className="flex-1 space-y-2">
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                          value={set.sectionId}
                          onChange={(e) =>
                            updateQuestionSet(set.id, { sectionId: e.target.value })
                          }
                        >
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {SECTION_ICONS[s.exam]} {s.name} ({s.total_questions})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">From Q#</Label>
                            <Input
                              type="number"
                              min={1}
                              max={section?.total_questions || 999}
                              value={set.fromQ}
                              onChange={(e) =>
                                updateQuestionSet(set.id, { fromQ: parseInt(e.target.value) || 1 })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">To Q#</Label>
                            <Input
                              type="number"
                              min={set.fromQ}
                              max={section?.total_questions || 999}
                              value={set.toQ}
                              onChange={(e) =>
                                updateQuestionSet(set.id, {
                                  toQ: parseInt(e.target.value) || set.fromQ,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="pt-5">
                            <Badge variant="secondary" className="text-xs">
                              {Math.max(0, set.toQ - set.fromQ + 1)} Q
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 mt-1"
                        onClick={() => removeQuestionSet(set.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Timer Settings */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#1a365d] flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timer Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">No Timer</h4>
              <p className="text-xs text-gray-500">Practice without time pressure</p>
            </div>
            <Switch checked={noTimer} onCheckedChange={setNoTimer} />
          </div>
          {!noTimer && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Time per question</Label>
                <span className="text-sm font-medium text-[#1a365d]">
                  {formatTime(timePerQuestion)}
                </span>
              </div>
              <Slider
                value={[timePerQuestion]}
                onValueChange={([v]) => setTimePerQuestion(v)}
                min={5}
                max={60}
                step={5}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>5s</span>
                <span>30s</span>
                <span>1m</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Randomization */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#1a365d] flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Randomization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Shuffle Questions</h4>
              <p className="text-xs text-gray-500">Randomize question order</p>
            </div>
            <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Shuffle Options</h4>
              <p className="text-xs text-gray-500">Randomize option order (A, B, C, D)</p>
            </div>
            <Switch checked={randomizeOptions} onCheckedChange={setRandomizeOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6 bg-[#1a365d] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Total Questions</p>
              <p className="text-3xl font-bold">{totalQuestions}</p>
            </div>
            <div>
              <p className="text-sm text-blue-200">Total Time</p>
              <p className="text-3xl font-bold">
                {noTimer ? '∞' : formatTime(totalTime)}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              onClick={startTest}
              disabled={totalQuestions === 0}
            >
              <Play className="h-5 w-5 mr-2" />
              Start Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
