import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { ContestRound } from '../../types/index.js';
import { GlassCard } from '../../components/ui/GlassCard.js';
import { GradientButton } from '../../components/ui/GradientButton.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import {
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ListChecks,
  Code,
  Puzzle,
  Bug,
  RefreshCw,
  X,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  weight: number;
}

export const AdminQuestions: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [rounds, setRounds] = useState<ContestRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    roundId: '',
    title: '',
    description: '',
    type: 'MCQ', // MCQ | OUTPUT_PREDICTION | JUMBLED | DEBUGGING | CODING
    difficulty: 'EASY',
    points: 5,
    timeLimitMs: 2000,
    memoryLimitMb: 128,
    constraints: '',
    initialCode: '',
    expectedOutput: '',
    // Round 1 MCQ 4-Options
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ] as QuestionOptionInput[],
    // Round 2 & 3 Dynamic Test Cases
    testCases: [
      { input: '', expectedOutput: '', isPublic: true, weight: 1 },
    ] as TestCaseInput[],
  });

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const [qRes, cRes] = await Promise.all([
        api.get(`/api/admin/questions${selectedRoundId ? `?roundId=${selectedRoundId}` : ''}`),
        api.get('/api/contests/current'),
      ]);

      if (qRes.success && qRes.data?.questions) {
        setQuestions(qRes.data.questions);
      }
      if (cRes.success && cRes.data?.contest?.rounds) {
        const sorted = cRes.data.contest.rounds.sort((a: any, b: any) => a.roundNumber - b.roundNumber);
        setRounds(sorted);
        if (!formData.roundId && sorted.length > 0) {
          setFormData((prev) => ({ ...prev, roundId: sorted[0].id }));
        }
      }
    } catch (e) {
      console.error('Failed to load questions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedRoundId]);

  // Current active target round object
  const activeRound = rounds.find((r) => r.id === (formData.roundId || selectedRoundId)) || rounds[0];
  const activeRoundNum = activeRound?.roundNumber || 1;

  // Change round in form and adjust defaults
  const handleSelectFormRound = (roundId: string) => {
    const target = rounds.find((r) => r.id === roundId);
    const rNum = target?.roundNumber || 1;

    setFormData((prev) => {
      if (rNum === 1) {
        return {
          ...prev,
          roundId,
          type: 'MCQ',
          points: 5,
          difficulty: 'EASY',
          expectedOutput: '',
        };
      } else if (rNum === 2) {
        return {
          ...prev,
          roundId,
          type: 'JUMBLED',
          points: 25,
          difficulty: 'MEDIUM',
          expectedOutput: '',
        };
      } else {
        return {
          ...prev,
          roundId,
          type: 'CODING',
          points: 50,
          difficulty: 'HARD',
        };
      }
    });
  };

  const handleSeedTemplate = async (roundNumber: number) => {
    const confirmMsg = `This will populate the official question pack for Round ${roundNumber}:\n` +
      (roundNumber === 1
        ? '• 25 Competitive MCQ Bits (4 options each)\n• 2 Output Prediction Code Challenges'
        : roundNumber === 2
        ? '• 4 Problems with Pre-given Jumbled & Buggy Code'
        : '• 3 Grand Finale Scenarios with Full Test Suites') +
      '\n\nDo you want to replace any existing questions in Round ' + roundNumber + '?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsSeeding(true);
      const res = await api.post('/api/admin/questions/seed-template', {
        roundNumber,
        clearExisting: true,
      });

      if (res.success) {
        alert(`Success! ${res.data?.createdCount || 0} questions seeded for Round ${roundNumber}.`);
        await loadQuestions();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to seed round questions');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        roundId: formData.roundId || rounds[0]?.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        difficulty: formData.difficulty,
        points: Number(formData.points),
        timeLimitMs: Number(formData.timeLimitMs),
        memoryLimitMb: Number(formData.memoryLimitMb),
        constraints: formData.constraints,
        initialCode: formData.initialCode,
        expectedOutput: formData.expectedOutput,
      };

      // If Round 1 MCQ
      if (formData.type === 'MCQ') {
        const validOptions = formData.options.filter((o) => o.text.trim().length > 0);
        if (validOptions.length < 2) {
          alert('Please provide at least 2 options for an MCQ question.');
          return;
        }
        payload.options = validOptions.map((o, idx) => ({
          text: o.text.trim(),
          isCorrect: o.isCorrect,
          orderNumber: idx + 1,
        }));
      }

      // If Round 2 or Round 3 with Test Cases
      if (['CODING', 'DEBUGGING', 'JUMBLED'].includes(formData.type)) {
        const validCases = formData.testCases.filter(
          (tc) => tc.input.trim().length > 0 && tc.expectedOutput.trim().length > 0
        );
        if (validCases.length > 0) {
          payload.testCases = validCases;
        }
      }

      await api.post('/api/admin/questions', payload);
      setModalOpen(false);
      // Reset form
      setFormData({
        roundId: rounds[0]?.id || '',
        title: '',
        description: '',
        type: 'MCQ',
        difficulty: 'EASY',
        points: 5,
        timeLimitMs: 2000,
        memoryLimitMb: 128,
        constraints: '',
        initialCode: '',
        expectedOutput: '',
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        testCases: [{ input: '', expectedOutput: '', isPublic: true, weight: 1 }],
      });
      await loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to create question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await api.delete(`/api/admin/questions/${id}`);
      await loadQuestions();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  // Filtered view by round
  const currentTabRound = rounds.find((r) => r.id === selectedRoundId);
  const currentRoundNum = currentTabRound ? currentTabRound.roundNumber : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Seeder Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0c20] p-6 rounded-3xl border border-purple-500/25 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-black text-white">Contest Question Bank &amp; Round Architect</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure round-specific question structures: <strong>Round 1</strong> (20–30 Bits + 2 Output Predictions), <strong>Round 2</strong> (Pre-given Jumbled Code with 3–5 Problems), and <strong>Round 3</strong> (Scenario-based Algorithmic Suite).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <GradientButton
            size="sm"
            onClick={() => {
              handleSelectFormRound(selectedRoundId || rounds[0]?.id || '');
              setModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Question
          </GradientButton>
        </div>
      </div>

      {/* Round Selection Tabs & Pack Seeders */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedRoundId('')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedRoundId === ''
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-[#12142d] text-slate-400 hover:text-white border border-purple-500/15'
            }`}
          >
            All Questions ({questions.length})
          </button>

          {rounds.map((r) => {
            const count = questions.filter((q) => q.roundId === r.id).length;
            const isSelected = selectedRoundId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoundId(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-[#12142d] text-slate-400 hover:text-white border border-purple-500/15'
                }`}
              >
                <span>Round {r.roundNumber}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Seed Buttons for the 3 Spec Types */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 uppercase hidden sm:inline">
            Load Preset Packs:
          </span>
          <button
            disabled={isSeeding}
            onClick={() => handleSeedTemplate(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-purple-300 bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/50 hover:text-white transition-colors disabled:opacity-50"
            title="Load 25 Bits + 2 Output Predictions"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Round 1 Pack (25 Bits + 2 Out)</span>
          </button>

          <button
            disabled={isSeeding}
            onClick={() => handleSeedTemplate(2)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/50 hover:text-white transition-colors disabled:opacity-50"
            title="Load 4 Jumbled / Buggy Problems"
          >
            <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Round 2 Pack (4 Jumbled)</span>
          </button>

          <button
            disabled={isSeeding}
            onClick={() => handleSeedTemplate(3)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 hover:text-white transition-colors disabled:opacity-50"
            title="Load 3 Grand Finale Scenarios"
          >
            <Code className="w-3.5 h-3.5 text-rose-400" />
            <span>Round 3 Pack (3 Scenarios)</span>
          </button>
        </div>
      </div>

      {/* Round Info Callout Banner based on Current Filter */}
      {currentRoundNum === 1 && (
        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/25 flex items-start gap-3 text-xs text-purple-200">
          <ListChecks className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong>Round 1 Specifications:</strong> Rapid Code &amp; Logic Sprint consisting of 20–30 Rapid Bits (Multiple Choice with 4 options and 1 correct answer) + 2 Output Prediction challenges where candidates write the exact output for the given code.
          </div>
        </div>
      )}

      {currentRoundNum === 2 && (
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 flex items-start gap-3 text-xs text-indigo-200">
          <Puzzle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <strong>Round 2 Specifications:</strong> Jumbled &amp; Debugging Arena consisting of 3–5 challenges with pre-given scrambled code snippets embedded in the problem description, target expected output, and evaluation test cases.
          </div>
        </div>
      )}

      {currentRoundNum === 3 && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-200">
          <Code className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Round 3 Specifications:</strong> Grand Competitive Finale consisting of advanced algorithmic scenario descriptions, strict memory/time limit constraints, starter code, and sample + hidden private test cases.
          </div>
        </div>
      )}

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questions.map((q, idx) => (
          <GlassCard key={q.id} className="p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                  Round {q.round?.roundNumber} • {q.type}
                </span>
                <StatusBadge status={q.difficulty} size="sm" />
              </div>

              <h3 className="text-base font-bold text-white line-clamp-1">{q.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{q.description}</p>
            </div>

            <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 font-mono">
                <span className="text-purple-300 font-bold">{q.points} Points</span>
                {q.type === 'MCQ' && (
                  <span className="text-slate-400">{q.options?.length || 0} Options</span>
                )}
                {q.type === 'OUTPUT_PREDICTION' && (
                  <span className="text-indigo-400">Written Output</span>
                )}
                {['CODING', 'DEBUGGING', 'JUMBLED'].includes(q.type) && (
                  <span className="text-slate-400">{q.testCases?.length || 0} Testcases</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}

        {questions.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center border border-dashed border-purple-500/20 rounded-3xl bg-[#0e1026] space-y-3">
            <FileQuestion className="w-10 h-10 text-purple-400 mx-auto opacity-60" />
            <p className="text-sm font-semibold text-slate-300">No questions found in this selection.</p>
            <p className="text-xs text-slate-500">
              Click &quot;Create Question&quot; above or click one of the preset pack buttons to instantly populate questions!
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Create Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#101228] border border-purple-500/30 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/15">
              <div>
                <h3 className="text-lg font-bold text-white">Create Round Question</h3>
                <span className="text-xs font-mono text-purple-400">
                  Target: Round {activeRoundNum} ({activeRound?.title || 'Contest'})
                </span>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              {/* Target Round & Question Type Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Target Round</label>
                  <select
                    value={formData.roundId}
                    onChange={(e) => handleSelectFormRound(e.target.value)}
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        Round {r.roundNumber}: {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Question Structure Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    {activeRoundNum === 1 && (
                      <>
                        <option value="MCQ">Round 1: Rapid Bit (MCQ with 4 Options)</option>
                        <option value="OUTPUT_PREDICTION">Round 1: Output Prediction (Write-in)</option>
                      </>
                    )}
                    {activeRoundNum === 2 && (
                      <>
                        <option value="JUMBLED">Round 2: Jumbled Code Reconstruction</option>
                        <option value="DEBUGGING">Round 2: Buggy Code Extermination</option>
                      </>
                    )}
                    {activeRoundNum === 3 && (
                      <option value="CODING">Round 3: Algorithmic Scenario &amp; Test Suite</option>
                    )}
                    {/* Fallback all types */}
                    {!activeRoundNum && (
                      <>
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="OUTPUT_PREDICTION">Output Prediction</option>
                        <option value="JUMBLED">Jumbled Code</option>
                        <option value="DEBUGGING">Debugging Challenge</option>
                        <option value="CODING">Coding Problem</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Problem Title */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Problem Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    formData.type === 'MCQ'
                      ? 'e.g. Bit #1: Bitwise XOR Invariant'
                      : formData.type === 'OUTPUT_PREDICTION'
                      ? 'e.g. Output Prediction #1: Closure Scoping'
                      : formData.type === 'JUMBLED'
                      ? 'e.g. Round 2 - Challenge #1: Jumbled QuickSelect'
                      : 'e.g. Scenario #1: Multi-Tier Cache Eviction'
                  }
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Problem Statement / Description */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  {formData.type === 'JUMBLED'
                    ? 'Problem Description & Pre-given Jumbled Code Snippet'
                    : 'Problem Description (Markdown supported)'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={
                    formData.type === 'JUMBLED'
                      ? '### Objective\nDescribe task...\n\n### Pre-given Jumbled Code Snippet:\n```python\n# Scrambled code here...\n```'
                      : 'Enter problem description, requirements, or code snippet...'
                  }
                  className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {/* DYNAMIC FIELD: Round 1 MCQ 4-Options Builder */}
              {formData.type === 'MCQ' && (
                <div className="p-4 rounded-2xl bg-[#0d0f24] border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">4 Multiple Choice Options (Select 1 correct):</span>
                    <span className="text-[11px] text-slate-400">Radio button marks the correct answer</span>
                  </div>
                  <div className="space-y-2.5">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={() => {
                            const updated = formData.options.map((o, i) => ({
                              ...o,
                              isCorrect: i === idx,
                            }));
                            setFormData({ ...formData, options: updated });
                          }}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span className="font-mono text-slate-400 text-xs w-6">#{idx + 1}</span>
                        <input
                          type="text"
                          required
                          value={opt.text}
                          onChange={(e) => {
                            const updated = [...formData.options];
                            updated[idx].text = e.target.value;
                            setFormData({ ...formData, options: updated });
                          }}
                          placeholder={`Option ${idx + 1} text...`}
                          className="flex-1 bg-[#141738] border border-purple-500/20 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC FIELD: Round 1 Output Prediction Write-in String */}
              {formData.type === 'OUTPUT_PREDICTION' && (
                <div className="p-4 rounded-2xl bg-[#0d0f24] border border-purple-500/20 space-y-2">
                  <label className="block text-purple-300 font-bold">
                    Expected Console Output (Participant will write this exact output):
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.expectedOutput}
                    onChange={(e) => setFormData({ ...formData, expectedOutput: e.target.value })}
                    placeholder="e.g. [4, 4, 4] or 19"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    Grading will compare the candidate&apos;s typed answer against this string (whitespace-trimmed).
                  </p>
                </div>
              )}

              {/* DYNAMIC FIELD: Round 2 / Round 3 Starter Code */}
              {['JUMBLED', 'DEBUGGING', 'CODING'].includes(formData.type) && (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    {formData.type === 'JUMBLED'
                      ? 'Starter Code for Participant Editor (Reconstruction Workspace)'
                      : 'Initial Starter / Skeleton Code'}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.initialCode}
                    onChange={(e) => setFormData({ ...formData, initialCode: e.target.value })}
                    placeholder="e.g. def solve(nums):\n    # Reorder and implement here\n    pass"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              {/* DYNAMIC FIELD: Round 2 & Round 3 Test Suite Builder */}
              {['JUMBLED', 'DEBUGGING', 'CODING'].includes(formData.type) && (
                <div className="p-4 rounded-2xl bg-[#0d0f24] border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">Test Cases Suite:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          testCases: [
                            ...formData.testCases,
                            { input: '', expectedOutput: '', isPublic: false, weight: 1 },
                          ],
                        })
                      }
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Test Case
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.testCases.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#141738] border border-purple-500/20 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-purple-300 font-bold">Case #{idx + 1}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={tc.isPublic}
                                onChange={(e) => {
                                  const updated = [...formData.testCases];
                                  updated[idx].isPublic = e.target.checked;
                                  setFormData({ ...formData, testCases: updated });
                                }}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span>Public Sample</span>
                            </label>

                            {formData.testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formData.testCases.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, testCases: updated });
                                }}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => {
                              const updated = [...formData.testCases];
                              updated[idx].input = e.target.value;
                              setFormData({ ...formData, testCases: updated });
                            }}
                            placeholder="Input stdin..."
                            className="bg-[#0e1026] border border-purple-500/15 rounded-lg p-2 text-white font-mono text-xs"
                          />
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const updated = [...formData.testCases];
                              updated[idx].expectedOutput = e.target.value;
                              setFormData({ ...formData, testCases: updated });
                            }}
                            placeholder="Expected output..."
                            className="bg-[#0e1026] border border-purple-500/15 rounded-lg p-2 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Points, Difficulty, Time Limit, Constraints */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Time Limit (ms)</label>
                  <input
                    type="number"
                    value={formData.timeLimitMs}
                    onChange={(e) => setFormData({ ...formData, timeLimitMs: Number(e.target.value) })}
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Constraints</label>
                  <input
                    type="text"
                    value={formData.constraints}
                    onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                    placeholder="e.g. N <= 10^5"
                    className="w-full bg-[#141738] border border-purple-500/25 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-purple-500/15 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <GradientButton type="submit" size="sm">
                  Save Question
                </GradientButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
