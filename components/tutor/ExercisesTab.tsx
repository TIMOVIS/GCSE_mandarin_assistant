import React, { useState } from 'react';
import { Loader2, Send, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { AssignedLesson, Exercise, Skill, Student, WordBankEntry } from '../../types';
import { generateSkillExercises } from '../../services/geminiService';
import { saveLesson } from '../../services/storage';
import { playSpeech } from '../../services/audio';
import { SKILLS } from '../../services/skills';
import { CURRICULUM } from '../../data/curriculum';
import { formatLabel, formatsForSkill } from '../../data/exerciseFormats';

interface Props {
  student: Student;
  selectedWords: WordBankEntry[];
  onDeselectWord: (id: string) => void;
  onChooseWords: () => void;
  onAssigned: () => void;
}

const COUNTS = [4, 6, 8, 10];

export const ExercisesTab: React.FC<Props> = ({ student, selectedWords, onDeselectWord, onChooseWords, onAssigned }) => {
  const [skill, setSkill] = useState<Skill>('listening');
  const [formatIds, setFormatIds] = useState<string[]>(formatsForSkill('listening').map(f => f.id));
  const [count, setCount] = useState(6);
  const [focus, setFocus] = useState('');

  const [generating, setGenerating] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generatedSkill, setGeneratedSkill] = useState<Skill>('listening');
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);

  const stage = CURRICULUM.find(s => s.id === student.levels[skill]) || CURRICULUM[0];
  const levelSet = !!student.levels[skill];
  const skillLabel = (id: Skill) => SKILLS.find(s => s.id === id)!.label;

  const chooseSkill = (next: Skill) => {
    setSkill(next);
    setFormatIds(formatsForSkill(next).map(f => f.id));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setExercises([]);
    try {
      const result = await generateSkillExercises({
        skill,
        formatIds,
        words: selectedWords.map(({ word, pinyin, meaning }) => ({ word, pinyin, meaning })),
        stage: stage.title,
        count,
        focus: focus.trim(),
      });
      if (result.length === 0) throw new Error('nothing came back');
      setExercises(result);
      setGeneratedSkill(skill);
    } catch (e: any) {
      setError(`Could not generate exercises: ${e.message}. Try again.`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = async (index: number, text: string) => {
    setPlaying(index);
    try {
      await playSpeech(text);
    } catch (e: any) {
      setError(`Could not play the audio: ${e.message}`);
    } finally {
      setPlaying(null);
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    setError('');
    const label = skillLabel(generatedSkill);
    const lesson: AssignedLesson = {
      id: crypto.randomUUID(),
      skill: generatedSkill,
      studentId: student.id,
      studentName: student.name,
      stageTitle: stage.title,
      topicTitle: label,
      pointDescription: focus.trim() || `${label} practice`,
      material: '',
      exercises,
      assignedDate: new Date().toISOString(),
      completed: false,
    };
    try {
      await saveLesson(lesson, student.tutorId);
      setExercises([]);
      onAssigned();
    } catch (e) {
      setError('Could not assign the exercises. Check the connection and try again.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Skill</h3>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(({ id, label }) => (
              <button
                key={id}
                aria-pressed={skill === id}
                onClick={() => chooseSkill(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors touch-manipulation ${
                  skill === id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Level: {stage.title}
            {!levelSet && ' (no level set for this skill in the student profile, so Stage 1 is used)'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Formats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {formatsForSkill(skill).map(format => (
              <label key={format.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-brand-300">
                <input
                  type="checkbox"
                  checked={formatIds.includes(format.id)}
                  onChange={() => setFormatIds(ids => ids.includes(format.id) ? ids.filter(i => i !== format.id) : [...ids, format.id])}
                  className="w-4 h-4 mt-0.5 accent-brand-600 flex-shrink-0"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{format.label}</span>
                  <span className="block text-xs text-slate-500">{format.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800">Words from the word bank ({selectedWords.length})</h3>
            <button onClick={onChooseWords} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Choose words
            </button>
          </div>
          {selectedWords.length === 0 ? (
            <p className="text-xs text-slate-500">None selected. Exercises will use vocabulary that suits the level.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedWords.map(w => (
                <span key={w.id} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-100 text-sm text-slate-700 chinese-text">
                  {w.word}
                  <button onClick={() => onDeselectWord(w.id)} aria-label={`Remove ${w.word}`} className="p-0.5 text-slate-400 hover:text-slate-700">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800 mb-1.5">Focus (optional)</span>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. Ordering food, using 了"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800 mb-1.5">Questions</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || formatIds.length === 0}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Generating…' : exercises.length > 0 ? 'Generate again' : `Generate ${skillLabel(skill).toLowerCase()} exercises`}
        </button>
      </section>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {exercises.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-slate-800">
            Review before assigning: {exercises.length} {skillLabel(generatedSkill).toLowerCase()} {exercises.length === 1 ? 'exercise' : 'exercises'}
          </h3>
          {exercises.map((ex, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-1 rounded">
                  {idx + 1}. {formatLabel(ex.format) || ex.type}
                </span>
                <button
                  onClick={() => setExercises(list => list.filter((_, i) => i !== idx))}
                  title="Remove"
                  aria-label={`Remove exercise ${idx + 1}`}
                  className="p-1.5 text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {ex.audioText && (
                <div className="flex items-start gap-2 mb-2 p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <button
                    onClick={() => handlePlay(idx, ex.audioText!)}
                    disabled={playing !== null}
                    title="Play audio"
                    aria-label="Play audio"
                    className="p-1.5 rounded-full bg-white border border-purple-200 text-purple-600 hover:bg-purple-100 disabled:opacity-50 flex-shrink-0"
                  >
                    {playing === idx ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-purple-700">Student hears</p>
                    <p className="text-slate-800 chinese-text whitespace-pre-line">{ex.audioText}</p>
                  </div>
                </div>
              )}
              {ex.passage && (
                <p className="mb-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-800 chinese-text whitespace-pre-line">{ex.passage}</p>
              )}

              <p className="text-slate-800 font-medium chinese-text whitespace-pre-line">{ex.question}</p>
              {ex.questionTranslation && <p className="text-sm text-slate-500 mt-0.5">{ex.questionTranslation}</p>}

              {ex.options && ex.options.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ex.options.map((opt, i) => (
                    <li key={i} className={`text-sm px-3 py-1.5 rounded-lg border chinese-text ${
                      opt === ex.answer ? 'border-green-300 bg-green-50 text-green-800 font-medium' : 'border-slate-100 text-slate-600'
                    }`}>
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
              {ex.answer && !(ex.options || []).includes(ex.answer) && (
                <p className="mt-2 text-sm text-slate-700 border-l-4 border-slate-200 pl-3 chinese-text whitespace-pre-line">
                  <span className="block text-xs font-bold uppercase text-slate-400">Model answer</span>
                  {ex.answer}
                </p>
              )}
            </div>
          ))}

          <div className="sticky bottom-0 -mx-4 sm:-mx-6 bg-white border-t border-slate-200 p-4 flex justify-center z-10">
            <button
              onClick={handleAssign}
              disabled={assigning}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 touch-manipulation"
            >
              {assigning ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {assigning ? 'Assigning…' : `Assign to ${student.name}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
