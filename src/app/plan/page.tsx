'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, MessageSquare, ArrowLeft, Cpu, Settings } from 'lucide-react';
import { ClarificationQuestion, ClarificationAnswer } from '@/lib/prompts';

type Step = 'idea' | 'clarify' | 'tech';

export default function PlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idea');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [idea, setIdea] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [techMode, setTechMode] = useState<'ai' | 'manual'>('ai');
  const [techPreference, setTechPreference] = useState('');

  // Handle Step 1 Submit (Get clarifications from AI)
  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      setError('Harap masukkan ide aplikasi Anda terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/projects/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses ide awal');
      }

      setSuggestedName(data.suggestedName || '');
      setQuestions(data.questions || []);

      // Initialize empty answers map
      const initialAnswers: Record<string, string> = {};
      (data.questions || []).forEach((q: ClarificationQuestion) => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);

      setStep('clarify');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal terhubung dengan AI. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Answer change
  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  // Move to Step 3
  const handleClarifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('tech');
  };

  // Handle Step 3 Submit (Final PRD generation)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Format clarifications array
    const formattedClarifications: ClarificationAnswer[] = questions.map(q => ({
      question: q.question,
      answer: answers[q.id] || '',
    }));

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          suggestedName,
          clarifications: formattedClarifications,
          techMode,
          techPreference: techMode === 'manual' ? techPreference : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat perencanaan');
      }

      router.push(`/p/${data.id}?tab=prd`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Terjadi kesalahan saat generate PRD');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-sky-600 h-5 w-5" />
            Rencanakan Aplikasi Baru
          </h1>
          <p className="text-slate-500 text-xs">
            {step === 'idea' && 'Jelaskan ide kasar Anda dalam 1 form chatbot sederhana.'}
            {step === 'clarify' && 'Jawab beberapa pertanyaan berikut untuk membuat PRD lebih akurat.'}
            {step === 'tech' && 'Tentukan preferensi teknologi yang akan digunakan.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span className={step === 'idea' ? 'text-sky-600' : ''}>Ide</span>
          <span>&rarr;</span>
          <span className={step === 'clarify' ? 'text-sky-600' : ''}>Klarifikasi</span>
          <span>&rarr;</span>
          <span className={step === 'tech' ? 'text-sky-600' : ''}>Tech</span>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Idea Form */}
      {step === 'idea' && (
        <form onSubmit={handleIdeaSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-base font-bold text-slate-800" htmlFor="idea">
              Mau bikin apa kali ini?
            </label>
            <div className="relative">
              <textarea
                id="idea"
                name="idea"
                rows={5}
                required
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="Contoh: Saya ingin membuat aplikasi kasir warung kelontong sederhana yang bisa mencatat stok barang, penjualan harian, dan bisa dipakai offline di HP android..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm resize-none leading-relaxed"
              />
              <div className="absolute bottom-3 right-3 text-slate-400">
                <MessageSquare className="h-5 w-5 opacity-40" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-xl transition-colors text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menganalisis Ide Anda...
                </>
              ) : (
                <>
                  Lanjut ke Klarifikasi Ide
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Clarification Questions Form */}
      {step === 'clarify' && (
        <form onSubmit={handleClarifySubmit} className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-500">Nama Sementara</h3>
            <input
              type="text"
              value={suggestedName}
              onChange={e => setSuggestedName(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Suggested Application Name"
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2">Detail Rancangan Tambahan</h2>

            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800" htmlFor={q.id}>
                  {idx + 1}. {q.question}
                </label>
                <textarea
                  id={q.id}
                  rows={2}
                  required
                  value={answers[q.id] || ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  placeholder={q.helper || 'Jelaskan detailnya di sini...'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep('idea')}
              className="flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              Lanjut ke Pilih Teknologi
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Tech Stack Selection Form */}
      {step === 'tech' && (
        <form onSubmit={handleFinalSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="block text-base font-bold text-slate-800">
              Bagaimana Anda ingin menentukan teknologi proyek?
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: AI Chooses */}
              <div
                onClick={() => setTechMode('ai')}
                className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between h-32 ${
                  techMode === 'ai'
                    ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${techMode === 'ai' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Dipilih oleh AI (Rekomendasi)</h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      AI akan memilih stack paling boros/sederhana & teruji (Next.js + SQLite).
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <input
                    type="radio"
                    name="techMode"
                    checked={techMode === 'ai'}
                    onChange={() => setTechMode('ai')}
                    className="accent-sky-600 h-4 w-4"
                  />
                </div>
              </div>

              {/* Option B: User Enters */}
              <div
                onClick={() => setTechMode('manual')}
                className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between h-32 ${
                  techMode === 'manual'
                    ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${techMode === 'manual' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Saya Pilih Sendiri</h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      Masukkan custom preferensi teknologi (seperti Flutter, Laravel, PostgreSQL, dll).
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <input
                    type="radio"
                    name="techMode"
                    checked={techMode === 'manual'}
                    onChange={() => setTechMode('manual')}
                    className="accent-sky-600 h-4 w-4"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* If manual mode, show tech input */}
          {techMode === 'manual' && (
            <div className="space-y-2 pt-2 animate-fadeIn">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="techPreference">
                Preferensi Teknologi Anda
              </label>
              <input
                id="techPreference"
                type="text"
                required={techMode === 'manual'}
                value={techPreference}
                onChange={e => setTechPreference(e.target.value)}
                placeholder="Contoh: Laravel + Vue + MySQL, atau Flutter + Firebase"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep('clarify')}
              className="flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyusun PRD...
                </>
              ) : (
                <>
                  Buat PRD Sekarang
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
