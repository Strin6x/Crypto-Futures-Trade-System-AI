export function openPaperPositions(saved) {
  return Array.isArray(saved) ? saved.filter(position => position?.status === 'OPEN') : [];
}

export function activeAutomaticEntryKeys(positions) {
  return [...new Set(positions.map(position => position.autoEntryKey).filter(Boolean))];
}
