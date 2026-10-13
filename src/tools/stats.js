// Statistikani darhol ko'rish:  npm run stats
import { refreshStats, insights } from '../agents/analytics.js';

const s = await refreshStats({ force: true });
const rows = [...s.videos].sort((a, b) => b.views - a.views);
if (!rows.length) console.log('Hali 2 kundan eski video yo\'q (YouTube statistikasi 2-3 kun kechikadi).');
for (const v of rows) {
  console.log(`${String(v.views).padStart(6)} ko'rish | ${String(v.avgViewPct).padStart(3)}% tomosha | +${v.subs} obuna | ${v.kind === 'long' ? '[UZUN] ' : ''}${v.topic}`);
}
const ins = insights('short');
if (ins) console.log(`\n✅ Yoqqan: ${ins.best.join('; ')}\n⚠️  Kamroq: ${ins.worst.join('; ')}`);
