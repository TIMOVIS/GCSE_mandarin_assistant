// Labels a word-bank entry can carry. Edit this file to change the tags:
// the tutor's Word bank tab and the AI auto-tagging both read from it.

export interface TagGroup {
  id: string;
  label: string;
  tags: string[];
}

export const TAG_GROUPS: TagGroup[] = [
  {
    id: 'topic',
    label: 'Topic',
    tags: [
      'Everyday activities',
      'Personal and social life',
      'The world around us',
      'The world of work',
      'The international world',
    ],
  },
  {
    id: 'type',
    label: 'Word type',
    tags: [
      'Noun',
      'Verb',
      'Adjective',
      'Adverb',
      'Measure word',
      'Conjunction',
      'Particle',
      'Question word',
      'Set phrase / idiom',
      'Sentence pattern',
    ],
  },
  {
    id: 'level',
    label: 'Level',
    tags: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6'],
  },
  {
    id: 'use',
    label: 'Exam use',
    tags: ['Recognise only', 'Must produce', 'Must handwrite'],
  },
  {
    id: 'function',
    label: 'Exam function',
    tags: ['Opinion and reason', 'Connective', 'Time marker', 'Comparison', 'Intensifier'],
  },
];

export const ALL_TAGS: string[] = TAG_GROUPS.flatMap(g => g.tags);
