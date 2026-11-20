import { useLanguage } from '../i18n/LanguageContext.tsx';
import type { Language } from '../../shared/types.ts';

const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
];

export function LanguageSwitcher({
  enabledLanguages = ['fr', 'en', 'ar'],
  variant = 'light',
}: {
  enabledLanguages?: Language[];
  variant?: 'light' | 'subtle';
}) {
  const { language, setLanguage } = useLanguage();
  const visible = LANGUAGES.filter((l) => enabledLanguages.includes(l.code));

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${
        variant === 'light'
          ? 'bg-[#F6F2E9] border-[#EDEADE]'
          : 'bg-neutral-100 border-neutral-200'
      }`}
    >
      {visible.map((lang) => {
        const active = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={active}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B9D3F] ${
              active
                ? 'bg-white text-[#444343] shadow-xs'
                : 'text-[#6B6668] hover:text-[#444343]'
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}
