'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ClipboardList, AlertTriangle, ArrowRight, Trophy, Target, Brain } from 'lucide-react';

export function LandingPage() {
  const { setCurrentView, isLoggedIn } = useAppStore();

  const handleGetStarted = () => {
    if (isLoggedIn) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('auth');
    }
  };

  const handleBrowse = () => {
    setCurrentView('read');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a365d] via-[#2d4a7c] to-[#1a365d] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRzNCAyIDQgNC0yIDQtNCA0LTQtMi00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[#f97316] animate-pulse" />
              SSC 2024 Exam Preparation
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              Master SSC Vocabulary
              <span className="block text-[#f97316]">Like Never Before</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Comprehensive vocabulary preparation for CGL, CHSL, MTS, GD, CPO & Stenographer exams.
              2800+ questions from previous year papers with smart learning tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white text-lg px-8 h-12"
                onClick={handleGetStarted}
              >
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-lg px-8 h-12"
                onClick={handleBrowse}
              >
                Browse Vocabulary
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-3xl mx-auto">
            {[
              { label: 'Questions', value: '2800+' },
              { label: 'Exams', value: '6' },
              { label: 'Sections', value: '13' },
              { label: 'Years Covered', value: '2019-23' },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-2xl md:text-3xl font-bold text-[#f97316]">{stat.value}</div>
                <div className="text-sm text-blue-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-gray-50 flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a365d] mb-3">
            Everything You Need to Excel
          </h2>
          <p className="text-center text-gray-500 mb-10 max-w-2xl mx-auto">
            Our platform is designed specifically for SSC exam aspirants with features that make vocabulary learning efficient and effective.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-[#1a365d] hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-[#1a365d]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1a365d] mb-2">Read Mode</h3>
                <p className="text-gray-500 text-sm">
                  Browse vocabulary organized by exam type. Study synonyms and antonyms with flashcard-style cards. Track your reading progress across all sections.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#f97316] hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                  <ClipboardList className="h-6 w-6 text-[#f97316]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1a365d] mb-2">Test Mode</h3>
                <p className="text-gray-500 text-sm">
                  Take timed tests that replicate the official SSC CBT exam interface. Choose sections, set question ranges, and practice with randomized options.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#1a365d] mb-2">Problematic Words</h3>
                <p className="text-gray-500 text-sm">
                  Mark difficult words and revisit them. Take dedicated tests on just your problematic words. Add notes and track improvement over time.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { icon: <Trophy className="h-5 w-5" />, label: 'Track Progress', desc: 'Monitor your scores' },
              { icon: <Target className="h-5 w-5" />, label: 'Targeted Practice', desc: 'Focus on weak areas' },
              { icon: <Brain className="h-5 w-5" />, label: 'Smart Review', desc: 'Revisit mistakes' },
              { icon: <ClipboardList className="h-5 w-5" />, label: 'SSC Style', desc: 'Exam-like interface' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-white border">
                <div className="h-10 w-10 rounded-full bg-[#1a365d]/10 flex items-center justify-center mx-auto mb-2 text-[#1a365d]">
                  {item.icon}
                </div>
                <div className="font-medium text-sm text-[#1a365d]">{item.label}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a365d] text-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-blue-200">
          <p>SSC Vocab Pro — Comprehensive vocabulary preparation for SSC examinations</p>
          <p className="mt-1 text-blue-300/60">Data sourced from SSC previous year question papers (2019-2023)</p>
        </div>
      </footer>
    </div>
  );
}
