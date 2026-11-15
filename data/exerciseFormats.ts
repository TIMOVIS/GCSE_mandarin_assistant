// Exercise formats the tutor can generate for each skill. Edit this file to
// change them: the tutor's Exercises tab lists them, and the AI is told to
// follow `spec` when writing each exercise.

import { Exercise, Skill } from '../types';

export interface ExerciseFormat {
  id: string;
  skill: Skill;
  label: string;
  description: string; // Shown to the tutor
  type: Exercise['type']; // How the student answers
  spec: string; // Instructions for the AI: what goes in each field
}

export const EXERCISE_FORMATS: ExerciseFormat[] = [
  // --- Listening: the student hears audioText and never sees it ---
  {
    id: 'listen_choose',
    skill: 'listening',
    label: 'Hear and choose the meaning',
    description: 'Hear a sentence, pick what it means from four options.',
    type: 'quiz',
    spec: 'audioText: one Chinese sentence to be read aloud. question: a short English question about what was said. options: four English answers. answer: the correct option, copied exactly.',
  },
  {
    id: 'listen_true_false',
    skill: 'listening',
    label: 'Dialogue: true or false',
    description: 'Hear a short dialogue, decide if a statement is true.',
    type: 'quiz',
    spec: 'audioText: a Chinese dialogue of 2-4 short lines between two people. question: an English statement about the dialogue. options: ["True", "False"]. answer: "True" or "False".',
  },
  {
    id: 'dictation',
    skill: 'listening',
    label: 'Dictation',
    description: 'Hear a sentence and type it in characters.',
    type: 'translation',
    spec: 'audioText: one short Chinese sentence. question: "Type what you hear in Chinese characters." answer: the same sentence as audioText. options: [].',
  },
  {
    id: 'listen_gap',
    skill: 'listening',
    label: 'Fill the gap from audio',
    description: 'Hear a sentence, type the word missing from the written version.',
    type: 'fill_in_the_blank',
    spec: 'audioText: one full Chinese sentence. question: the same sentence with one key word replaced by ____. answer: the missing word. options: [].',
  },

  // --- Speaking: the student records an answer for the tutor to hear ---
  {
    id: 'read_aloud',
    skill: 'speaking',
    label: 'Read aloud',
    description: 'Read one or two sentences aloud.',
    type: 'speaking',
    spec: 'question: one or two Chinese sentences for the student to read aloud. questionTranslation: the English meaning. answer: the pinyin with tone marks. options: [].',
  },
  {
    id: 'role_play',
    skill: 'speaking',
    label: 'Role-play',
    description: 'Hear a prompt in a set scene and reply.',
    type: 'speaking',
    spec: 'question: the scene in English, e.g. "You are in a restaurant. Answer the waiter." audioText: what the other person says, in Chinese. answer: a model reply in Chinese. options: [].',
  },
  {
    id: 'picture_description',
    skill: 'speaking',
    label: 'Describe a picture',
    description: 'Describe a scene in a few sentences.',
    type: 'speaking',
    spec: 'question: "Describe the picture: " followed by a one-sentence English description of an everyday scene. answer: a model description in Chinese of 2-4 sentences. options: [].',
  },
  {
    id: 'open_question',
    skill: 'speaking',
    label: 'Open question (30-60 seconds)',
    description: 'Answer a conversation question at length.',
    type: 'speaking',
    spec: 'question: an open conversation question in Chinese. questionTranslation: the English meaning. answer: a model answer in Chinese of 3-5 sentences. options: [].',
  },

  // --- Reading ---
  {
    id: 'word_meaning',
    skill: 'reading',
    label: 'Word to meaning',
    description: 'Read a word or sentence, pick the meaning.',
    type: 'quiz',
    spec: 'question: a Chinese word or short sentence. options: four English meanings. answer: the correct option, copied exactly. Do not give questionTranslation.',
  },
  {
    id: 'read_gap',
    skill: 'reading',
    label: 'Fill in the blank (choose)',
    description: 'Pick the word that completes the sentence.',
    type: 'fill_in_the_blank',
    spec: 'question: a Chinese sentence with one word replaced by ____. options: four Chinese words. answer: the correct option, copied exactly. Do not give questionTranslation.',
  },
  {
    id: 'passage_questions',
    skill: 'reading',
    label: 'Passage with questions',
    description: 'Read a short passage and answer a question on it.',
    type: 'quiz',
    spec: 'passage: a Chinese text of 60-120 characters (longer for higher stages). question: an English comprehension question. options: four English answers. answer: the correct option, copied exactly. Several exercises may share the same passage.',
  },
  {
    id: 'zh_to_en',
    skill: 'reading',
    label: 'Translate Chinese to English',
    description: 'Translate a sentence into English.',
    type: 'translation',
    spec: 'question: one Chinese sentence. answer: the English translation. options: []. Do not give questionTranslation.',
  },

  // --- Writing ---
  {
    id: 'en_to_zh',
    skill: 'writing',
    label: 'Translate English to Chinese',
    description: 'Translate a sentence into characters.',
    type: 'translation',
    spec: 'question: one English sentence to translate. answer: the Chinese translation. options: []. Do not give questionTranslation.',
  },
  {
    id: 'sentence_building',
    skill: 'writing',
    label: 'Build a sentence',
    description: 'Put jumbled words in the right order.',
    type: 'translation',
    spec: 'question: the words of a Chinese sentence in jumbled order, separated by " / ". questionTranslation: the English meaning of the sentence. answer: the correct sentence. options: [].',
  },
  {
    id: 'write_gap',
    skill: 'writing',
    label: 'Fill in the blank (type)',
    description: 'Type the missing word in characters.',
    type: 'fill_in_the_blank',
    spec: 'question: a Chinese sentence with one word replaced by ____. questionTranslation: the English meaning of the full sentence. answer: the missing word. options: [].',
  },
  {
    id: 'guided_composition',
    skill: 'writing',
    label: 'Guided composition',
    description: 'Write 80-150 characters from bullet prompts.',
    type: 'composition',
    spec: 'question: an English writing task with 3-4 bullet points to cover and a target length in characters (80-150, by stage). answer: a model answer in Chinese. options: [].',
  },
];

export const formatsForSkill = (skill: Skill): ExerciseFormat[] =>
  EXERCISE_FORMATS.filter(f => f.skill === skill);

export const formatLabel = (id?: string): string =>
  EXERCISE_FORMATS.find(f => f.id === id)?.label || '';
