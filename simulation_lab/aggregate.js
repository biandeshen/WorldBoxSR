export function aggregateRuns(runs) {
  if (runs.length === 0) {
    return emptyAggregate();
  }
  return {
    runCount: runs.length,
    extinctionRate: runs.filter((run) => run.population === 0).length / runs.length,
    population: metricStats(runs, 'population'),
    births: metricStats(runs, 'births'),
    deaths: metricStats(runs, 'deaths'),
    foodUtilization: metricStats(runs, 'foodUtilization'),
    settlements: metricStats(runs, 'settlements'),
    activeSettlements: metricStats(runs, 'activeSettlements'),
    abandonedSettlements: metricStats(runs, 'abandonedSettlements'),
    settledPopulation: metricStats(runs, 'settledPopulation'),
    settledPopulationShare: stats(runs.map((run) => run.population ? numberOrZero(run.settledPopulation) / run.population : 0)),
    abandonedSettlementShare: stats(runs.map((run) => run.settlements ? numberOrZero(run.abandonedSettlements) / run.settlements : 0)),
    claimedTerritoryCells: metricStats(runs, 'claimedTerritoryCells'),
    territoryCoverage: metricStats(runs, 'territoryCoverage'),
    lineages: metricStats(runs, 'lineages'),
    extinctLineages: metricStats(runs, 'extinctLineages'),
    extinctLineageShare: stats(runs.map((run) => run.lineages ? numberOrZero(run.extinctLineages) / run.lineages : 0)),
    orphanedHumans: metricStats(runs, 'orphanedHumans'),
    orphanShare: stats(runs.map((run) => run.population ? numberOrZero(run.orphanedHumans) / run.population : 0)),
    maxGeneration: metricStats(runs, 'maxGeneration'),
    averageLivingLineageSize: metricStats(runs, 'averageLivingLineageSize'),
    averageHistoricalLineageSize: metricStats(runs, 'averageHistoricalLineageSize'),
    maxLivingLineageSize: metricStats(runs, 'maxLivingLineageSize')
  };
}

export function stats(values) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median
  };
}

function metricStats(runs, key) {
  return stats(runs.map((run) => numberOrZero(run[key])));
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function emptyAggregate() {
  return {
    runCount: 0,
    extinctionRate: 0,
    population: stats([]),
    births: stats([]),
    deaths: stats([]),
    foodUtilization: stats([]),
    settlements: stats([]),
    activeSettlements: stats([]),
    abandonedSettlements: stats([]),
    settledPopulation: stats([]),
    settledPopulationShare: stats([]),
    abandonedSettlementShare: stats([]),
    claimedTerritoryCells: stats([]),
    territoryCoverage: stats([]),
    lineages: stats([]),
    extinctLineages: stats([]),
    extinctLineageShare: stats([]),
    orphanedHumans: stats([]),
    orphanShare: stats([]),
    maxGeneration: stats([]),
    averageLivingLineageSize: stats([]),
    averageHistoricalLineageSize: stats([]),
    maxLivingLineageSize: stats([])
  };
}
