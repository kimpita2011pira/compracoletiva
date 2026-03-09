import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthIndicatorProps {
  password: string;
}

function evaluateStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–5
}

const levels = [
  { label: "Muito fraca", color: "bg-destructive" },
  { label: "Fraca", color: "bg-destructive" },
  { label: "Razoável", color: "bg-orange-500" },
  { label: "Boa", color: "bg-yellow-500" },
  { label: "Forte", color: "bg-emerald-500" },
  { label: "Excelente", color: "bg-emerald-600" },
] as const;

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const score = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  const { label, color } = levels[score];
  const percent = (score / 5) * 100;

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Força: <span className="font-medium">{label}</span>
        {score < 3 && (
          <span className="ml-1">— use maiúsculas, números e símbolos</span>
        )}
      </p>
    </div>
  );
}
