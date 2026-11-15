import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { AssignedLesson, Student } from '../../types';
import { getLessons, lessonBelongsTo } from '../../services/storage';
import { SKILLS, getLessonSkill } from '../../services/skills';
import { formatLabel } from '../../data/exerciseFormats';

interface Props {
  student: Student;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const scoreColor = (score: number) =>
  score >= 80 ? 'text-green-700 bg-green-50' : score >= 50 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';

// Speaking is marked by the tutor listening, not by a score
const isSpeakingOnly = (lesson: AssignedLesson) =>
  lesson.exercises.length > 0 && lesson.exercises.every(e => e.type === 'speaking');

export const HistoryTab: React.FC<Props> = ({ student }) => {
  const [lessons, setLessons] = useState<AssignedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getLessons().then(all => {
      if (!mounted) return;
      setLessons(all.filter(l => lessonBelongsTo(l, student)));
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [student]);

  if (loading) {
    return <div className="flex justify-center items-center h-48"><Loader2 size={36} className="text-brand-500 animate-spin" /></div>;
  }

  const submitted = lessons.filter(l => l.completed);
  const waiting = lessons.filter(l => !l.completed);

  return (
    <div className="space-y-6">
      {waiting.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Clock size={16} className="text-slate-400" />
          {waiting.length} assigned {waiting.length === 1 ? 'exercise set is' : 'exercise sets are'} not submitted yet.
        </p>
      )}

      {submitted.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl px-4 py-10 text-center">
          {student.name} has not submitted any work yet.
        </p>
      ) : (
        <div className="space-y-3">
          {submitted.map(lesson => {
            const open = openId === lesson.id;
            const skill = SKILLS.find(s => s.id === getLessonSkill(lesson))!;
            const scores = lesson.tutorAdjustedScores || lesson.exerciseScores || [];
            return (
              <div key={lesson.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : lesson.id)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors touch-manipulation"
                >
                  {open ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{lesson.pointDescription}</p>
                    <p className="text-xs text-slate-500">
                      {[skill.label, lesson.topicTitle !== skill.label ? lesson.topicTitle : '', formatDate(lesson.assignedDate)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {isSpeakingOnly(lesson) && !lesson.tutorAdjustedScores ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 text-slate-600 bg-slate-100">To listen</span>
                  ) : typeof lesson.score === 'number' && (
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${scoreColor(lesson.score)}`}>{lesson.score}%</span>
                  )}
                </button>

                {open && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                    {lesson.audioUrl && (
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-1">Recording</p>
                        <audio controls preload="none" src={lesson.audioUrl} className="w-full max-w-md" />
                      </div>
                    )}
                    {lesson.exercises.map((ex, idx) => {
                      const audio = lesson.userAudio?.[idx];
                      const answer = lesson.userAnswers?.[idx];
                      const feedback = lesson.exerciseFeedback?.[idx];
                      const comment = lesson.tutorComments?.[idx];
                      return (
                        <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                {idx + 1}. {formatLabel(ex.format) || ex.type.replace(/_/g, ' ')}
                              </p>
                              {ex.audioText && <p className="text-sm text-purple-700 chinese-text whitespace-pre-line mb-1">Heard: {ex.audioText}</p>}
                              <p className="font-medium text-slate-800 chinese-text whitespace-pre-line">{ex.question}</p>
                              {ex.questionTranslation && <p className="text-sm text-slate-500">{ex.questionTranslation}</p>}
                            </div>
                            {ex.type !== 'speaking' && typeof scores[idx] === 'number' && (
                              <span className={`text-sm font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${scoreColor(scores[idx])}`}>{scores[idx]}%</span>
                            )}
                          </div>

                          <p className="text-xs font-bold uppercase text-slate-400 mt-3 mb-1">Student's answer</p>
                          {audio ? (
                            <audio controls preload="none" src={audio} className="w-full max-w-md" />
                          ) : (
                            <p className="text-slate-800 chinese-text whitespace-pre-line">{answer || <span className="text-slate-400">No answer</span>}</p>
                          )}

                          {ex.answer && (
                            <>
                              <p className="text-xs font-bold uppercase text-slate-400 mt-3 mb-1">{ex.type === 'speaking' ? 'Model answer' : 'Correct answer'}</p>
                              <p className="text-green-700 chinese-text whitespace-pre-line">{ex.answer}</p>
                            </>
                          )}
                          {feedback && <p className="text-sm text-slate-600 mt-3">{feedback}</p>}
                          {comment && <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-3">Your comment: {comment}</p>}
                        </div>
                      );
                    })}
                    {lesson.tutorOverallComment && (
                      <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">Your overall comment: {lesson.tutorOverallComment}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
