
import React, { useEffect, useState } from 'react';
import { getLessons, getVocabProgress } from '../services/storage';
import { AssignedLesson, VocabProgress } from '../types';
import { ArrowLeft, User, BookOpen, CheckCircle2, Clock, Calendar, Loader2, Layers, Eye, X, Check, XCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
}

interface StudentStats {
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  lessons: AssignedLesson[];
  vocab: Record<string, VocabProgress[]>; // grouped by category
}

export const StudentProgressView: React.FC<Props> = ({ onBack }) => {
  const [studentData, setStudentData] = useState<Record<string, StudentStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<AssignedLesson | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const allLessons = await getLessons();
        const allVocab = await getVocabProgress();
        const stats: Record<string, StudentStats> = {};

        // Process Lessons
        allLessons.forEach(lesson => {
            const name = lesson.studentName;
            if (!stats[name]) {
                stats[name] = {
                    totalLessons: 0,
                    completedLessons: 0,
                    averageScore: 0,
                    lessons: [],
                    vocab: {}
                };
            }

            stats[name].lessons.push(lesson);
            stats[name].totalLessons += 1;
            if (lesson.completed) {
                stats[name].completedLessons += 1;
            }
        });

        // Process Vocab - ensure we catch students who might have done vocab but no lessons yet
        allVocab.forEach(v => {
            const name = v.studentName;
            if (!stats[name]) {
                stats[name] = {
                    totalLessons: 0,
                    completedLessons: 0,
                    averageScore: 0,
                    lessons: [],
                    vocab: {}
                };
            }
            if (!stats[name].vocab[v.category]) {
                stats[name].vocab[v.category] = [];
            }
            // Avoid duplicates if any
            if (!stats[name].vocab[v.category].find(existing => existing.word === v.word)) {
                 stats[name].vocab[v.category].push(v);
            }
        });

        // Calculate averages (score is now a percentage 0-100)
        Object.keys(stats).forEach(name => {
            const completed = stats[name].lessons.filter(l => l.completed);
            if (completed.length > 0) {
                const totalScorePercent = completed.reduce((acc, l) => {
                    // Score is already a percentage (0-100) from the new evaluation system
                    const score = l.score || 0;
                    return acc + score;
                }, 0);
                stats[name].averageScore = Math.round(totalScorePercent / completed.length);
            }
        });

        setStudentData(stats);
        setLoading(false);
    };
    
    fetchData();
  }, []);

  const students = Object.keys(studentData).sort();

  return (
    <div className="h-full bg-slate-50 flex flex-col relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shrink-0">
        <button 
          onClick={onBack}
          className="mr-4 p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Student Progress Reports</h1>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full overflow-y-auto">
        {loading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={40} className="text-brand-500 animate-spin" />
            </div>
        ) : students.length === 0 ? (
           <div className="text-center py-20">
             <div className="bg-slate-100 p-6 rounded-full inline-block mb-4">
               <User className="text-slate-400 w-12 h-12" />
             </div>
             <h3 className="text-lg font-semibold text-slate-700">No student data found</h3>
             <p className="text-slate-500">Assign lessons to students to see their progress here.</p>
           </div>
        ) : (
          <div className="space-y-8">
            {students.map(name => {
              const data = studentData[name];
              const vocabCategories = Object.keys(data.vocab);
              
              return (
                <div key={name} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Student Header */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xl">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                        <div className="flex gap-4 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><BookOpen size={14} /> {data.totalLessons} Lessons</span>
                          <span className="flex items-center gap-1"><Layers size={14} /> {vocabCategories.length} Topics</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats Pill */}
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completion</div>
                            <div className="text-lg font-semibold text-slate-700">
                                {data.totalLessons > 0 ? Math.round((data.completedLessons / data.totalLessons) * 100) : 0}%
                            </div>
                        </div>
                        <div className="text-center px-6 border-l border-slate-200">
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Score</div>
                            <div className={`text-lg font-bold ${data.averageScore >= 80 ? 'text-green-600' : data.averageScore >= 60 ? 'text-yellow-600' : 'text-slate-600'}`}>
                                {data.averageScore}%
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    
                    {/* Lessons Column */}
                    <div className="p-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Assigned Lessons</h3>
                        {data.lessons.length === 0 ? (
                            <p className="text-slate-400 text-sm italic">No lessons assigned yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.lessons.map(lesson => (
                                <div key={lesson.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3 group">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-700 truncate">{lesson.pointDescription}</h4>
                                        <p className="text-xs text-slate-500">{new Date(lesson.assignedDate).toLocaleDateString()}</p>
                                    </div>
                                    {lesson.completed ? (
                                        <div className="flex items-center gap-2">
                                            <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
                                              (lesson.score || 0) >= 80 ? 'bg-green-100 text-green-700' : 
                                              (lesson.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                              'bg-red-100 text-red-700'
                                            }`}>
                                                {lesson.score || 0}%
                                            </span>
                                            <button 
                                                onClick={() => setSelectedLesson(lesson)}
                                                className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                                            Pending
                                        </span>
                                    )}
                                </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Vocabulary Column */}
                    <div className="p-6">
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Vocabulary Mastery</h3>
                         {vocabCategories.length === 0 ? (
                            <p className="text-slate-400 text-sm italic">No vocabulary practice recorded.</p>
                         ) : (
                            <div className="space-y-3">
                                {vocabCategories.map(cat => {
                                    const words = data.vocab[cat];
                                    return (
                                        <div key={cat} className="p-3 bg-slate-50 rounded-xl">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-slate-700 text-sm">{cat}</span>
                                                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                                                    {words.length} words
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {words.map((w, i) => (
                                                    <span key={i} title={`${w.pinyin}: ${w.meaning}`} className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-sm text-slate-600 chinese-text cursor-help">
                                                        {w.word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                         )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lesson Details Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Results: {selectedLesson.pointDescription}</h3>
                        <p className="text-xs text-slate-500">Student: {selectedLesson.studentName}</p>
                    </div>
                    <button onClick={() => setSelectedLesson(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="space-y-4">
                        {selectedLesson.exercises.map((ex, idx) => {
                             const userAnswers = selectedLesson.userAnswers || [];
                             const exerciseScores = selectedLesson.exerciseScores || [];
                             const exerciseFeedback = selectedLesson.exerciseFeedback || [];
                             const exScore = exerciseScores[idx] || 0;
                             const exFeedback = exerciseFeedback[idx] || '';
                             const userAns = userAnswers[idx] || '(No answer)';
                             const borderColor = exScore === 100 ? 'border-green-300' : exScore >= 50 ? 'border-yellow-300' : 'border-red-300';
                             const bgColor = exScore === 100 ? 'bg-green-50' : exScore >= 50 ? 'bg-yellow-50' : 'bg-red-50';
                             const scoreColor = exScore === 100 ? 'text-green-600' : exScore >= 50 ? 'text-yellow-600' : 'text-red-600';
                             const iconColor = exScore === 100 ? 'text-green-500' : exScore >= 50 ? 'text-yellow-500' : 'text-red-500';

                             return (
                                <div key={idx} className={`bg-white p-5 rounded-xl border-2 ${borderColor} ${bgColor}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                              exScore === 100 ? 'bg-green-500' : exScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <h4 className="font-bold text-slate-800 chinese-text text-lg">{ex.question}</h4>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`font-bold text-lg ${scoreColor}`}>{exScore}%</span>
                                            {exScore === 100 ? (
                                              <Check className={iconColor} size={20} />
                                            ) : (
                                              <XCircle className={iconColor} size={20} />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="ml-9 space-y-3">
                                        <div className={`p-3 rounded-lg ${exScore === 100 ? 'bg-green-100' : exScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                                            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Student Answer</p>
                                            <p className={`font-medium chinese-text ${
                                              exScore === 100 ? 'text-green-800' : exScore >= 50 ? 'text-yellow-800' : 'text-red-800'
                                            }`}>
                                                {userAns}
                                            </p>
                                        </div>
                                        {exFeedback && (
                                            <div className="p-3 rounded-lg bg-white border border-slate-200">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Feedback</p>
                                                <p className="text-sm text-slate-700">{exFeedback}</p>
                                            </div>
                                        )}
                                        {ex.answer && (
                                            <div className="p-3 rounded-lg bg-slate-100">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correct Answer</p>
                                                <p className="font-medium text-slate-800 chinese-text">{ex.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
                    <button 
                        onClick={() => setSelectedLesson(null)}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-black transition-colors font-medium"
                    >
                        Close Results
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
