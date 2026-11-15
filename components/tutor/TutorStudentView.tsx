import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Dumbbell, History, User } from 'lucide-react';
import { Student, WordBankEntry } from '../../types';
import { getWordBank } from '../../services/storage';
import { ProfileTab } from './ProfileTab';
import { WordBankTab } from './WordBankTab';
import { ExercisesTab } from './ExercisesTab';
import { HistoryTab } from './HistoryTab';

interface Props {
  student: Student;
  onBack: () => void;
}

type Tab = 'profile' | 'words' | 'exercises' | 'history';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Student profile', icon: User },
  { id: 'words', label: 'Word bank', icon: BookOpen },
  { id: 'exercises', label: 'Exercises', icon: Dumbbell },
  { id: 'history', label: 'History', icon: History },
];

export const SETUP_MESSAGE =
  'The database is not set up for this yet. Run supabase/setup.sql in the Supabase SQL editor, then try again.';

export const TutorStudentView: React.FC<Props> = ({ student: initialStudent, onBack }) => {
  const [tab, setTab] = useState<Tab>('profile');
  const [student, setStudent] = useState(initialStudent);

  // The word bank is shared by the Word bank tab (manage, select) and the Exercises tab (use)
  const [words, setWords] = useState<WordBankEntry[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  const loadWords = useCallback(async () => {
    setWordsLoading(true);
    try {
      setWords(await getWordBank());
      setWordsError('');
    } catch (e: any) {
      setWordsError(e.message === 'SETUP_NEEDED' ? SETUP_MESSAGE : `Could not load the word bank: ${e.message}`);
    } finally {
      setWordsLoading(false);
    }
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 pb-12">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation py-2"
      >
        <ArrowLeft size={20} /> <span className="text-base">All students</span>
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 text-lg font-bold flex items-center justify-center flex-shrink-0">
          {student.name.trim().charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 truncate">{student.name}</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors touch-manipulation ${
              tab === id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab student={student} onSaved={setStudent} />}
      {tab === 'words' && (
        <WordBankTab
          tutorId={student.tutorId}
          words={words}
          setWords={setWords}
          loading={wordsLoading}
          error={wordsError}
          selectedIds={selectedWordIds}
          setSelectedIds={setSelectedWordIds}
          onUseInExercises={() => setTab('exercises')}
        />
      )}
      {tab === 'exercises' && (
        <ExercisesTab
          student={student}
          selectedWords={words.filter(w => selectedWordIds.includes(w.id))}
          onDeselectWord={(id) => setSelectedWordIds(ids => ids.filter(i => i !== id))}
          onChooseWords={() => setTab('words')}
          onAssigned={() => setTab('history')}
        />
      )}
      {tab === 'history' && <HistoryTab student={student} />}
    </div>
  );
};
