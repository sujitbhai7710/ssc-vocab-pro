export interface Question {
  id: string;
  question_number: number;
  word: string;
  type: string; // synonym or antonym
  exam: string;
  date: string;
  options: string[];
  correct_answer: number; // 1-based index
  sentence: string;
  source: string;
}

export interface Section {
  id: string;
  name: string;
  exam: string;
  type: string;
  total_questions: number;
  questions: Question[];
}

export interface ExtraWord {
  word: string;
  synonym: string;
  meaning: string;
  source: string;
}

export interface Dataset {
  sections: Section[];
  extra_words: ExtraWord[];
  pdf2_words: {
    sno: number;
    word: string;
    synonym: string;
    meaning: string;
    source: string;
  }[];
}

let _dataset: Dataset | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (_dataset) return _dataset;
  
  const res = await fetch('/dataset.json');
  const raw = await res.json();
  
  // Generate MCQ questions for extra_words (371 words from PDF2 not in PDF1)
  const extraSection = generateExtraQuestions(raw.extra_words || [], raw.pdf2_words || []);
  
  // Add the extra section to sections
  raw.sections = [...raw.sections, extraSection];
  
  _dataset = raw as Dataset;
  return _dataset;
}

function generateExtraQuestions(extraWords: ExtraWord[], pdf2Words: { word: string; synonym: string; meaning: string }[]): Section {
  // Collect all synonym words from the dataset as potential distractors
  const allSynonyms: string[] = [];
  pdf2Words.forEach(w => {
    if (w.synonym) allSynonyms.push(w.synonym);
  });
  // Also collect correct answers from all sections as distractors
  // We'll use these when dataset is loaded
  const distractorPool = [...new Set(allSynonyms)];

  const questions: Question[] = extraWords.map((ew, idx) => {
    // Generate 3 distractors that are not the correct answer
    const distractors = getDistractors(ew.synonym, distractorPool, 3);
    
    // Randomly place the correct answer among distractors
    const correctPosition = Math.floor(Math.random() * 4) + 1;
    const options: string[] = [...distractors];
    options.splice(correctPosition - 1, 0, ew.synonym);

    return {
      id: `MIXED_synonym_extra_${idx + 1}`,
      question_number: idx + 1,
      word: ew.word,
      type: 'synonym',
      exam: 'MIXED',
      date: '',
      options,
      correct_answer: correctPosition,
      sentence: ew.meaning ? `Meaning: ${ew.meaning.replace(/\n/g, ' ').trim()}` : '',
      source: 'pdf2_extra',
    };
  });

  return {
    id: 'MIXED_synonym',
    name: 'SSC Extra Synonyms (PDF2)',
    exam: 'MIXED',
    type: 'synonym',
    total_questions: questions.length,
    questions,
  };
}

function getDistractors(correctAnswer: string, pool: string[], count: number): string[] {
  const filtered = pool.filter(w => w !== correctAnswer && w.length > 0);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  // If we don't have enough, pad with generic words
  const fallback = ['Various', 'Different', 'Opposite', 'Similar', 'Complex', 'Simple', 'Ancient', 'Modern'];
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < shuffled.length) {
      result.push(shuffled[i]);
    } else {
      result.push(fallback[i % fallback.length]);
    }
  }
  return result;
}

// Get all sections metadata (without questions, for listing)
export function getSectionsMetadata(sections: Section[]) {
  return sections.map(s => ({
    id: s.id,
    name: s.name,
    exam: s.exam,
    type: s.type,
    total_questions: s.total_questions,
  }));
}

// Get questions from specific section with range
export function getQuestionsFromSection(
  sections: Section[],
  sectionId: string,
  fromQ: number,
  toQ: number
): Question[] {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return [];
  return section.questions.filter(
    q => q.question_number >= fromQ && q.question_number <= toQ
  );
}

// Shuffle array (for randomization)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Shuffle options in a question (keeping track of correct answer)
export function shuffleQuestionOptions(q: Question): Question {
  const correctOption = q.options[q.correct_answer - 1];
  const shuffledOptions = shuffleArray(q.options);
  const newCorrectAnswer = shuffledOptions.indexOf(correctOption) + 1;
  return {
    ...q,
    options: shuffledOptions,
    correct_answer: newCorrectAnswer,
  };
}

export const SECTION_ICONS: Record<string, string> = {
  CGL: '🏛️',
  CHSL: '📋',
  MTS: '📝',
  GD: '🛡️',
  CPO: '⚖️',
  STENO: '✍️',
  MIXED: '📚',
};

export const SECTION_COLORS: Record<string, string> = {
  CGL: 'bg-blue-100 text-blue-800 border-blue-300',
  CHSL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  MTS: 'bg-amber-100 text-amber-800 border-amber-300',
  GD: 'bg-red-100 text-red-800 border-red-300',
  CPO: 'bg-purple-100 text-purple-800 border-purple-300',
  STENO: 'bg-teal-100 text-teal-800 border-teal-300',
  MIXED: 'bg-orange-100 text-orange-800 border-orange-300',
};
