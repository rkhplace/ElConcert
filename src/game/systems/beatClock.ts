/**
 * A tiny musical clock. The concert stage lighting and the synthesised
 * kick both read from this so they stay locked together without any
 * audio-analyser plumbing.
 */
class BeatClock {
  bpm = 120;
  private startedAt = 0;
  running = false;
  private lastBeatIndex = -1;
  private listeners = new Set<(beatIndex: number) => void>();

  start(bpm = 120) {
    this.bpm = bpm;
    this.startedAt = performance.now();
    this.lastBeatIndex = -1;
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  onBeat(fn: (beatIndex: number) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** call every frame while running */
  update() {
    if (!this.running) return;
    const beats = ((performance.now() - this.startedAt) / 60000) * this.bpm;
    const idx = Math.floor(beats);
    if (idx !== this.lastBeatIndex) {
      this.lastBeatIndex = idx;
      this.listeners.forEach((l) => l(idx));
    }
  }

  /** 0..1 position within the current beat */
  phase() {
    if (!this.running) return 0;
    const beats = ((performance.now() - this.startedAt) / 60000) * this.bpm;
    return beats - Math.floor(beats);
  }

  /** 0..1 position within a bar of `n` beats */
  barPhase(n = 4) {
    if (!this.running) return 0;
    const beats = ((performance.now() - this.startedAt) / 60000) * this.bpm;
    return (beats % n) / n;
  }
}

export const beatClock = new BeatClock();
