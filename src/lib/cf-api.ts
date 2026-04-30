// Cloudflare Worker API base URL
export const CF_API_BASE = 'https://ssc-vocab-api.parag7569.workers.dev';

// Generic fetch helper
async function cfFetch(path: string, options: RequestInit = {}) {
  const url = `${CF_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

// Auth API
export async function cfRegister(name: string, email: string, password: string) {
  const res = await cfFetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'register', name, email, password }),
  });
  return res.json();
}

export async function cfLogin(email: string, password: string) {
  const res = await cfFetch('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', email, password }),
  });
  return res.json();
}

// Problematic Words API
export async function cfAddProblematicWord(userId: string, word: string, type: string, exam?: string, source?: string, questionId?: string, notes?: string) {
  const res = await cfFetch('/api/problematic', {
    method: 'POST',
    body: JSON.stringify({ userId, word, type, exam, source, questionId, notes }),
  });
  return res.json();
}

export async function cfGetProblematicWords(userId: string) {
  const res = await cfFetch(`/api/problematic?userId=${encodeURIComponent(userId)}`);
  return res.json();
}

export async function cfRemoveProblematicWord(userId: string, word: string, type: string) {
  const res = await cfFetch('/api/problematic', {
    method: 'DELETE',
    body: JSON.stringify({ userId, word, type }),
  });
  return res.json();
}

// Read Words API
export async function cfAddReadWord(userId: string, word: string, type: string, exam?: string) {
  const res = await cfFetch('/api/read-words', {
    method: 'POST',
    body: JSON.stringify({ userId, word, type, exam }),
  });
  return res.json();
}

export async function cfGetReadWords(userId: string) {
  const res = await cfFetch(`/api/read-words?userId=${encodeURIComponent(userId)}`);
  return res.json();
}

export async function cfRemoveReadWord(userId: string, word: string, type: string) {
  const res = await cfFetch('/api/read-words', {
    method: 'DELETE',
    body: JSON.stringify({ userId, word, type }),
  });
  return res.json();
}

// Reset Account API
export async function cfResetAccount(userId: string) {
  const res = await cfFetch('/api/reset-account', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

// Test Results API
export async function cfSaveTestResult(userId: string, totalQuestions: number, correctAnswers: number, wrongAnswers: number, timeTaken: number, testConfig: unknown) {
  const res = await cfFetch('/api/test-result', {
    method: 'POST',
    body: JSON.stringify({ userId, totalQuestions, correctAnswers, wrongAnswers, timeTaken, testConfig }),
  });
  return res.json();
}

export async function cfGetTestResults(userId: string) {
  const res = await cfFetch(`/api/test-result?userId=${encodeURIComponent(userId)}`);
  return res.json();
}
