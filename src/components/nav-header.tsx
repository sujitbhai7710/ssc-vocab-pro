'use client';

import { useAppStore, type AppView } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Home,
  LogIn,
  LogOut,
  Menu,
  X,
  ListChecks,
} from 'lucide-react';
import { useState } from 'react';

const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
  { view: 'read', label: 'Read Mode', icon: <BookOpen className="h-4 w-4" /> },
  { view: 'test-setup', label: 'Test Mode', icon: <ClipboardList className="h-4 w-4" /> },
  { view: 'problematic', label: 'Problematic', icon: <AlertTriangle className="h-4 w-4" /> },
  { view: 'read-list', label: 'Read List', icon: <ListChecks className="h-4 w-4" /> },
];

export function NavHeader() {
  const { currentView, setCurrentView, user, setUser, isLoggedIn } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setUser(null);
    setCurrentView('landing');
    // Clear D1-sourced data from local state on logout
    useAppStore.setState({
      problematicWords: [],
      readWords: [],
      testResults: [],
    });
  };

  const handleNavClick = (view: AppView) => {
    // Landing and auth are always accessible
    // Read mode is viewable, but marking requires auth (handled in component)
    // Everything else requires login
    if (!isLoggedIn && view !== 'landing' && view !== 'auth' && view !== 'read') {
      setCurrentView('auth');
    } else {
      setCurrentView(view);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center px-4 md:px-6 max-w-7xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2 mr-4 md:mr-6 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-md bg-[#1a365d] flex items-center justify-center">
            <span className="text-white font-bold text-sm">SSC</span>
          </div>
          <span className="font-bold text-[#1a365d] hidden sm:inline text-lg">
            SSC Vocab Pro
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant={currentView === item.view ? 'default' : 'ghost'}
              size="sm"
              className={
                currentView === item.view
                  ? 'bg-[#1a365d] hover:bg-[#1a365d]/90 text-white'
                  : 'text-gray-600 hover:text-[#1a365d]'
              }
              onClick={() => handleNavClick(item.view)}
            >
              {item.icon}
              <span className="ml-1.5">{item.label}</span>
            </Button>
          ))}
        </nav>

        {/* User section */}
        <div className="ml-auto flex items-center gap-2">
          {isLoggedIn && user ? (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-600">Hi, {user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white"
              onClick={() => setCurrentView('auth')}
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              Login
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white p-3 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant={currentView === item.view ? 'default' : 'ghost'}
              size="sm"
              className={
                currentView === item.view
                  ? 'w-full justify-start bg-[#1a365d] text-white'
                  : 'w-full justify-start text-gray-600'
              }
              onClick={() => handleNavClick(item.view)}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
          {isLoggedIn && user ? (
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-600">Hi, {user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#1a365d] text-[#1a365d]"
              onClick={() => {
                setCurrentView('auth');
                setMobileMenuOpen(false);
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login / Register
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
