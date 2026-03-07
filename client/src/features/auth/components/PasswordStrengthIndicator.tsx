import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const passwordChecks = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (password: string) => /[^a-zA-Z0-9]/.test(password),
  },
];

function getStrengthState(score: number) {
  if (score <= 1) {
    return {
      label: 'Weak',
      color: 'bg-rose-500',
      textColor: 'text-rose-300',
    };
  }

  if (score <= 3) {
    return {
      label: 'Medium',
      color: 'bg-amber-400',
      textColor: 'text-amber-200',
    };
  }

  return {
    label: 'Strong',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-300',
  };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const score = passwordChecks.filter((check) => check.test(password)).length;
  const strength = getStrengthState(score);
  const width = `${(score / passwordChecks.length) * 100}%`;

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
          <span>Password strength</span>
          <span className={strength.textColor}>{password ? strength.label : 'Too short'}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10">
          <div
            className={cn('h-2 rounded-full transition-all duration-200', strength.color)}
            style={{ width }}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {passwordChecks.map((check) => {
          const isSatisfied = check.test(password);

          return (
            <div key={check.id} className="flex items-center gap-2 text-sm text-slate-300">
              {isSatisfied ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <X className="size-4 text-slate-500" />
              )}
              <span className={isSatisfied ? 'text-slate-100' : 'text-slate-400'}>
                {check.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
