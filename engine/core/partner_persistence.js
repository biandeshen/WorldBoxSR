import { isEligibleFemale, isEligibleMale } from './reproduction_metrics.js';

const DEFAULT_MEMORY_WINDOWS = Object.freeze([30, 90, 180, 360]);

/**
 * Derived-only identity tracker for reproduction-age female/male encounters.
 *
 * It remembers only male IDs that were actually observed within radius 1 of a
 * reproduction-age female. Per-female identity memory is capped and stale
 * records are pruned, so this cannot become an unbounded all-pairs database.
 */
export function createPartnerPersistenceTracker({
  memoryWindows = DEFAULT_MEMORY_WINDOWS,
  retentionDays = 360,
  maxPartnersPerFemale = 8
} = {}) {
  const windows = normalizeWindows(memoryWindows);
  const retention = Math.max(Math.floor(retentionDays), windows.at(-1));
  const maxPartners = Math.max(1, Math.floor(maxPartnersPerFemale));
  const femaleStates = new Map();
  const recurrenceHistogram = new Uint32Array(retention + 1);

  let observations = 0;
  let eligibleFemaleDays = 0;
  let eligibleDroughtFemaleDays = 0;
  let encounterFemaleDays = 0;
  let encounterPairDays = 0;
  let pairRecordsCreated = 0;
  let partnerRecordEvictions = 0;
  let stalePartnerRecordsPruned = 0;
  let femaleStatesPruned = 0;
  let maxTrackedPartnerRecords = 0;
  let maxPartnersForOneFemale = 0;
  let recurrenceCount = 0;
  let recurrenceSum = 0;
  let recurrenceMax = 0;

  const memoryAny = new Map(windows.map((window) => [window, 0]));
  const memoryAlive = new Map(windows.map((window) => [window, 0]));
  const memoryEligible = new Map(windows.map((window) => [window, 0]));

  function observe(world) {
    observations += 1;

    const livingById = new Map();
    const livingFemaleIds = new Set();
    const eligibleMaleIds = new Set();
    const eligibleMaleIdsByCell = new Map();
    const encounterTrackableFemales = [];

    for (const human of world.entities) {
      if (human.kind !== 'human' || !human.alive) continue;
      livingById.set(human.id, human);
      if (human.sex === 'F') livingFemaleIds.add(human.id);

      if (isEligibleMale(world, human)) {
        eligibleMaleIds.add(human.id);
        const index = human.y * world.width + human.x;
        let ids = eligibleMaleIdsByCell.get(index);
        if (!ids) eligibleMaleIdsByCell.set(index, ids = []);
        ids.push(human.id);
      }

      if (isEncounterTrackableFemale(world, human)) encounterTrackableFemales.push(human);
    }

    for (const [femaleId] of femaleStates) {
      if (!livingFemaleIds.has(femaleId)) {
        femaleStates.delete(femaleId);
        femaleStatesPruned += 1;
      }
    }

    for (const female of encounterTrackableFemales) {
      let state = femaleStates.get(female.id);
      if (!state) {
        state = { partners: new Map() };
        femaleStates.set(female.id, state);
      }

      pruneStalePartners(state, world.day);
      const localMaleIds = collectLocalEligibleMaleIds(world, eligibleMaleIdsByCell, female.x, female.y);

      if (localMaleIds.length > 0) {
        encounterFemaleDays += 1;
        encounterPairDays += localMaleIds.length;
        for (const maleId of localMaleIds) rememberEncounter(state, maleId, world.day);
        enforcePartnerCap(state);
      }

      if (!isEligibleFemale(world, female)) continue;
      eligibleFemaleDays += 1;
      if (localMaleIds.length > 0) continue;

      eligibleDroughtFemaleDays += 1;
      for (const window of windows) {
        let any = false;
        let alive = false;
        let eligible = false;
        for (const [maleId, record] of state.partners) {
          if (world.day - record.lastEncounterDay > window) continue;
          any = true;
          if (livingById.has(maleId)) alive = true;
          if (eligibleMaleIds.has(maleId)) eligible = true;
          if (any && alive && eligible) break;
        }
        if (any) memoryAny.set(window, memoryAny.get(window) + 1);
        if (alive) memoryAlive.set(window, memoryAlive.get(window) + 1);
        if (eligible) memoryEligible.set(window, memoryEligible.get(window) + 1);
      }
    }

    updateStorageHighWaterMark();
  }

  function pruneStalePartners(state, day) {
    for (const [maleId, record] of state.partners) {
      if (day - record.lastEncounterDay > retention) {
        state.partners.delete(maleId);
        stalePartnerRecordsPruned += 1;
      }
    }
  }

  function rememberEncounter(state, maleId, day) {
    const previous = state.partners.get(maleId);
    if (!previous) {
      state.partners.set(maleId, { lastEncounterDay: day });
      pairRecordsCreated += 1;
      return;
    }

    const interval = day - previous.lastEncounterDay;
    if (interval > 1 && interval <= retention) {
      recurrenceHistogram[interval] += 1;
      recurrenceCount += 1;
      recurrenceSum += interval;
      recurrenceMax = Math.max(recurrenceMax, interval);
    }
    previous.lastEncounterDay = day;
  }

  function enforcePartnerCap(state) {
    while (state.partners.size > maxPartners) {
      let oldestId = null;
      let oldestDay = Infinity;
      for (const [maleId, record] of state.partners) {
        if (record.lastEncounterDay < oldestDay ||
            (record.lastEncounterDay === oldestDay && (oldestId === null || maleId < oldestId))) {
          oldestId = maleId;
          oldestDay = record.lastEncounterDay;
        }
      }
      state.partners.delete(oldestId);
      partnerRecordEvictions += 1;
    }
  }

  function updateStorageHighWaterMark() {
    let total = 0;
    for (const state of femaleStates.values()) {
      total += state.partners.size;
      maxPartnersForOneFemale = Math.max(maxPartnersForOneFemale, state.partners.size);
    }
    maxTrackedPartnerRecords = Math.max(maxTrackedPartnerRecords, total);
  }

  function summarize() {
    let currentTrackedPartnerRecords = 0;
    for (const state of femaleStates.values()) currentTrackedPartnerRecords += state.partners.size;

    return {
      observations,
      eligibleFemaleDays,
      eligibleDroughtFemaleDays,
      eligibleDroughtShare: ratio(eligibleDroughtFemaleDays, eligibleFemaleDays),
      encounterFemaleDays,
      encounterPairDays,
      memoryCoverageOfEligibleDroughtDays: Object.fromEntries(
        windows.map((window) => [window, {
          anyRemembered: ratio(memoryAny.get(window), eligibleDroughtFemaleDays),
          rememberedAlive: ratio(memoryAlive.get(window), eligibleDroughtFemaleDays),
          rememberedEligible: ratio(memoryEligible.get(window), eligibleDroughtFemaleDays)
        }])
      ),
      samePairReturnIntervals: summarizeHistogram(
        recurrenceHistogram,
        recurrenceCount,
        recurrenceSum,
        recurrenceMax
      ),
      storage: {
        retentionDays: retention,
        maxPartnersPerFemale: maxPartners,
        currentFemaleStates: femaleStates.size,
        currentTrackedPartnerRecords,
        maxTrackedPartnerRecords,
        maxPartnersForOneFemale,
        pairRecordsCreated,
        partnerRecordEvictions,
        stalePartnerRecordsPruned,
        femaleStatesPruned
      }
    };
  }

  return { observe, summarize };
}

function isEncounterTrackableFemale(world, human) {
  if (human.kind !== 'human' || !human.alive || human.sex !== 'F' || human.hunger >= 0.55) return false;
  const ageYears = human.ageDays / world.config.daysPerYear;
  return ageYears >= world.config.adultAgeYears && ageYears <= world.config.femaleFertilityEndYears;
}

function collectLocalEligibleMaleIds(world, idsByCell, x, y) {
  const ids = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const cellIds = idsByCell.get(ny * world.width + nx);
      if (cellIds) ids.push(...cellIds);
    }
  }
  return ids;
}

function normalizeWindows(memoryWindows) {
  const windows = [...new Set(memoryWindows.map((value) => Math.max(1, Math.floor(value))))].sort((a, b) => a - b);
  if (windows.length === 0) return [...DEFAULT_MEMORY_WINDOWS];
  return windows;
}

function summarizeHistogram(histogram, count, sum, max) {
  if (count === 0) return { count: 0, mean: 0, median: 0, p90: 0, max: 0 };
  return {
    count,
    mean: sum / count,
    median: histogramPercentile(histogram, count, 0.5),
    p90: histogramPercentile(histogram, count, 0.9),
    max
  };
}

function histogramPercentile(histogram, count, fraction) {
  const target = Math.ceil(count * fraction);
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= target) return value;
  }
  return histogram.length - 1;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
