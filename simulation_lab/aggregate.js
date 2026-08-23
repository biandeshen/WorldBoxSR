export function aggregateRuns(runs) {
  if (runs.length === 0) {
    return { runCount: 0, extinctionRate: 0, population: stats([]), births: stats([]), deaths: stats([]), foodUtilization: stats([]) };
  }
  return {
    runCount: runs.length,
    extinctionRate: runs.filter((run) => run.population === 0).length / runs.length,
    population: stats(runs.map((run) => run.population)),
    births: stats(runs.map((run) => run.births)),
    deaths: stats(runs.map((run) => run.deaths)),
    foodUtilization: stats(runs.map((run) => run.foodUtilization))
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
