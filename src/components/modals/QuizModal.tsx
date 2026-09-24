import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Award, CheckCircle2, AlertCircle, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizModal: React.FC = () => {
  const { quizModalOpen, setQuizModalOpen, addToast } = useApp();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!quizModalOpen) return null;

  const questions = [
    {
      q: 'Which AWS IAM policy component ensures that temporary credentials adhere strictly to least-privilege principles?',
      options: ['Permission Boundaries', 'Wildcard Resource (*)', 'Root Access Keys', 'Default AdministratorAccess'],
      correct: 0
    },
    {
      q: 'In Kubernetes RBAC, which resource binds a Role to a user or service account across all namespaces?',
      options: ['RoleBinding', 'ClusterRoleBinding', 'ServiceAccountMapper', 'NamespaceRoleRule'],
      correct: 1
    },
    {
      q: 'Under company SOC-2 policy DOC-001, how frequently must production KMS symmetric keys be rotated?',
      options: ['Every 7 days', 'Every 90 days', 'Automatically every 365 days', 'Never'],
      correct: 2
    }
  ];

  const handleSelect = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmit = () => {
    let calculatedScore = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) calculatedScore++;
    });

    const percentage = Math.round((calculatedScore / questions.length) * 100);
    setScore(percentage);
    setSubmitted(true);

    if (percentage >= 66) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      addToast('Assessment Passed! Score: ' + percentage + '%', 'success');
    } else {
      addToast('Score below passing threshold (80%). Try reviewing the reference docs.', 'error');
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
              <p className="text-xs text-slate-400">Cloud Infrastructure & Kubernetes Security Assessment</p>
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
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-600/20 text-purple-400 mx-auto flex items-center justify-center ring-4 ring-purple-500/30">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-2xl font-extrabold text-white">Score: {score}%</h4>
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  {score >= 66 ? 'Passed! Competency verified against DOC-001.' : 'Please re-attempt.'}
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
              <div key={qIndex} className="space-y-3">
                <p className="text-sm font-semibold text-white">
                  {qIndex + 1}. {q.q}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = selectedAnswers[qIndex] === optIndex;
                    return (
                      <button
                        key={optIndex}
                        type="button"
                        onClick={() => handleSelect(qIndex, optIndex)}
                        className={"w-full text-left p-3 rounded-xl border text-xs font-medium transition " + (
                          isSelected
                            ? "bg-purple-600/30 border-purple-500 text-white font-bold"
                            : "bg-slate-950/60 border-purple-900/30 text-slate-300 hover:bg-slate-800"
                        )}
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

        {!submitted && (
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
