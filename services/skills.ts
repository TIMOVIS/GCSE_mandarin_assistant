import { AssignedLesson, Exercise, Skill } from '../types';

export const SKILLS: { id: Skill; label: string }[] = [
  { id: 'listening', label: 'Listening' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' },
];

const DESCRIPTION_PATTERNS: [Skill, RegExp][] = [
  ['listening', /listen|audio/i],
  ['speaking', /speak|role ?play|oral|presentation|debate|dialogue|q&a|pronunciation|fluency/i],
  ['reading', /\bread|article|skim|gist|true\/false/i],
  ['writing', /\bwrit|composition|essay|stroke/i],
];

// Best guess at a skill when the tutor has not picked one (including lessons
// assigned before skills existed).
export const inferSkill = (topicTitle: string, pointDescription: string, exercises: Exercise[]): Skill => {
  for (const [skill, pattern] of DESCRIPTION_PATTERNS) {
    if (pattern.test(pointDescription)) return skill;
  }

  // Topic titles can name two skills ("Writing & Reading"); take the first one mentioned.
  const title = topicTitle.toLowerCase();
  const inTitle = SKILLS
    .map(s => ({ id: s.id, at: title.indexOf(s.id) }))
    .filter(s => s.at !== -1)
    .sort((a, b) => a.at - b.at);
  if (inTitle.length > 0) return inTitle[0].id;

  // Otherwise go by what the student mostly has to do: produce Chinese, or pick answers.
  const productive = exercises.filter(e => e.type !== 'quiz').length;
  return productive > exercises.length / 2 ? 'writing' : 'reading';
};

export const getLessonSkill = (lesson: AssignedLesson): Skill =>
  lesson.skill || inferSkill(lesson.topicTitle, lesson.pointDescription, lesson.exercises || []);
