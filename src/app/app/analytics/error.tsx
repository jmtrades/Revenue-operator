'use client';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors');
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('data.title')}</h2>
      <p className="text-sm text-zinc-400 max-w-md text-center">
        {error.message || t('data.body')}
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition-colors"
      >
        {t('retry')}
      </button>
    </div>
  );
}

