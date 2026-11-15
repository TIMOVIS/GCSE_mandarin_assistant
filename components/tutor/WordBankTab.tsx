import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Loader2, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import { WordBankEntry } from '../../types';
import { addWordBankEntries, deleteWordBankEntry, updateWordBankEntry } from '../../services/storage';
import { annotateWords } from '../../services/geminiService';
import { TAG_GROUPS } from '../../data/wordTags';

interface Props {
  tutorId?: string;
  words: WordBankEntry[];
  setWords: React.Dispatch<React.SetStateAction<WordBankEntry[]>>;
  loading: boolean;
  error: string;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onUseInExercises: () => void;
}

type Draft = { word: string; pinyin: string; meaning: string };

// One entry per line: "word", or "word, pinyin, meaning" (comma or tab separated)
const parseLines = (text: string): Draft[] =>
  text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/\t|,|，/).map(p => p.trim());
      return { word: parts[0], pinyin: parts[1] || '', meaning: parts.slice(2).join(', ') };
    })
    .filter(d => d.word);

const AI_BATCH = 30;

const TagPicker: React.FC<{ value: string[]; onChange: (tags: string[]) => void }> = ({ value, onChange }) => (
  <div className="space-y-2">
    {TAG_GROUPS.map(group => (
      <div key={group.id} className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0">{group.label}</span>
        {group.tags.map(tag => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter(t => t !== tag) : [...value, tag])}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                on ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);

export const WordBankTab: React.FC<Props> = ({
  tutorId, words, setWords, loading, error, selectedIds, setSelectedIds, onUseInExercises
}) => {
  const [uploadText, setUploadText] = useState('');
  const [autoFill, setAutoFill] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [editing, setEditing] = useState<WordBankEntry | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter(w =>
      (!tagFilter || w.tags.includes(tagFilter)) &&
      (!q || w.word.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q))
    );
  }, [words, search, tagFilter]);

  const allVisibleSelected = visible.length > 0 && visible.every(w => selectedIds.includes(w.id));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadText(await file.text());
    e.target.value = '';
  };

  const handleUpload = async () => {
    setActionError('');
    setNotice('');
    const existing = new Set(words.map(w => w.word));
    const drafts = parseLines(uploadText).filter((d, i, all) =>
      !existing.has(d.word) && all.findIndex(o => o.word === d.word) === i
    );
    if (drafts.length === 0) {
      setNotice('Nothing new to add: these words are already in the word bank.');
      return;
    }

    setUploading(true);
    try {
      let entries = drafts.map(d => ({ ...d, tags: [] as string[], tutorId }));
      let untagged = false;
      if (autoFill) {
        try {
          for (let i = 0; i < drafts.length; i += AI_BATCH) {
            const filled = await annotateWords(drafts.slice(i, i + AI_BATCH));
            filled.forEach(f => {
              const entry = entries.find(e => e.word === f.word);
              if (entry) {
                entry.pinyin = entry.pinyin || f.pinyin;
                entry.meaning = entry.meaning || f.meaning;
                entry.tags = f.tags;
              }
            });
          }
        } catch (e) {
          untagged = true;
        }
      }
      const saved = await addWordBankEntries(entries);
      setWords(prev => [...saved, ...prev]);
      setUploadText('');
      setNotice(
        `Added ${saved.length} ${saved.length === 1 ? 'entry' : 'entries'}.` +
        (untagged ? ' Automatic pinyin, meaning and tags failed, so fill those in by hand.' : '')
      );
    } catch (e: any) {
      setActionError(`Could not add the words: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setActionError('');
    try {
      await updateWordBankEntry(editing);
      setWords(prev => prev.map(w => (w.id === editing.id ? editing : w)));
      setEditing(null);
    } catch (e: any) {
      setActionError(`Could not save the change: ${e.message}`);
    }
  };

  const handleDelete = async (entry: WordBankEntry) => {
    if (!window.confirm(`Delete "${entry.word}" from the word bank?`)) return;
    setActionError('');
    try {
      await deleteWordBankEntry(entry.id);
      setWords(prev => prev.filter(w => w.id !== entry.id));
      setSelectedIds(ids => ids.filter(id => id !== entry.id));
    } catch (e: any) {
      setActionError(`Could not delete: ${e.message}`);
    }
  };

  const toggle = (id: string) =>
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]));

  const toggleAllVisible = () => {
    const ids = visible.map(w => w.id);
    setSelectedIds(prev => allVisibleSelected ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-48"><Loader2 size={36} className="text-brand-500 animate-spin" /></div>;
  }
  if (error) {
    return <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Add words and phrases</h3>
        <p className="text-xs text-slate-500 mb-3">
          One per line. Either just the word, or <span className="font-mono">word, pinyin, meaning</span>. The word bank is shared across all your students.
        </p>
        <textarea
          value={uploadText}
          onChange={(e) => setUploadText(e.target.value)}
          rows={4}
          placeholder={'苹果\n图书馆, túshūguǎn, library\n我觉得'}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none chinese-text text-sm"
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-brand-300 cursor-pointer">
            <Upload size={16} /> Load a .txt or .csv file
            <input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} className="hidden" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={autoFill} onChange={(e) => setAutoFill(e.target.checked)} className="w-4 h-4 accent-brand-600" />
            Fill in pinyin, meaning and tags automatically
          </label>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadText.trim()}
            className="ml-auto flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? 'Adding…' : 'Add to word bank'}
          </button>
        </div>
        {notice && <p className="text-sm text-slate-600 mt-3">{notice}</p>}
      </section>

      {actionError && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{actionError}</p>}

      {/* List */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search word, pinyin or meaning"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Filter by tag"
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">All tags</option>
            {TAG_GROUPS.map(group => (
              <optgroup key={group.id} label={group.label}>
                {group.tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {words.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl px-4 py-8 text-center">
            The word bank is empty. Add words above to get started.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl px-4 py-8 text-center">
            No words match this search and tag.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <label className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="w-4 h-4 accent-brand-600" />
              Select all {visible.length} shown for exercise generation
            </label>
            {visible.map(entry => editing?.id === entry.id ? (
              <div key={entry.id} className="p-4 space-y-3 bg-slate-50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['word', 'pinyin', 'meaning'] as const).map(field => (
                    <input
                      key={field}
                      value={editing[field]}
                      onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
                      aria-label={field}
                      placeholder={field}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  ))}
                </div>
                <TagPicker value={editing.tags} onChange={(tags) => setEditing({ ...editing, tags })} />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={!editing.word.trim()} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-100">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => toggle(entry.id)}
                  aria-label={`Select ${entry.word}`}
                  className="w-4 h-4 mt-1.5 accent-brand-600 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800">
                    <span className="chinese-text text-lg font-medium">{entry.word}</span>
                    {entry.pinyin && <span className="text-sm text-slate-500 ml-2">{entry.pinyin}</span>}
                    {entry.meaning && <span className="text-sm text-slate-600 ml-2">· {entry.meaning}</span>}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.tags.length === 0
                      ? <span className="text-xs text-slate-400">No tags</span>
                      : entry.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{tag}</span>
                      ))}
                  </div>
                </div>
                <button onClick={() => setEditing(entry)} title="Edit" aria-label={`Edit ${entry.word}`} className="p-2 text-slate-400 hover:text-brand-600">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(entry)} title="Delete" aria-label={`Delete ${entry.word}`} className="p-2 text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-center gap-3 z-10">
          <span className="text-sm font-medium text-slate-700">
            {selectedIds.length} {selectedIds.length === 1 ? 'word' : 'words'} selected
          </span>
          <button onClick={() => setSelectedIds([])} className="text-sm font-medium text-slate-500 hover:text-slate-800 px-3 py-2">
            Clear
          </button>
          <button
            onClick={onUseInExercises}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors touch-manipulation"
          >
            Use in exercises <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
