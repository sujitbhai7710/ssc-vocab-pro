'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  Flag,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function TestTaking() {
  const {
    testQuestions,
    testAnswers,
    setTestAnswers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    testTimeRemaining,
    setTestTimeRemaining,
    setCurrentView,
    setCurrentTestResult,
    addTestResult,
    addProblematicWord,
    user,
  } = useAppStore();

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [questionTime, setQuestionTime] = useState(0);
  const [autoSubmitTrigger, setAutoSubmitTrigger] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = testQuestions[currentQuestionIndex];
  const currentAnswer = testAnswers[currentQuestionIndex];

  // Timer - only set up once using a ref to avoid re-creating interval
  const initialTimeRef = useRef(testTimeRemaining);
  useEffect(() => {
    if (initialTimeRef.current > 0) {
      timerRef.current = setInterval(() => {
        const currentTime = useAppStore.getState().testTimeRemaining;
        if (currentTime <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTestTimeRemaining(0);
          setAutoSubmitTrigger(true);
        } else {
          setTestTimeRemaining(currentTime - 1);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setTestTimeRemaining]);

  // Question timer
  useEffect(() => {
    setQuestionTime(0);
    questionTimerRef.current = setInterval(() => {
      setQuestionTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentQuestionIndex]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectOption = (optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      selectedOption: optionIndex,
    };
    setTestAnswers(newAnswers);
  };

  const clearResponse = () => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      selectedOption: null,
    };
    setTestAnswers(newAnswers);
  };

  const markForReview = () => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      markedForReview: !newAnswers[currentQuestionIndex].markedForReview,
    };
    setTestAnswers(newAnswers);
  };

  const saveAndNext = () => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestionIndex] = {
      ...newAnswers[currentQuestionIndex],
      timeSpent: questionTime,
    };
    setTestAnswers(newAnswers);

    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const doSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    const storeState = useAppStore.getState();
    const finalAnswers = [...storeState.testAnswers];
    const questions = storeState.testQuestions;
    const cqi = storeState.currentQuestionIndex;

    finalAnswers[cqi] = {
      ...finalAnswers[cqi],
      timeSpent: questionTime,
    };

    let correct = 0;
    let wrong = 0;

    finalAnswers.forEach((answer, idx) => {
      if (answer.selectedOption !== null) {
        if (answer.selectedOption === questions[idx].correct_answer) {
          correct++;
        } else {
          wrong++;
        }
      }
    });

    const totalTime = finalAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

    const result = {
      id: `result-${Date.now()}`,
      totalQuestions: questions.length,
      correctAnswers: correct,
      wrongAnswers: wrong,
      timeTaken: totalTime,
      testConfig: storeState.testConfig,
      answers: finalAnswers,
      questions: questions,
      createdAt: Date.now(),
    };

    storeState.setCurrentTestResult(result);
    storeState.addTestResult(result);

    // Auto-add wrong answers to problematic list
    finalAnswers.forEach((answer, idx) => {
      if (answer.selectedOption !== null && answer.selectedOption !== questions[idx].correct_answer) {
        storeState.addProblematicWord({
          word: questions[idx].word,
          type: questions[idx].type,
          exam: questions[idx].exam,
          source: questions[idx].source,
          questionId: questions[idx].id,
          addedAt: Date.now(),
        });
      }
    });

    // Test result is saved to D1 via addTestResult in the store

    storeState.setCurrentView('test-results');
  }, [questionTime]);

  // Handle auto-submit trigger
  useEffect(() => {
    if (autoSubmitTrigger) {
      doSubmit();
    }
  }, [autoSubmitTrigger, doSubmit]);

  if (!currentQuestion) return null;

  const answeredCount = testAnswers.filter((a) => a.selectedOption !== null).length;
  const markedCount = testAnswers.filter((a) => a.markedForReview).length;
  const unansweredCount = testQuestions.length - answeredCount;

  const isLowTime = testTimeRemaining > 0 && testTimeRemaining < 60;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50">
      {/* Header Bar */}
      <div className="bg-[#1a365d] text-white px-4 py-2 flex items-center justify-between sticky top-14 z-40">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            Q {currentQuestionIndex + 1} of {testQuestions.length}
          </Badge>
          {currentQuestion.type && (
            <Badge
              className={
                currentQuestion.type === 'synonym'
                  ? 'bg-blue-500 text-white border-0'
                  : 'bg-red-500 text-white border-0'
              }
            >
              {currentQuestion.type.toUpperCase()}
            </Badge>
          )}
        </div>
        {testTimeRemaining > 0 && (
          <div
            className={`flex items-center gap-1.5 font-mono text-lg ${
              isLowTime ? 'text-red-300 animate-pulse' : ''
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTimer(testTimeRemaining)}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
          onClick={() => setShowSubmitDialog(true)}
        >
          <Send className="h-4 w-4 mr-1" />
          Submit
        </Button>
      </div>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-1.5 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {answeredCount} Answered
        </span>
        <span className="flex items-center gap-1">
          <X className="h-3 w-3 text-gray-400" />
          {unansweredCount} Unanswered
        </span>
        {markedCount > 0 && (
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3 text-purple-500" />
            {markedCount} Marked
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
        {/* Question */}
        <Card className="mb-4 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-400">
                  Question {currentQuestionIndex + 1}
                </span>
                {currentQuestion.exam && currentQuestion.exam !== 'MIXED' && (
                  <Badge variant="outline" className="text-xs">
                    {currentQuestion.exam}
                  </Badge>
                )}
                {currentAnswer?.markedForReview && (
                  <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                    <Flag className="h-3 w-3 mr-1" />
                    Marked for Review
                  </Badge>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#1a365d]">
                Select the most appropriate {currentQuestion.type} of the word
              </h2>
              <div className="mt-3 p-4 bg-[#1a365d]/5 rounded-lg">
                <p className="text-xl md:text-2xl font-semibold text-[#1a365d]">
                  &ldquo;{currentQuestion.word}&rdquo;
                </p>
              </div>
              {currentQuestion.sentence && (
                <p className="mt-2 text-sm text-gray-500 italic">
                  {currentQuestion.sentence}
                </p>
              )}
            </div>

            {/* Options - SSC Style */}
            <div className="space-y-2.5 mt-6">
              {currentQuestion.options.map((option, idx) => {
                const optionLetter = String.fromCharCode(65 + idx);
                const isSelected = currentAnswer?.selectedOption === idx + 1;

                return (
                  <button
                    key={idx}
                    className={`w-full flex items-center gap-3 p-3 md:p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[#1a365d] bg-[#1a365d]/5 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => selectOption(idx + 1)}
                  >
                    <span
                      className={`h-8 w-8 md:h-9 md:w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected
                          ? 'bg-[#1a365d] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {optionLetter}
                    </span>
                    <span
                      className={`text-base md:text-lg ${
                        isSelected ? 'font-semibold text-[#1a365d]' : 'text-gray-700'
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={clearResponse}
            disabled={!currentAnswer?.selectedOption}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Response
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markForReview}
            className={
              currentAnswer?.markedForReview
                ? 'border-purple-400 bg-purple-50 text-purple-700'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'
            }
          >
            <Flag className="h-4 w-4 mr-1" />
            {currentAnswer?.markedForReview ? 'Unmark Review' : 'Mark for Review'}
          </Button>
          <Button
            size="sm"
            className="ml-auto bg-[#1a365d] hover:bg-[#1a365d]/90 text-white"
            onClick={saveAndNext}
          >
            Save & Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Question Navigation Grid */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-600">Question Navigation</h4>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-green-500" />
                  Answered
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-purple-500" />
                  Marked
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-[#1a365d]" />
                  Current
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-gray-200" />
                  Not Visited
                </span>
              </div>
            </div>
            <div className="grid grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1">
              {testQuestions.map((_, idx) => {
                const answer = testAnswers[idx];
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = answer?.selectedOption !== null;
                const isMarked = answer?.markedForReview;

                let bgClass = 'bg-gray-200 text-gray-500';
                if (isCurrent) {
                  bgClass = 'bg-[#1a365d] text-white';
                } else if (isMarked && isAnswered) {
                  bgClass = 'bg-purple-500 text-white';
                } else if (isMarked) {
                  bgClass = 'bg-purple-300 text-white';
                } else if (isAnswered) {
                  bgClass = 'bg-green-500 text-white';
                }

                return (
                  <button
                    key={idx}
                    className={`h-8 w-8 rounded text-xs font-medium ${bgClass} hover:opacity-80 transition-opacity`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Previous/Next Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentQuestionIndex(Math.min(testQuestions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === testQuestions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#f97316]" />
              Submit Test?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Are you sure you want to submit the test?</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {answeredCount} questions answered
              </p>
              <p className="flex items-center gap-2">
                <X className="h-4 w-4 text-gray-400" />
                {unansweredCount} questions unanswered
              </p>
              {markedCount > 0 && (
                <p className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-purple-500" />
                  {markedCount} questions marked for review
                </p>
              )}
            </div>
            {unansweredCount > 0 && (
              <p className="text-[#f97316] font-medium">
                ⚠️ You have {unansweredCount} unanswered questions!
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Test
            </Button>
            <Button
              className="bg-[#f97316] hover:bg-[#ea580c] text-white"
              onClick={() => {
                setShowSubmitDialog(false);
                doSubmit();
              }}
            >
              Submit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
