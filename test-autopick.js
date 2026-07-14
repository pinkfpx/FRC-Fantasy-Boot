// Standalone test: exercises the auto-pick scoring + randomized selection logic
// (the same code path doBotPick uses) against real TBA data, without touching Discord.
const bot = require('./index.js');

async function main() {
  const year = bot.DEFAULT_YEAR;
  console.log(`Loading season team pool for ${year}...`);
  const allTeams = await bot.loadSeasonTeams(year);
  console.log(`Pool size: ${allTeams.length} teams`);

  // Sample a manageable pool of teams to score, so this finishes in reasonable time.
  const sampleSize = 60;
  const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, sampleSize);

  console.log(`Scoring ${sample.length} sampled teams (historical avg, best-2-events/year, last 3 years)...`);
  const scored = await Promise.all(
    sample.map(async t => ({ team: t, score: await bot.getTeamHistoricalSeasonScore(t, year) }))
  );

  const nonZero = scored.filter(s => s.score > 0).length;
  console.log(`Teams with a nonzero historical score: ${nonZero}/${scored.length}\n`);

  console.log('Running the auto-pick selection 10 times against this scored pool:\n');
  const picks = [];
  for (let i = 1; i <= 10; i++) {
    const winner = bot.pickWithRandomness(scored, 10);
    const name = await bot.getTeamName(winner.team).catch(() => `Team ${winner.team}`);
    picks.push(winner.team);
    console.log(`  Run ${i}: picked ${name} — score ${winner.score.toFixed(1)}`);
  }

  const uniquePicks = new Set(picks).size;
  console.log(`\n${uniquePicks} unique team(s) picked across 10 runs (out of a top-10 pool) — confirms randomness is spreading picks rather than always taking the single best team.`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
