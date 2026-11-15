
export interface LearningPoint {
  id: string;
  description: string;
}

export interface Topic {
  id: string;
  title: string;
  points: LearningPoint[];
}

export interface Stage {
  id: number;
  title: string;
  duration: string;
  goal: string;
  topics: Topic[];
}

export interface Exercise {
  type: 'quiz' | 'translation' | 'composition' | 'fill_in_the_blank' | 'speaking';
  format?: string; // id from data/exerciseFormats.ts, when generated from the tutor's Exercises tab
  audioText?: string; // Chinese text the student hears instead of reads (listening)
  passage?: string; // Chinese text shown above the question (reading)
  question: string;
  questionTranslation?: string;
  answer?: string;
  options?: string[];
}

export interface GeneratedContent {
  learningMaterial: string;
  exercises: Exercise[];
}

export type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

export interface AssignedLesson {
  id: string;
  skill?: Skill; // Category shown to the student; inferred when missing (older lessons)
  studentId?: string; // students.id in Supabase
  audioUrl?: string; // Recording attached to the whole lesson
  userAudio?: string[]; // Student's recording URL per exercise (speaking)
  studentName: string;
  stageTitle: string;
  topicTitle: string;
  pointDescription: string;
  material: string;
  exercises: Exercise[];
  assignedDate: string;
  completed: boolean;
  score?: number; // Total score (sum of exercise scores or count of correct answers)
  userAnswers?: string[]; // Added to store student's specific input
  exerciseScores?: number[]; // Percentage score (0-100) for each exercise
  exerciseFeedback?: string[]; // AI-generated feedback for each exercise
  tutorAdjustedScores?: number[]; // Tutor-adjusted scores (0-100) for each exercise
  tutorComments?: string[]; // Tutor comments for each exercise
  tutorOverallComment?: string; // Overall comment from tutor for the entire lesson
}

export type ViewState = 
  | 'login' 
  | 'tutor-dashboard' 
  | 'tutor-student'
  | 'tutor-progress' 
  | 'settings'
  | 'onboarding' 
  | 'curriculum' 
  | 'editor' 
  | 'student-dashboard' 
  | 'student-lesson'
  | 'student-vocab'
  | 'vocab-management';

export interface StudentProfile {
  name: string;
  stageId: number;
}

export interface VocabWord {
  character: string;
  pinyin: string;
  meaning: string;
}

export interface WordDetails extends VocabWord {
  exampleSentenceCh: string;
  exampleSentenceEn: string;
}

export interface VocabProgress {
  id: string; // studentName_character
  studentName: string;
  category: string;
  word: string; // character
  pinyin: string;
  meaning: string;
  practices: {
    viewed: number;
    writing: number;
    pronunciation: number;
  };
  lastPracticed: string;
}

export interface VocabList {
  id: string;
  category: string;
  characters: string[]; // Array of individual Chinese characters
  uploadedAt: string;
  fileName?: string;
}

export interface Student {
  id: string;
  name: string;
  tutorId?: string;
  age?: number | null;
  schoolYear?: string;
  levels: Partial<Record<Skill, number>>; // Curriculum stage (1-6) per skill
}

export interface WordBankEntry {
  id: string;
  tutorId?: string;
  word: string; // A word or a phrase
  pinyin: string;
  meaning: string;
  tags: string[]; // Labels from data/wordTags.ts
  createdAt?: string;
}
