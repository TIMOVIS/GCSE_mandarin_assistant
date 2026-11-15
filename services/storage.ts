
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AssignedLesson, VocabProgress, VocabList, Student, WordBankEntry } from '../types';

const LOCAL_STORAGE_KEY = 'mandarin_master_lessons';
const LOCAL_STORAGE_VOCAB_KEY = 'mandarin_master_vocab';
const LOCAL_STORAGE_VOCAB_LISTS_KEY = 'mandarin_master_vocab_lists';

// Default credentials provided by user
const DEFAULT_SUPABASE_URL = 'https://ujyjsmlasctasluxpuyn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeWpzbWxhc2N0YXNsdXhwdXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0ODM3MDAsImV4cCI6MjA2MTA1OTcwMH0.0GXUKWhJ8Ck9zSkslKvrKOhFnsi-5jO0TT4qLAH5yf4';

const AUDIO_BUCKET = 'ct_tutor';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let supabaseInstance: SupabaseClient | null = null;

// Initialize Supabase if credentials exist
const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const url = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch (e) {
      console.error("Failed to init Supabase", e);
      return null;
    }
  }
  return null;
};

// Safe JSON Parse wrapper for localStorage
const safeLocalParse = <T>(key: string, fallback: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}"`, e);
    return fallback;
  }
};

// --- SAVE LESSON ---
export const saveLesson = async (lesson: AssignedLesson, tutorId?: string): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
    // Cloud Save
    const { error } = await supabase.from('lessons').insert({
      id: lesson.id,
      student_name: lesson.studentName,
      data: lesson,
      ...(lesson.studentId && UUID_PATTERN.test(lesson.studentId) ? { student_id: lesson.studentId } : {}),
      ...(tutorId ? { tutor_id: tutorId } : {})
    });
    if (error) {
      console.error("Supabase Save Error:", error);
      throw new Error("Failed to save to cloud");
    }
  } else {
    // Local Save
    const existing = await getLessons();
    const updated = [lesson, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }
};

// --- GET ALL LESSONS ---
export const getLessons = async (): Promise<AssignedLesson[]> => {
  const supabase = getSupabase();

  if (supabase) {
    // Cloud Fetch. audio_url holds a lesson-level recording; not every database has the column.
    let { data, error }: { data: any[] | null; error: any } = await supabase
      .from('lessons')
      .select('data, audio_url')
      .order('created_at', { ascending: false });
    if (error) {
      ({ data, error } = await supabase
        .from('lessons')
        .select('data')
        .order('created_at', { ascending: false }));
    }
    
    if (error || !data) {
      console.error("Supabase Fetch Error:", error);
      return [];
    }
    return data.map((row: any) => {
      const lesson = row.data as AssignedLesson;
      return row.audio_url && !lesson.audioUrl ? { ...lesson, audioUrl: row.audio_url } : lesson;
    });
  } else {
    // Local Fetch
    return safeLocalParse<AssignedLesson[]>(LOCAL_STORAGE_KEY, []);
  }
};

// --- GET LESSONS FOR STUDENT ---
export const getLessonsForStudent = async (studentName: string): Promise<AssignedLesson[]> => {
  // We fetch all and filter client side for simplicity with the JSONB structure, 
  // though Supabase could filter server side if we extracted columns.
  const all = await getLessons();
  return all.filter(
    (l) => l.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()
  );
};

// --- UPDATE LESSON ---
export const updateLesson = async (updatedLesson: AssignedLesson): Promise<void> => {
  const supabase = getSupabase();

  if (supabase) {
    // Cloud Update
    // We update the 'data' json column
    const { error } = await supabase
      .from('lessons')
      .update({ data: updatedLesson })
      .eq('id', updatedLesson.id);
    
    if (error) {
      console.error("Supabase Update Error:", error);
    }
  } else {
    // Local Update
    const all = await getLessons();
    const index = all.findIndex((l) => l.id === updatedLesson.id);
    if (index !== -1) {
      all[index] = updatedLesson;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    }
  }
};

// --- VOCABULARY PROGRESS ---

export const getVocabProgress = async (studentName?: string): Promise<VocabProgress[]> => {
  const supabase = getSupabase();
  let allProgress: VocabProgress[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vocab_progress')
        .select('data');
      
      if (!error && data) {
        allProgress = data.map((row: any) => row.data as VocabProgress);
      }
    } catch (e) {
      console.warn("Cloud fetch for vocab failed, using local if available", e);
    }
  }
  
  // If cloud failed or not configured, merge with local
  if (allProgress.length === 0) {
    allProgress = safeLocalParse<VocabProgress[]>(LOCAL_STORAGE_VOCAB_KEY, []);
  }

  if (studentName) {
    return allProgress.filter(p => p.studentName.toLowerCase() === studentName.toLowerCase());
  }
  return allProgress;
};

export const saveVocabProgress = async (progress: VocabProgress): Promise<void> => {
  const supabase = getSupabase();

  // 1. Update Local Storage first for immediate UI
  let allLocal = safeLocalParse<VocabProgress[]>(LOCAL_STORAGE_VOCAB_KEY, []);
  
  const idx = allLocal.findIndex(p => p.id === progress.id);
  if (idx >= 0) {
    allLocal[idx] = progress;
  } else {
    allLocal.push(progress);
  }
  localStorage.setItem(LOCAL_STORAGE_VOCAB_KEY, JSON.stringify(allLocal));

  // 2. Update Cloud (with error handling - failures are non-critical)
  if (supabase) {
    try {
      // Check if exists
      const { data, error: selectError } = await supabase.from('vocab_progress').select('id').eq('id', progress.id).single();
      
      // 404 is expected if record doesn't exist - not an error
      if (selectError && selectError.code !== 'PGRST116') {
        console.warn("Supabase select error (non-critical):", selectError);
      }
      
      if (data) {
        const { error: updateError } = await supabase.from('vocab_progress').update({
          student_name: progress.studentName,
          data: progress,
          updated_at: new Date()
        }).eq('id', progress.id);
        
        if (updateError) {
          console.warn("Supabase update error (non-critical):", updateError);
        }
      } else {
        const { error: insertError } = await supabase.from('vocab_progress').insert({
          id: progress.id,
          student_name: progress.studentName,
          data: progress
        });
        
        if (insertError) {
          console.warn("Supabase insert error (non-critical):", insertError);
        }
      }
    } catch (e) {
      // Non-critical error - data is already saved locally
      console.warn("Cloud save failed (using local storage only):", e);
    }
  }
};

// --- VOCABULARY LISTS ---

export const saveVocabList = async (vocabList: VocabList): Promise<void> => {
  const supabase = getSupabase();

  // 1. Update Local Storage
  let allLocal = safeLocalParse<VocabList[]>(LOCAL_STORAGE_VOCAB_LISTS_KEY, []);
  
  const idx = allLocal.findIndex(v => v.id === vocabList.id);
  if (idx >= 0) {
    allLocal[idx] = vocabList;
  } else {
    allLocal.push(vocabList);
  }
  localStorage.setItem(LOCAL_STORAGE_VOCAB_LISTS_KEY, JSON.stringify(allLocal));

  // 2. Update Cloud (with error handling - failures are non-critical)
  if (supabase) {
    try {
      const { data, error: selectError } = await supabase.from('vocab_lists').select('id').eq('id', vocabList.id).single();
      
      // 404 is expected if record doesn't exist - not an error
      if (selectError && selectError.code !== 'PGRST116') {
        console.warn("Supabase select error (non-critical):", selectError);
      }
      
      if (data) {
        const { error: updateError } = await supabase.from('vocab_lists').update({
          category: vocabList.category,
          data: vocabList,
          updated_at: new Date()
        }).eq('id', vocabList.id);
        
        if (updateError) {
          console.warn("Supabase update error (non-critical):", updateError);
        }
      } else {
        const { error: insertError } = await supabase.from('vocab_lists').insert({
          id: vocabList.id,
          category: vocabList.category,
          data: vocabList
        });
        
        if (insertError) {
          console.warn("Supabase insert error (non-critical):", insertError);
        }
      }
    } catch (e) {
      // Non-critical error - data is already saved locally
      console.warn("Cloud save failed (using local storage only):", e);
    }
  }
};

export const getVocabLists = async (): Promise<VocabList[]> => {
  const supabase = getSupabase();
  let allLists: VocabList[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vocab_lists')
        .select('data')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        allLists = data.map((row: any) => row.data as VocabList);
      }
    } catch (e) {
      console.warn("Cloud fetch for vocab lists failed, using local", e);
    }
  }
  
  if (allLists.length === 0) {
    allLists = safeLocalParse<VocabList[]>(LOCAL_STORAGE_VOCAB_LISTS_KEY, []);
  }

  return allLists;
};

export const getVocabListByCategory = async (category: string): Promise<VocabList | null> => {
  const allLists = await getVocabLists();
  return allLists.find(list => list.category === category) || null;
};

export const deleteVocabList = async (id: string): Promise<void> => {
  const supabase = getSupabase();

  // 1. Remove from Local Storage
  let allLocal = safeLocalParse<VocabList[]>(LOCAL_STORAGE_VOCAB_LISTS_KEY, []);
  allLocal = allLocal.filter(v => v.id !== id);
  localStorage.setItem(LOCAL_STORAGE_VOCAB_LISTS_KEY, JSON.stringify(allLocal));

  // 2. Remove from Cloud
  if (supabase) {
    await supabase.from('vocab_lists').delete().eq('id', id);
  }
};


// --- STUDENTS ---

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const getStudents = async (): Promise<Student[]> => {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) {
      console.error("Supabase Students Fetch Error:", error);
    } else if (data && data.length > 0) {
      return data.map((row: any): Student => ({
        id: row.id,
        name: row.name,
        tutorId: row.tutor_id || undefined,
        age: row.age_years ?? null,
        schoolYear: row.school_year || '',
        levels: row.levels || {}
      }));
    }
  }

  // No students table to read: fall back to the names that have lessons
  const lessons = await getLessons();
  const names: string[] = [];
  lessons.forEach(l => {
    if (l.studentName && !names.some(n => sameName(n, l.studentName))) names.push(l.studentName.trim());
  });
  return names.sort((a, b) => a.localeCompare(b)).map(name => ({ id: name, name, levels: {} }));
};

export const updateStudentProfile = async (student: Student): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from('students')
    .update({
      age_years: student.age ?? null,
      school_year: student.schoolYear || null,
      levels: student.levels
    })
    .eq('id', student.id)
    .select('id');

  if (error) {
    console.error("Supabase Student Update Error:", error);
    // PGRST204: column not found, i.e. supabase/setup.sql has not been run yet
    throw new Error(error.code === 'PGRST204' ? 'SETUP_NEEDED' : error.message);
  }
  if (!data || data.length === 0) throw new Error("The database did not accept the change");
};

export const lessonBelongsTo = (lesson: AssignedLesson, student: Student): boolean =>
  lesson.studentId ? lesson.studentId === student.id : sameName(lesson.studentName || '', student.name);

// --- WORD BANK ---

const rowToWord = (row: any): WordBankEntry => ({
  id: row.id,
  tutorId: row.tutor_id || undefined,
  word: row.word,
  pinyin: row.pinyin || '',
  meaning: row.meaning || '',
  tags: Array.isArray(row.tags) ? row.tags : [],
  createdAt: row.created_at
});

const wordBankError = (error: any): Error => {
  console.error("Supabase Word Bank Error:", error);
  // Table not found, i.e. supabase/setup.sql has not been run yet
  const missing = error.code === 'PGRST205' || error.code === '42P01';
  return new Error(missing ? 'SETUP_NEEDED' : error.message);
};

export const getWordBank = async (): Promise<WordBankEntry[]> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.from('word_bank').select('*').order('created_at', { ascending: false });
  if (error) throw wordBankError(error);
  return (data || []).map(rowToWord);
};

export const addWordBankEntries = async (
  entries: Omit<WordBankEntry, 'id' | 'createdAt'>[]
): Promise<WordBankEntry[]> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from('word_bank')
    .insert(entries.map(e => ({
      word: e.word,
      pinyin: e.pinyin,
      meaning: e.meaning,
      tags: e.tags,
      ...(e.tutorId ? { tutor_id: e.tutorId } : {})
    })))
    .select('*');
  if (error) throw wordBankError(error);
  return (data || []).map(rowToWord);
};

export const updateWordBankEntry = async (entry: WordBankEntry): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from('word_bank')
    .update({ word: entry.word, pinyin: entry.pinyin, meaning: entry.meaning, tags: entry.tags })
    .eq('id', entry.id);
  if (error) throw wordBankError(error);
};

export const deleteWordBankEntry = async (id: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from('word_bank').delete().eq('id', id);
  if (error) throw wordBankError(error);
};

// --- AUDIO ---

// Uploads a student's recording and returns its public URL
export const uploadAudio = async (blob: Blob, fileName: string): Promise<string> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");
  const path = `audio/${fileName}`;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) {
    console.error("Supabase Audio Upload Error:", error);
    throw new Error(error.message);
  }
  return supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl;
};
