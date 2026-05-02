'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { NavHeader } from '@/components/nav-header';
import { LandingPage } from '@/components/landing';
import { AuthForm } from '@/components/auth-form';
import { Dashboard } from '@/components/dashboard';
import { ReadMode } from '@/components/read-mode';
import { StudyMode } from '@/components/study-mode';
import { TestSetup } from '@/components/test-setup';
import { TestTaking } from '@/components/test-taking';
import { TestResults } from '@/components/test-results';
import { ProblematicList } from '@/components/problematic-list';
import { ReadList } from '@/components/read-list';

export default function Home() {
  const { currentView, isLoggedIn, setCurrentView, setUser, loadUserData } = useAppStore();

  // Load user data from D1 on mount (Zustand persist already handles state hydration)
  useEffect(() => {
    const { user, isLoggedIn } = useAppStore.getState();
    if (isLoggedIn && user?.id) {
      loadUserData();
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage />;
      case 'auth':
        return <AuthForm />;
      case 'dashboard':
        return <Dashboard />;
      case 'read':
        return <ReadMode />;
      case 'study':
        return <StudyMode />;
      case 'test-setup':
        return <TestSetup />;
      case 'test-taking':
        return <TestTaking />;
      case 'test-results':
        return <TestResults />;
      case 'problematic':
        return <ProblematicList />;
      case 'read-list':
        return <ReadList />;
      default:
        return <LandingPage />;
    }
  };

  // Test-taking mode gets its own full layout without the standard nav
  if (currentView === 'test-taking') {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <TestTaking />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavHeader />
      <main className="flex-1">{renderView()}</main>
      <footer className="bg-[#1a365d] text-white py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-blue-200">
          SSC Vocab Pro — Comprehensive vocabulary preparation for SSC examinations
        </div>
      </footer>
    </div>
  );
}
