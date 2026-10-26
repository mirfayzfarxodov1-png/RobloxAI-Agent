const buckets = new Map();
const rules = {
  loginIp: { limit: 10, windowMs: 10 * 60 * 1000 },
  loginName: { limit: 5, windowMs: 10 * 60 * 1000 },
  registerIp: { limit: 5, windowMs: 60 * 60 * 1000 },
  pairIp: { limit: 10, windowMs: 10 * 60 * 1000 },
  chatUser: { limit: 20, windowMs: 60 * 1000 },
};
export function consumeLimit(kind, key, now = Date.now()) {
  const rule = rules[kind];
  if (!rule) throw new Error('Unknown rate-limit rule: ' + kind);
  const bucketKey = kind + ':' + key;
  let bucket = buckets.get(bucketKey);
  if (!bucket || now - bucket.startedAt >= rule.windowMs) bucket = { startedAt: now, count: 0 };
  bucket.count += 1; buckets.set(bucketKey, bucket);
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (now - v.startedAt > 2 * 60 * 60 * 1000) buckets.delete(k);
  }
  const allowed = bucket.count <= rule.limit;
  return { allowed, retryAfter: Math.max(1, Math.ceil((bucket.startedAt + rule.windowMs - now) / 1000)), limit: rule.limit };
}
export function resetLimitsForTests() { buckets.clear(); }
