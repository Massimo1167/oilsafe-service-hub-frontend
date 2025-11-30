/**
 * React Profiler Wrapper per tracking render times
 *
 * Wrapper opzionale da usare su componenti critici per monitorare
 * i tempi di rendering e identificare re-render costosi.
 *
 * Uso:
 * <PerformanceProfiler id="NomeComponente">
 *   <ComponenteDaTracciare />
 * </PerformanceProfiler>
 */

import { Profiler } from 'react';
import { trackComponentRender } from '../../utils/performanceTracker';

function PerformanceProfiler({ id, children }) {
  /**
   * Callback React Profiler
   *
   * @param {string} id - ID univoco del profiler
   * @param {string} phase - "mount" o "update"
   * @param {number} actualDuration - Tempo effettivo di render (ms)
   * @param {number} baseDuration - Tempo stimato senza memoization
   * @param {number} startTime - Timestamp inizio render
   * @param {number} commitTime - Timestamp commit render
   */
  const onRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    // Traccia solo se monitoring abilitato
    // (il check è già dentro trackComponentRender, ma lo facciamo qui per performance)
    if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      trackComponentRender(id, phase, actualDuration);
    }
  };

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

export default PerformanceProfiler;
