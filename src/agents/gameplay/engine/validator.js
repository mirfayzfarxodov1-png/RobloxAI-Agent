import { analyzeLuauSource } from './analyzer.js';

/** Combines legacy Gameplay checks with static engine findings. */
export function validateGameplayArtifact(input = {}) {
  const analysis = analyzeLuauSource(input);
  const issues = [...analysis.issues];
  const failed = Array.isArray(input.legacyChecks)
    ? input.legacyChecks.filter(check => check && check.ok === false)
    : [];

  for (const check of failed) {
    const slug = String(check.name || 'requirement').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    issues.push({
      id: 'legacy-' + slug,
      severity: 'error',
      title: 'Gameplay requirement missing',
      detail: String(check.name || 'A required legacy check failed.')
    });
  }

  const errors = issues.filter(item => item.severity === 'error').length;
  const warnings = issues.filter(item => item.severity === 'warning').length;
  return {
    ok: errors === 0,
    status: errors ? 'needs-fix' : warnings ? 'review' : 'ready-for-studio',
    score: Math.max(0, 100 - errors * 25 - warnings * 8),
    counts: { errors, warnings, issues: issues.length },
    issues,
    sourceAnalysis: analysis
  };
}
