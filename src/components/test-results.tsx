'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Plus,
  ArrowRight,
  BarChart3,
  Target,
} from 'lucide-react';

export function TestResults() {
  const {
    currentTestResult,
    setCurrentView,
    resetTest,
  } = useAppStore();

  if (!currentTestResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No test results to display</p>
          <Button onClick={() => setCurrentView('test-setup')}>Take a Test</Button>
        </div>
      </div>
    );
  }

  const { totalQuestions, correctAnswers, wrongAnswers, timeTaken, answers, questions } =
    currentTestResult;
  const unanswered = totalQuestions - correctAnswers - wrongAnswers;
  // SSC scoring: +2 for correct, -0.5 for wrong, 0 for unanswered
  const marksPerCorrect = 2;
  const negativePerWrong = 0.5;
  const totalMarks = totalQuestions * marksPerCorrect;
  const marksObtained = (correctAnswers * marksPerCorrect) - (wrongAnswers * negativePerWrong);
  const finalMarks = Math.max(0, marksObtained);
  const percentage = totalMarks > 0 ? Math.round((finalMarks / totalMarks) * 100) : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const handleRetake = () => {
    resetTest();
    setCurrentView('test-setup');
  };

  const handleNewTest = () => {
    resetTest();
    setCurrentView('test-setup');
  };

  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = () => {
    if (percentage >= 80) return 'bg-green-50 border-green-200';
    if (percentage >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const formatMarks = (n: number) => {
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Score Header */}
      <Card className={`mb-6 border-2 ${getScoreBg()}`}>
        <CardContent className="p-6 text-center">
          <Trophy className={`h-12 w-12 mx-auto mb-3 ${getScoreColor()}`} />
          <h1 className="text-2xl font-bold text-[#1a365d] mb-1">Test Complete!</h1>
          {/* SSC-style score: marks out of total */}
          <div className={`text-6xl font-bold ${getScoreColor()} mb-2`}>{formatMarks(finalMarks)}<span className="text-2xl text-gray-400">/{totalMarks}</span></div>
          <p className="text-sm text-gray-500 mb-2 font-medium">
            {correctAnswers} correct (+{formatMarks(correctAnswers * marksPerCorrect)}) · {wrongAnswers} wrong (-{formatMarks(wrongAnswers * negativePerWrong)}) · {unanswered} unanswered (0)
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">+{marksPerCorrect} per correct</span>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">-{negativePerWrong} per wrong</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">0 unanswered</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-600">+{correctAnswers * marksPerCorrect}</div>
              <div className="text-xs text-gray-500">{correctAnswers} Correct</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-red-600">-{wrongAnswers * negativePerWrong}</div>
              <div className="text-xs text-gray-500">{wrongAnswers} Wrong</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <BarChart3 className="h-5 w-5 text-gray-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-600">{unanswered}</div>
              <div className="text-xs text-gray-500">Unanswered</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-600">{formatTime(timeTaken)}</div>
              <div className="text-xs text-gray-500">Time Taken</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm col-span-2 md:col-span-1">
              <Trophy className="h-5 w-5 text-[#1a365d] mx-auto mb-1" />
              <div className="text-xl font-bold text-[#1a365d]">{formatMarks(finalMarks)}/{totalMarks}</div>
              <div className="text-xs text-gray-500">Final Score</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>Score</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={handleRetake} variant="outline" className="border-[#1a365d] text-[#1a365d]">
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Retake Test
        </Button>
        <Button onClick={handleNewTest} className="bg-[#1a365d] hover:bg-[#1a365d]/90 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Test
        </Button>
      </div>

      {/* Question by Question Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#1a365d]">Detailed Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((question, idx) => {
            const answer = answers[idx];
            const isCorrect = answer?.selectedOption === question.correct_answer;
            const isUnanswered = answer?.selectedOption === null;

            return (
              <div
                key={question.id}
                className={`p-3 rounded-lg border ${
                  isUnanswered
                    ? 'bg-gray-50 border-gray-200'
                    : isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {isUnanswered ? (
                      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">
                        {idx + 1}
                      </div>
                    ) : isCorrect ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-gray-400">Q{idx + 1}</span>
                      <span className="font-semibold text-[#1a365d]">{question.word}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          question.type === 'synonym'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {question.type}
                      </Badge>
                      {question.exam && (
                        <Badge variant="secondary" className="text-xs">
                          {question.exam}
                        </Badge>
                      )}
                    </div>

                    {/* Options review */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                      {question.options.map((opt, optIdx) => {
                        const isCorrectOption = optIdx + 1 === question.correct_answer;
                        const isSelectedOption = answer?.selectedOption === optIdx + 1;

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                              isCorrectOption
                                ? 'bg-green-100 text-green-800 font-medium'
                                : isSelectedOption
                                ? 'bg-red-100 text-red-800'
                                : 'text-gray-500'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + optIdx)}</span>
                            {opt}
                            {isCorrectOption && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                            {isSelectedOption && !isCorrectOption && <XCircle className="h-3 w-3 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>

                    {isUnanswered && (
                      <p className="text-xs text-gray-400 mt-1">Not answered</p>
                    )}
                    {!isCorrect && !isUnanswered && (
                      <p className="text-xs text-green-600 mt-1">
                        Correct answer: {String.fromCharCode(64 + question.correct_answer)}. {question.options[question.correct_answer - 1]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-center gap-3 mt-6 mb-8">
        <Button onClick={handleRetake} variant="outline" className="border-[#1a365d] text-[#1a365d]">
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Retake
        </Button>
        <Button
          onClick={handleNewTest}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white"
        >
          New Test
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
