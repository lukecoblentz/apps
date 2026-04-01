export type AssignmentPriority = "low" | "normal" | "high";

/**
 * Infer default priority from assignment title (case-insensitive).
 * High: exams, papers, quizzes; medium: labs, homework-style work; low: readings, discussions, misc.
 */
export function inferPriorityFromTitle(title: string): AssignmentPriority {
  const t = title.trim().toLowerCase();
  if (!t) return "normal";

  const hasHigh = matchesAny(t, [
    /\bexam\b/,
    /\bexams\b/,
    /\bmidterm\b/,
    /\bfinal\b/,
    /\bfinals\b/,
    /\bpaper\b/,
    /\bpapers\b/,
    /\bessay\b/,
    /\bquiz\b/,
    /\bquizzes\b/,
    /\btest\b/,
    /\btests\b/
  ]);
  if (hasHigh) return "high";

  const hasMedium = matchesAny(t, [
    /\blab\b/,
    /\blabs\b/,
    /\bassignment\b/,
    /\bassignments\b/,
    /\bhomework\b/,
    /\bhw\b/,
    /\bproblem set\b/,
    /\bpset\b/,
    /\bproject\b/
  ]);
  if (hasMedium) return "normal";

  const hasLow = matchesAny(t, [
    /\bdiscussion\b/,
    /\bread\b/,
    /\breading\b/,
    /\bmisc\b/,
    /\bmiscellaneous\b/
  ]);
  if (hasLow) return "low";

  return "normal";
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(text));
}
