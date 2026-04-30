'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Trash2,
  AlertTriangle,
  ClipboardList,
  StickyNote,
  X,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ExplainSection } from '@/components/word-explain';

export function ProblematicList() {
  const { problematicWords, removeProblematicWord, updateProblematicWordNotes, setCurrentView, setTestConfig, isLoggedIn } =
    useAppStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterExam, setFilterExam] = useState<string>('all');
  const [notesDialog, setNotesDialog] = useState<{ word: string; type: string; notes: string } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredWords = useMemo(() => {
    return problematicWords.filter((w) => {
      if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType !== 'all' && w.type !== filterType) return false;
      if (filterExam !== 'all' && w.exam !== filterExam) return false;
      return true;
    });
  }, [problematicWords, searchQuery, filterType, filterExam]);

  const exams = useMemo(
    () => [...new Set(problematicWords.map((w) => w.exam).filter(Boolean))] as string[],
    [problematicWords]
  );

  const getWordKey = (word: string, type: string) => `${word}::${type}`;

  const toggleSelect = (word: string, type: string) => {
    const key = getWordKey(word, type);
    const next = new Set(selectedWords);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedWords(next);
  };

  const selectAll = () => {
    const allKeys = new Set(filteredWords.map(w => getWordKey(w.word, w.type)));
    if (allKeys.size === selectedWords.size) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(allKeys);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedWords(new Set());
  };

  const deleteSelected = () => {
    let count = 0;
    selectedWords.forEach(key => {
      const [word, type] = key.split('::');
      removeProblematicWord(word, type);
      count++;
    });
    toast({ title: 'Removed', description: `${count} word${count > 1 ? 's' : ''} removed from problematic list` });
    setSelectedWords(new Set());
    setShowDeleteDialog(false);
    setSelectMode(false);
  };

  const handleTestProblematic = () => {
    if (problematicWords.length === 0) {
      toast({ title: 'No problematic words', description: 'Add some words first', variant: 'destructive' });
      return;
    }
    setTestConfig({
      ...useAppStore.getState().testConfig,
      problematicOnly: true,
    });
    setCurrentView('test-setup');
  };

  const handleSaveNotes = () => {
    if (notesDialog) {
      updateProblematicWordNotes(notesDialog.word, notesDialog.type, notesDialog.notes);
      setNotesDialog(null);
      toast({ title: 'Notes saved' });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#1a365d] mb-2">Login Required</h2>
            <p className="text-gray-500 mb-4">Please register or login to view your problematic words list</p>
            <Button className="bg-[#1a365d] hover:bg-[#1a365d]/90 text-white" onClick={() => setCurrentView('auth')}>
              Login / Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a365d]">Problematic Words</h1>
          <p className="text-gray-500 mt-1">{problematicWords.length} words marked</p>
        </div>
        <div className="flex items-center gap-2">
          {problematicWords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className={selectMode ? 'border-[#1a365d] text-[#1a365d] bg-[#1a365d]/5' : ''}
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            >
              {selectMode ? <X className="h-4 w-4 mr-1" /> : <CheckSquare className="h-4 w-4 mr-1" />}
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button
            className="bg-[#f97316] hover:bg-[#ea580c] text-white"
            onClick={handleTestProblematic}
            disabled={problematicWords.length === 0}
          >
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Test These
          </Button>
        </div>
      </div>

      {/* Select Mode Bar */}
      {selectMode && (
        <div className="mb-4 p-3 bg-[#1a365d]/5 rounded-lg border border-[#1a365d]/20 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedWords.size === filteredWords.length && filteredWords.length > 0 ? (
                <CheckSquare className="h-4 w-4 mr-1 text-[#1a365d]" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              {selectedWords.size === filteredWords.length && filteredWords.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-gray-500">
              {selectedWords.size} selected
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={selectedWords.size === 0}
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove Selected ({selectedWords.size})
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="synonym">Synonyms</option>
          <option value="antonym">Antonyms</option>
        </select>
        <select
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
        >
          <option value="all">All Exams</option>
          {exams.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>
      </div>

      {/* Words List */}
      {filteredWords.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {problematicWords.length === 0
                ? 'No problematic words yet. Mark words as problematic while reading or after tests.'
                : 'No words match your search criteria.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredWords.map((word) => {
            const wordKey = getWordKey(word.word, word.type);
            const isSelected = selectedWords.has(wordKey);

            return (
              <Card key={wordKey} className={`hover:shadow-sm transition-shadow ${isSelected ? 'ring-2 ring-[#1a365d] bg-[#1a365d]/5' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  {selectMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(word.word, word.type)}
                      className="shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1a365d]">{word.word}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          word.type === 'synonym'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {word.type}
                      </Badge>
                      {word.exam && (
                        <Badge variant="secondary" className="text-xs">
                          {word.exam}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs text-gray-400">
                        {word.source}
                      </Badge>
                    </div>
                    {word.notes && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{word.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Added {new Date(word.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!selectMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-blue-600"
                        onClick={() =>
                          setNotesDialog({
                            word: word.word,
                            type: word.type,
                            notes: word.notes || '',
                          })
                        }
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => {
                          removeProblematicWord(word.word, word.type);
                          toast({ title: 'Removed', description: `${word.word} removed from problematic list` });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove Selected Words?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Are you sure you want to remove {selectedWords.size} word{selectedWords.size > 1 ? 's' : ''} from your problematic list? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove {selectedWords.size} Word{selectedWords.size > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={(open) => !open && setNotesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Notes for &ldquo;{notesDialog?.word}&rdquo;
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add your notes here..."
            value={notesDialog?.notes || ''}
            onChange={(e) =>
              notesDialog && setNotesDialog({ ...notesDialog, notes: e.target.value })
            }
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button className="bg-[#1a365d] hover:bg-[#1a365d]/90" onClick={handleSaveNotes}>
              <Check className="h-4 w-4 mr-1" />
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
