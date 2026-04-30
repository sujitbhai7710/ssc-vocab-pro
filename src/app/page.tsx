'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { NavHeader } from '@/components/nav-header';
import { LandingPage } from '@/components/landing';
import { AuthForm } from '@/components/auth-form';
import { Dashboard } from '@/components/dashboard';
import { ReadMode } from '@/components/read-mode';
import { TestSetup } from '@/components/test-setup';
import { TestTaking } from '@/components/test-taking';
import { TestResults } from '@/components/test-results';
import { ProblematicList } from '@/components/problematic-list';
import { ReadList } from '@/components/read-list';

export default function Home() {
  const { currentView, isLoggedIn, setCurrentView, setUser, loadUserData } = useAppStore();

  // Restore user session and load data from D1 on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ssc-vocab-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.user) {
          setUser(parsed.state.user);
          // Load user data from Cloudflare D1
          loadUserData();
        }
        if (parsed?.state?.currentView && parsed.state.currentView !== 'landing') {
          setCurrentView(parsed.state.currentView);
        }
      }
    } catch {
      // Ignore parse errors
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
