export function initializeDetailedSnapshot(snapshot, currentStatus) {
  if (snapshot) return snapshot;
  return structuredClone({
    candidates: currentStatus.candidates,
    criterionLabels: currentStatus.criteria.labels,
    lastScan: currentStatus.lastScan,
    scanError: currentStatus.scanError
  });
}
