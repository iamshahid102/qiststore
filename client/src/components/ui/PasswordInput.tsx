'use client';

import { useId, useState } from 'react';
import { LuEye, LuEyeOff } from 'react-icons/lu';

/**
 * Password field with a show/hide toggle (eye icon).
 *
 * - Toggle lives inside the field, right-aligned (44px-ish hit area).
 * - `onMouseDown` is prevented so clicking the eye never steals focus/caret
 *   from the input — you can keep typing after revealing.
 * - Exposed to screen readers as a real button with aria-pressed state.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  minLength,
  required,
  name,
  id,
  className = 'w-full rounded border border-gray-300 px-3 py-2 pr-11',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="relative">
      <input
        id={inputId}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={visible ? 'Password (shown)' : 'Password (hidden)'}
        className={`${className} focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100`}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputId}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600"
      >
        {visible ? <LuEyeOff className="h-4 w-4" aria-hidden /> : <LuEye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
