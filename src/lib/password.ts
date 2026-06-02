export type PasswordCheck = {
  ok: boolean;
  score: number; // 0..5
  errors: string[];
};

export function validatePassword(pwd: string): PasswordCheck {
  const errors: string[] = [];
  const rules: Array<[boolean, string]> = [
    [pwd.length >= 10, "Au moins 10 caractères"],
    [/[a-z]/.test(pwd), "Une minuscule (a-z)"],
    [/[A-Z]/.test(pwd), "Une majuscule (A-Z)"],
    [/[0-9]/.test(pwd), "Un chiffre (0-9)"],
    [/[^a-zA-Z0-9]/.test(pwd), "Un caractère spécial (!@#$…)"],
  ];
  let score = 0;
  for (const [pass, label] of rules) {
    if (pass) score++;
    else errors.push(label);
  }
  return { ok: errors.length === 0, score, errors };
}
