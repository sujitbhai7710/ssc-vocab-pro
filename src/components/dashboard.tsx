'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { loadDataset, SECTION_COLORS, SECTION_ICONS } from '@/lib/questions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  ArrowRight,
  ListChecks,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const {
    user,
    sections,
    setSections,
    setCurrentView,
    readWords,
    problematicWords,
    testResults,
    isLoggedIn,
    loadUserData,
    resetAccount,
  } = useAppStore();
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loading = sections.length === 0;

  useEffect(() => {
    if (!sections.length) {
      loadDataset().then((data) => {
        setSections(data.sections);
      });
    }
  }, [sections, setSections]);

  // Load user data from D1 on dashboard mount
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadUserData();
    }
  }, []);

  // Compute stats
  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + s.total_questions, 0),
    [sections]
  );

  const totalRead = readWords.length;
  const readPercentage = totalQuestions > 0 ? Math.round((totalRead / totalQuestions) * 100) : 0;

  const avgScore = useMemo(() => {
    if (testResults.length === 0) return 0;
    const totalPercentage = testResults.reduce((sum, r) => {
      return sum + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0);
    }, 0);
    return Math.round(totalPercentage / testResults.length);
  }, [testResults]);

  const lastFiveResults = testResults.slice(0, 5);

  // Section-wise progress for chart
  const sectionProgress = useMemo(() => {
    return sections.map((section) => {
      const readCount = section.questions.filter((q) =>
        readWords.some((rw) => rw.word === q.word && rw.type === q.type)
      ).length;
      return {
        id: section.id,
        name: section.name.replace('SSC ', '').replace(/\s*\(\d{4}-\d{2,4}\)\s*$/, ''),
        total: section.total_questions,
        read: readCount,
        percentage: section.total_questions > 0 ? Math.round((readCount / section.total_questions) * 100) : 0,
        exam: section.exam,
      };
    });
  }, [sections, readWords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d]">
          {isLoggedIn && user ? `Welcome, ${user.name}!` : 'Welcome to SSC Vocab Pro!'}
        </h1>
        <p className="text-gray-500 mt-1">
          Track your progress and continue your preparation
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Words Read</p>
                <p className="text-2xl font-bold text-[#1a365d]">{totalRead}</p>
                <p className="text-xs text-gray-400">{readPercentage}% of total</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#f97316]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tests Taken</p>
                <p className="text-2xl font-bold text-[#1a365d]">{testResults.length}</p>
                <p className="text-xs text-gray-400">Practice sessions</p>
              </div>
              <ClipboardList className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Score</p>
                <p className="text-2xl font-bold text-[#1a365d]">{avgScore}%</p>
                <p className="text-xs text-gray-400">
                  {avgScore >= 80 ? 'Excellent!' : avgScore >= 60 ? 'Good' : 'Keep practicing'}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Problematic</p>
                <p className="text-2xl font-bold text-[#1a365d]">{problematicWords.length}</p>
                <p className="text-xs text-gray-400">Need review</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-l-4 border-l-[#1a365d]"
          onClick={() => setCurrentView('read')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-[#1a365d]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1a365d]">Start Reading</h3>
              <p className="text-sm text-gray-500">Browse and study vocabulary</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-l-4 border-l-[#f97316]"
          onClick={() => setCurrentView('test-setup')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <ClipboardList className="h-6 w-6 text-[#f97316]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1a365d]">Take a Test</h3>
              <p className="text-sm text-gray-500">Practice with SSC-style tests</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border-l-4 border-l-red-500"
          onClick={() => setCurrentView('problematic')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#1a365d]">Review Problematic</h3>
              <p className="text-sm text-gray-500">{problematicWords.length} words need review</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Section Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1a365d] flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reading Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionProgress.map((sp) => (
              <div key={sp.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 truncate mr-2">
                    {SECTION_ICONS[sp.exam]} {sp.name}
                  </span>
                  <span className="text-gray-400 shrink-0">
                    {sp.read}/{sp.total}
                  </span>
                </div>
                <Progress value={sp.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Test Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1a365d] flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastFiveResults.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No tests taken yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-[#1a365d] text-[#1a365d]"
                  onClick={() => setCurrentView('test-setup')}
                >
                  Take your first test
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {lastFiveResults.map((result) => {
                  const pct =
                    result.totalQuestions > 0
                      ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
                      : 0;
                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          pct >= 80
                            ? 'bg-green-100 text-green-700'
                            : pct >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {pct}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {result.correctAnswers}/{result.totalQuestions} correct
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(result.createdAt).toLocaleDateString()} ·{' '}
                          {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          pct >= 80
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : pct >= 60
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {pct >= 80 ? 'Great' : pct >= 60 ? 'Good' : 'Practice'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone - Reset Account */}
      {isLoggedIn && (
        <Card className="mt-6 border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium text-red-800">Reset Account</p>
              <p className="text-xs text-red-600/70">
                Clear all your read words, problematic words, and test results. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reset Your Account?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This will permanently delete all your data:
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>{readWords.length} read words</li>
              <li>{problematicWords.length} problematic words</li>
              <li>{testResults.length} test results</li>
            </ul>
            <p className="text-sm font-medium text-red-600">
              This action cannot be undone. Are you sure?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setResetting(true);
                try {
                  await resetAccount();
                  toast({ title: 'Account Reset', description: 'All your data has been cleared.' });
                } catch {
                  toast({ title: 'Error', description: 'Failed to reset account. Please try again.', variant: 'destructive' });
                } finally {
                  setResetting(false);
                  setShowResetDialog(false);
                }
              }}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Yes, Reset Everything
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overall Progress Bar */}
      <Card className="mt-6 bg-gradient-to-r from-[#1a365d] to-[#2d4a7c] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-200">Overall Progress</span>
            <span className="text-sm font-bold">{readPercentage}%</span>
          </div>
          <Progress value={readPercentage} className="h-3 bg-white/20" />
          <div className="flex items-center justify-between mt-3 text-sm text-blue-200">
            <span>{totalRead} of {totalQuestions} words read</span>
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => setCurrentView('read')}
            >
              Continue Reading
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
