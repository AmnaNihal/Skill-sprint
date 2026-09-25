import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { X, Award, RefreshCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  id: string;
  module_id?: string;
  question: string;
  options: string[];
  correct_answer: string[] | number[];
  explanation?: string;
}

interface PlanQuizPayload {
  quizzes: QuizQuestion[];
  role_title?: string;
  modules?: { title?: string }[];
}

const PASS_THRESHOLD = 80;

function isCorrect(question: QuizQuestion, selectedOption: string): boolean {
  const answers = question.correct_answer || [];
  if (!answers.length) return false;
  const first = answers[0];
  if (typeof first === 'number') {
    return String(first) === String(question.options.indexOf(selectedOption));
  }
  return answers.some(a => String(a).toLowerCase() === selectedOption.toLowerCase());
}

export const QuizModal: React.FC = () => {
  const { quizModalOpen, setQuizModalOpen, selectedPlanId, addToast } = useApp();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [title, setTitle] = useState('Knowledge Verification');

  useEffect(() => {
    if (!quizModalOpen) return;
    setSubmitted(false);
    setSelectedAnswers({});
    setScore(0);

    if (!selectedPlanId) {
      setQuestions([]);
      addToast('Open a plan first to load its quiz', 'error');
      return;
    }

    let alive = true;
    setLoading(true);
    api
      .get<PlanQuizPayload>(`/plans/${selectedPlanId}`)
      .then(plan => {
        if (!alive) return;
        const qs = (plan.quizzes || []).slice(0, 8).map(q => ({
          id: q.id,
          module_id: q.module_id,
          question: q.question,
          options: q.options || [],
          correct_answer: q.correct_answer || [],
          explanation: q.explanation,
        }));
        setQuestions(qs);
        setTitle(plan.role_title ? `${plan.role_title} assessment` : 'Knowledge Verification');
        if (!qs.length) addToast('No quiz questions on this plan yet', 'info');
      })
      .catch(e => {
        if (alive) addToast(e instanceof Error ? e.message : 'Failed to load quiz', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [quizModalOpen, selectedPlanId, addToast]);

  if (!quizModalOpen) return null;

  const handleSelect = (qIndex: number, option: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmit = () => {
    if (!questions.length) return;
    const calculated = questions.reduce(
      (sum, q, idx) => (isCorrect(q, selectedAnswers[idx]) ? sum + 1 : sum),
      0,
    );
    const percentage = Math.round((calculated / questions.length) * 100);
    setScore(percentage);
    setSubmitted(true);

    if (percentage >= PASS_THRESHOLD) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      addToast(`Assessment Passed! Score: ${percentage}%`, 'success');
    } else {
      addToast(
        `Score ${percentage}% below passing threshold (${PASS_THRESHOLD}%). Review modules and retry.`,
        'error',
      );
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSelectedAnswers({});
    setQuizModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800/50 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-purple-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Interactive Knowledge Verification</h3>
              <p className="text-xs text-slate-400">
                {title}
                {selectedPlanId ? ` · ${selectedPlanId}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-purple-400 mb-3" />
              Loading quiz questions…
            </div>
          ) : !questions.length ? (
            <div className="py-10 text-center text-slate-400">
              <Award className="w-10 h-10 mx-auto text-purple-400 mb-3" />
              <p className="text-white font-semibold text-sm">No quiz available for this plan</p>
              <p className="text-xs mt-1">Generate a plan with quiz questions first.</p>
            </div>
          ) : submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-600/20 text-purple-400 mx-auto flex items-center justify-center ring-4 ring-purple-500/30">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-2xl font-extrabold text-white">Score: {score}%</h4>
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  {score >= PASS_THRESHOLD
                    ? `Passed! Competency verified (${PASS_THRESHOLD}% threshold).`
                    : `Please re-attempt (need ${PASS_THRESHOLD}%).`}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition"
              >
                Close & Return to Dashboard
              </button>
            </div>
          ) : (
            questions.map((q, qIndex) => (
              <div key={q.id || qIndex} className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = selectedAnswers[qIndex] === opt;
                    return (
                      <button
                        key={optIndex}
                        type="button"
                        onClick={() => handleSelect(qIndex, opt)}
                        className={
                          'w-full text-left p-3 rounded-xl border text-xs font-medium transition ' +
                          (isSelected
                            ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                            : 'bg-slate-950/60 border-purple-900/30 text-slate-300 hover:bg-slate-800')
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {!submitted && questions.length > 0 && !loading && (
          <div className="p-6 border-t border-purple-900/30 flex items-center justify-end gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length < questions.length}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              Submit Answers
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
