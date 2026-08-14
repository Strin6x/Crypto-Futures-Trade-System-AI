export function scheduledPaperEntryAllowed({ enabled, paperSessionActive, mode, killSwitch }) {
  return enabled === true && paperSessionActive === true && mode === 'paper' && killSwitch !== true;
}
