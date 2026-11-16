import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Settings, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import { AssignedLesson, Student } from '../types';
import { getLessons, getStudents, lessonBelongsTo } from '../services/storage';

interface Props {
  onSelectStudent: (student: Student) => void;
  onPlanLesson: () => void;
  onViewProgress: () => void;
  onBack: () => void;
  onSettings: () => void;
  onManageVocab: () => void;
}

export const TutorDashboard: React.FC<Props> = ({
  onSelectStudent,
  onPlanLesson,
  onViewProgress,
  onBack,
  onSettings,
  onManageVocab
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<AssignedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getStudents(), getLessons()]).then(([s, l]) => {
      if (!mounted) return;
      setStudents(s);
      setLessons(l);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .map(student => {
        const own = lessons.filter(l => lessonBelongsTo(l, student));
        return { student, assigned: own.length, submitted: own.filter(l => l.completed).length };
      });
  }, [students, lessons, search]);

  const tools = [
    { label: 'Settings', icon: Settings, onClick: onSettings },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-12">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation py-2"
      >
        <ArrowLeft size={20} /> <span className="text-base">Back to Login</span>
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Students</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Choose a student to see their profile, word bank, exercises and history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700 transition-colors touch-manipulation"
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 size={36} className="text-brand-500 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">{students.length === 0 ? 'No students yet' : 'No students match your search'}</p>
          {students.length === 0 && (
            <p className="text-sm text-slate-500 mt-1">Students appear here once they are in the students table or have a lesson assigned.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {rows.map(({ student, assigned, submitted }) => (
            <button
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition-colors touch-manipulation group"
            >
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center flex-shrink-0">
                {student.name.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                <p className="text-xs text-slate-500">
                  {[student.schoolYear, student.age ? `Age ${student.age}` : ''].filter(Boolean).join(' · ') || 'Profile not filled in'}
                </p>
              </div>
              <p className="text-xs text-slate-500 text-right flex-shrink-0">
                {assigned} assigned<br />{submitted} submitted
              </p>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
