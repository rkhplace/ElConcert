/**
 * Fully synthesised audio — no files, no network, nothing to break.
 * A slow evolving pad sets the mood, plus procedural engine / crowd /
 * UI layers. Everything is created lazily after the first user gesture
 * (the START button) to satisfy autoplay policies.
 */

type Mood = "night" | "road" | "concert" | "hopeful" | "quiet";

const CHORDS: Record<Mood, number[]> = {
  // frequencies (Hz) of a sustained voicing
  night: [110.0, 164.81, 220.0, 277.18], // A minor-ish, low & still
  road: [98.0, 146.83, 196.0, 293.66], // G open, moving
  concert: [130.81, 196.0, 246.94, 329.63], // C major, brighter
  hopeful: [146.83, 220.0, 293.66, 369.99], // D major, lifted
  quiet: [110.0, 164.81, 220.0], // sparse
};

const MOOD_FILTER: Record<Mood, number> = {
  night: 520,
  road: 780,
  concert: 1500,
  hopeful: 2200,
  quiet: 380,
};

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
  private padLfo: OscillatorNode | null = null;

  private engine: {
    osc: OscillatorNode;
    sub: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null = null;

  private crowd: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null =
    null;

  private beatGain: GainNode | null = null;

  private mood: Mood = "night";
  private muted = false;
  private started = false;

  get isStarted() {
    return this.started;
  }

  /** Call once, from a user gesture. */
  start() {
    if (this.started) {
      this.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(ctx.destination);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.0;
      this.musicBus.connect(this.master);

      this.buildPad();
      this.started = true;
      this.setMood("night", 0.01);
      this.fade(this.musicBus.gain, 0.5, 4);
    } catch {
      // audio simply unavailable — the experience still works silently
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.fade(this.master.gain, m ? 0 : 0.9, 0.4);
    }
  }

  // ---------------------------------------------------------------- pad ----
  private buildPad() {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = MOOD_FILTER.night;
    filter.Q.value = 0.7;
    filter.connect(this.musicBus!);
    this.padFilter = filter;

    // slow filter wobble for life
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.padLfo = lfo;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
      osc.frequency.value = CHORDS.night[i] ?? 110;
      osc.detune.value = (i - 1.5) * 6;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.22 : 0.12;
      osc.connect(gain).connect(filter);
      osc.start();
      this.padVoices.push({ osc, gain });
    }
  }

  setMood(mood: Mood, time = 6) {
    if (!this.ctx || !this.started) {
      this.mood = mood;
      return;
    }
    this.mood = mood;
    const chord = CHORDS[mood];
    const now = this.ctx.currentTime;
    this.padVoices.forEach((v, i) => {
      const f = chord[i % chord.length] ?? chord[0];
      v.osc.frequency.cancelScheduledValues(now);
      v.osc.frequency.setTargetAtTime(f, now, time / 3);
      const target = i < chord.length ? (i === 0 ? 0.22 : 0.12) : 0.0;
      v.gain.gain.setTargetAtTime(target, now, time / 3);
    });
    if (this.padFilter) {
      this.padFilter.frequency.cancelScheduledValues(now);
      this.padFilter.frequency.setTargetAtTime(MOOD_FILTER[mood], now, time / 3);
    }
  }

  /** music bus volume 0..1 */
  setMusicLevel(level: number, time = 2) {
    if (this.musicBus && this.ctx) this.fade(this.musicBus.gain, level, time);
  }

  // ------------------------------------------------------------- engine ----
  startEngine() {
    if (!this.ctx || this.engine) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 6;
    filter.connect(gain);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 60;
    osc.connect(filter);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 40;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    sub.connect(subGain).connect(gain);

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(2);
    noise.loop = true;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.05;
    noise.connect(nGain).connect(filter);

    osc.start();
    sub.start();
    noise.start();
    this.engine = { osc, sub, noise, gain, filter };
    this.fade(gain.gain, 0.16, 1.2);
  }

  /** rpm 0..1 while riding */
  setEngineRpm(rpm: number) {
    if (!this.engine || !this.ctx) return;
    const now = this.ctx.currentTime;
    const base = 55 + rpm * 120;
    this.engine.osc.frequency.setTargetAtTime(base, now, 0.15);
    this.engine.sub.frequency.setTargetAtTime(base * 0.5, now, 0.2);
    this.engine.filter.frequency.setTargetAtTime(360 + rpm * 900, now, 0.2);
  }

  stopEngine() {
    if (!this.engine || !this.ctx) return;
    const e = this.engine;
    this.engine = null;
    this.fade(e.gain.gain, 0, 1.4);
    window.setTimeout(() => {
      try {
        e.osc.stop();
        e.sub.stop();
        e.noise.stop();
      } catch {
        /* already stopped */
      }
    }, 1600);
  }

  // -------------------------------------------------------------- crowd ----
  startCrowd() {
    if (!this.ctx || this.crowd) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
    this.crowd = { src, gain, filter };
    this.fade(gain.gain, 0.14, 2);
  }

  setCrowdLevel(level: number, time = 1.5) {
    if (this.crowd && this.ctx) this.fade(this.crowd.gain.gain, level, time);
  }

  stopCrowd() {
    if (!this.crowd || !this.ctx) return;
    const c = this.crowd;
    this.crowd = null;
    this.fade(c.gain.gain, 0, 2);
    window.setTimeout(() => {
      try {
        c.src.stop();
      } catch {
        /* noop */
      }
    }, 2200);
  }

  /** a short crowd cheer swell */
  cheer(strength = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18 * strength, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(now);
    src.stop(now + 1.5);
  }

  // --------------------------------------------------------------- beat ----
  /** soft kick used by the concert beat clock */
  kick(strength = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5 * strength, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(gain).connect(this.master!);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  /** bright synth stab, used on the ENDING lift */
  stab(freq = 523.25) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(filter).connect(gain).connect(this.master!);
    osc.start(now);
    osc.stop(now + 1.3);
  }

  // ----------------------------------------------------------------- UI ----
  blip(kind: "move" | "confirm" | "soft" = "soft") {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const base = kind === "confirm" ? 660 : kind === "move" ? 440 : 320;
    osc.type = kind === "confirm" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(base, now);
    if (kind === "confirm") osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(this.master!);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /** duck music + crowd briefly (used at the incident) */
  duck(depth = 0.25, time = 0.8) {
    if (!this.ctx) return;
    if (this.musicBus) this.fade(this.musicBus.gain, depth * 0.5, time);
    if (this.crowd) this.fade(this.crowd.gain.gain, depth * 0.14, time);
  }

  // -------------------------------------------------------------- utils ----
  private fade(param: AudioParam, to: number, time: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(to, now, Math.max(0.01, time / 3));
  }

  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // brown-ish noise: softer than white
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }
}

export const AudioManager = new AudioManagerImpl();
