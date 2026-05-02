import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Question, Section } from './questions';
import {
  cfAddProblematicWord,
  cfRemoveProblematicWord,
  cfAddReadWord,
  cfRemoveReadWord,
  cfSaveTestResult,
  cfGetProblematicWords,
  cfGetReadWords,
  cfGetTestResults,
  cfResetAccount,
} from './cf-api';

export type AppView =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'read'
  | 'study'
  | 'test-setup'
  | 'test-taking'
  | 'test-results'
  | 'problematic'
  | 'read-list';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ProblematicWordEntry {
  word: string;
  type: string;
  exam?: string;
  source: string;
  questionId?: string;
  notes?: string;
  addedAt: number;
}

export interface ReadWordEntry {
  word: string;
  type: string;
  exam?: string;
  readAt: number;
}

export interface TestConfig {
  selectedSets: {
    sectionId: string;
    fromQ: number;
    toQ: number;
  }[];
  timePerQuestion: number; // seconds, 0 = no timer
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  problematicOnly: boolean;
}

export interface TestAnswer {
  questionId: string;
  selectedOption: number | null; // 1-based, null = unanswered
  markedForReview: boolean;
  timeSpent: number; // seconds
}

export interface TestResultEntry {
  id: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeTaken: number;
  testConfig: TestConfig;
  answers: TestAnswer[];
  questions: Question[];
  createdAt: number;
}

interface AppState {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  loadUserData: () => void;

  // Data
  sections: Section[];
  setSections: (sections: Section[]) => void;

  // Read mode
  selectedSection: string | null;
  setSelectedSection: (sectionId: string | null) => void;
  readSearchQuery: string;
  setReadSearchQuery: (q: string) => void;
  readPage: number;
  setReadPage: (p: number) => void;

  // Problematic words (localStorage for guest, synced to DB for logged-in)
  problematicWords: ProblematicWordEntry[];
  addProblematicWord: (entry: ProblematicWordEntry) => void;
  removeProblematicWord: (word: string, type: string) => void;
  updateProblematicWordNotes: (word: string, type: string, notes: string) => void;

  // Read words
  readWords: ReadWordEntry[];
  addReadWord: (entry: ReadWordEntry) => void;
  removeReadWord: (word: string, type: string) => void;
  isWordRead: (word: string, type: string) => boolean;

  // Test mode
  testConfig: TestConfig;
  setTestConfig: (config: TestConfig) => void;
  testQuestions: Question[];
  setTestQuestions: (questions: Question[]) => void;
  testAnswers: TestAnswer[];
  setTestAnswers: (answers: TestAnswer[]) => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  testStartTime: number;
  setTestStartTime: (t: number) => void;
  testTimeRemaining: number;
  setTestTimeRemaining: (t: number) => void;

  // Test results
  testResults: TestResultEntry[];
  addTestResult: (result: TestResultEntry) => void;
  currentTestResult: TestResultEntry | null;
  setCurrentTestResult: (result: TestResultEntry | null) => void;

  // Reset
  resetTest: () => void;
  resetAccount: () => Promise<void>;
}

const defaultTestConfig: TestConfig = {
  selectedSets: [],
  timePerQuestion: 30,
  randomizeQuestions: true,
  randomizeOptions: true,
  problematicOnly: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: 'landing',
      setCurrentView: (view) => set({ currentView: view }),

      // User
      user: null,
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      isLoggedIn: false,
      loadUserData: async () => {
        const { user } = get();
        if (!user?.id) return;
        try {
          const [probData, readData, testData] = await Promise.all([
            cfGetProblematicWords(user.id),
            cfGetReadWords(user.id),
            cfGetTestResults(user.id),
          ]);
          // Always set from D1 - it's the source of truth
          if (Array.isArray(probData)) {
            const mapped = probData.map((p: Record<string, unknown>) => ({
              word: p.word as string,
              type: p.type as string,
              exam: (p.exam as string) || undefined,
              source: (p.source as string) || 'pdf1',
              questionId: (p.questionId as string) || undefined,
              notes: (p.notes as string) || undefined,
              addedAt: new Date(p.createdAt as string).getTime(),
            }));
            set({ problematicWords: mapped });
          }
          if (Array.isArray(readData)) {
            const mapped = readData.map((r: Record<string, unknown>) => ({
              word: r.word as string,
              type: r.type as string,
              exam: (r.exam as string) || undefined,
              readAt: new Date(r.readAt as string).getTime(),
            }));
            set({ readWords: mapped });
          }
          if (Array.isArray(testData)) {
            const mapped = testData.map((t: Record<string, unknown>) => ({
              id: t.id as string,
              totalQuestions: t.totalQuestions as number,
              correctAnswers: t.correctAnswers as number,
              wrongAnswers: t.wrongAnswers as number,
              timeTaken: t.timeTaken as number,
              testConfig: typeof t.testConfig === 'string' ? JSON.parse(t.testConfig) : (t.testConfig as TestConfig),
              answers: [],
              questions: [],
              createdAt: new Date(t.createdAt as string).getTime(),
            }));
            set({ testResults: mapped });
          }
        } catch {
          // silently fail - user can still use app
        }
      },

      // Data
      sections: [],
      setSections: (sections) => set({ sections }),

      // Read mode
      selectedSection: null,
      setSelectedSection: (sectionId) => set({ selectedSection: sectionId, readPage: 1, readSearchQuery: '' }),
      readSearchQuery: '',
      setReadSearchQuery: (q) => set({ readSearchQuery: q, readPage: 1 }),
      readPage: 1,
      setReadPage: (p) => set({ readPage: p }),

      // Problematic words
      problematicWords: [],
      addProblematicWord: (entry) => {
        const { problematicWords, user } = get();
        const exists = problematicWords.find(
          (w) => w.word === entry.word && w.type === entry.type
        );
        if (!exists) {
          set({ problematicWords: [...problematicWords, entry] });
          if (user?.id) {
            cfAddProblematicWord(user.id, entry.word, entry.type, entry.exam, entry.source, entry.questionId, entry.notes).catch(() => {});
          }
        }
      },
      removeProblematicWord: (word, type) => {
        const { problematicWords, user } = get();
        set({
          problematicWords: problematicWords.filter(
            (w) => !(w.word === word && w.type === type)
          ),
        });
        if (user?.id) {
          cfRemoveProblematicWord(user.id, word, type).catch(() => {});
        }
      },
      updateProblematicWordNotes: (word, type, notes) => {
        const { problematicWords } = get();
        set({
          problematicWords: problematicWords.map((w) =>
            w.word === word && w.type === type ? { ...w, notes } : w
          ),
        });
      },

      // Read words
      readWords: [],
      addReadWord: (entry) => {
        const { readWords, user } = get();
        const exists = readWords.find(
          (w) => w.word === entry.word && w.type === entry.type
        );
        if (!exists) {
          set({ readWords: [...readWords, entry] });
          if (user?.id) {
            cfAddReadWord(user.id, entry.word, entry.type, entry.exam).catch(() => {});
          }
        }
      },
      removeReadWord: (word, type) => {
        const { readWords, user } = get();
        set({
          readWords: readWords.filter(
            (w) => !(w.word === word && w.type === type)
          ),
        });
        if (user?.id) {
          cfRemoveReadWord(user.id, word, type).catch(() => {});
        }
      },
      isWordRead: (word, type) => {
        const { readWords } = get();
        return readWords.some((w) => w.word === word && w.type === type);
      },

      // Test mode
      testConfig: defaultTestConfig,
      setTestConfig: (config) => set({ testConfig: config }),
      testQuestions: [],
      setTestQuestions: (questions) => set({ testQuestions: questions }),
      testAnswers: [],
      setTestAnswers: (answers) => set({ testAnswers: answers }),
      currentQuestionIndex: 0,
      setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),
      testStartTime: 0,
      setTestStartTime: (t) => set({ testStartTime: t }),
      testTimeRemaining: 0,
      setTestTimeRemaining: (t) => set({ testTimeRemaining: t }),

      // Test results
      testResults: [],
      addTestResult: (result) => {
        const { testResults, user } = get();
        set({ testResults: [result, ...testResults] });
        // Save to D1
        if (user?.id) {
          cfSaveTestResult(
            user.id,
            result.totalQuestions,
            result.correctAnswers,
            result.wrongAnswers,
            result.timeTaken,
            result.testConfig
          ).catch(() => {});
        }
      },
      currentTestResult: null,
      setCurrentTestResult: (result) => set({ currentTestResult: result }),

      // Reset
      resetTest: () =>
        set({
          testConfig: defaultTestConfig,
          testQuestions: [],
          testAnswers: [],
          currentQuestionIndex: 0,
          testStartTime: 0,
          testTimeRemaining: 0,
        }),
      resetAccount: async () => {
        const { user } = get();
        // Clear from D1 if logged in
        if (user?.id) {
          try {
            await cfResetAccount(user.id);
          } catch {
            // Continue even if D1 reset fails
          }
        }
        // Clear all local state
        set({
          problematicWords: [],
          readWords: [],
          testResults: [],
          testConfig: defaultTestConfig,
          testQuestions: [],
          testAnswers: [],
          currentQuestionIndex: 0,
          testStartTime: 0,
          testTimeRemaining: 0,
          currentTestResult: null,
        });
      },
    }),
    {
      name: 'ssc-vocab-store',
      partialize: (state) => ({
        user: state.user,
        currentView: ['dashboard', 'read', 'study', 'landing'].includes(state.currentView)
          ? state.currentView
          : 'dashboard',
      }),
    }
  )
);
