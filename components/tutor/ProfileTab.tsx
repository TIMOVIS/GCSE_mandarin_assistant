import React, { useState } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { Skill, Student } from '../../types';
import { updateStudentProfile } from '../../services/storage';
import { SKILLS } from '../../services/skills';
import { CURRICULUM } from '../../data/curriculum';
import { SETUP_MESSAGE } from './TutorStudentView';

interface Props {
  student: Student;
  onSaved: (student: Student) => void;
}

const SCHOOL_YEARS = ['Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'];

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none';

export const ProfileTab: React.FC<Props> = ({ student, onSaved }) => {
  const [age, setAge] = useState(student.age ? String(student.age) : '');
  const [schoolYear, setSchoolYear] = useState(student.schoolYear || '');
  const [levels, setLevels] = useState<Partial<Record<Skill, number>>>(student.levels || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const edited = () => { setSaved(false); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const updated: Student = { ...student, age: age ? Number(age) : null, schoolYear, levels };
    try {
      await updateStudentProfile(updated);
      onSaved(updated);
      setSaved(true);
    } catch (err: any) {
      setError(err.message === 'SETUP_NEEDED' ? SETUP_MESSAGE : `Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Age</span>
          <input
            type="number"
            min={4}
            max={99}
            value={age}
            onChange={(e) => { setAge(e.target.value); edited(); }}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Current school year</span>
          <select value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); edited(); }} className={inputClass}>
            <option value="">Not set</option>
            {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Levels</h3>
        <p className="text-xs text-slate-500 mb-3">Exercises for each skill are generated at the level set here.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SKILLS.map(({ id, label }) => (
            <label key={id} className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
              <select
                value={levels[id] ?? ''}
                onChange={(e) => {
                  const next = { ...levels };
                  if (e.target.value) next[id] = Number(e.target.value); else delete next[id];
                  setLevels(next);
                  edited();
                }}
                className={inputClass}
              >
                <option value="">Not set</option>
                {CURRICULUM.map(stage => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save profile
        </button>
        {saved && <span className="flex items-center gap-1 text-sm text-green-700"><Check size={16} /> Saved</span>}
      </div>
    </form>
  );
};
