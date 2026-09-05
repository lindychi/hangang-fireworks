export type MusicSignal = { bins: Uint8Array; rms: number; sampleRate: number; fftSize: number };
export type MusicCue = { kind: number; power: number; x: number; height: number; depth: number; hue: number; seed: number; fan: boolean };

export function seededRandom(seed: number) {
  return (a: number, b: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return a + (seed / 4294967296) * (b - a);
  };
}

// The director owns musical time and emits complete, reproducible launch instructions.
// Renderers only translate normalized stage coordinates into their own world space.
export function createMusicDirector() {
  let previous: number[] = [0, 0, 0], baseline = 0, lastTime = -Infinity, lastLaunch = -Infinity, sequence = 0;
  function reset() { previous = [0, 0, 0]; baseline = 0; lastTime = -Infinity; lastLaunch = -Infinity; sequence = 0; }
  function update(signal: MusicSignal, now: number, intensity: number): MusicCue[] {
    const dt = Number.isFinite(lastTime) ? Math.max(0, now - lastTime) : 20;
    lastTime = now;
    if (signal.rms < .012) { previous = [0, 0, 0]; baseline *= Math.exp(-dt / 700); return []; }
    const { bins, sampleRate, fftSize } = signal;
    const band = (low: number, high: number) => {
      const start = Math.max(1, Math.ceil(low * fftSize / sampleRate));
      const end = Math.min(bins.length, Math.ceil(high * fftSize / sampleRate));
      let sum = 0; for (let i = start; i < end; i++) sum += bins[i] / 255;
      return sum / Math.max(1, end - start);
    };
    const bands = [band(40, 280), band(280, 2200), band(2200, 11200)];
    const energy = Math.min(1, signal.rms * .65 + Math.max(...bands) * .35);
    const flux = bands.reduce((sum, value, i) => sum + Math.max(0, value - previous[i]), 0) / 3;
    const rising = energy - baseline;
    const onset = flux > .055 && rising > .035;
    previous = bands;
    baseline += (energy - baseline) * (1 - Math.exp(-dt / 900));
    const interval = onset ? 230 : 1900 - energy * 700;
    if (now - lastLaunch < interval / Math.max(.5, Math.min(2, intensity))) return [];
    lastLaunch = now;
    const dominant = bands.indexOf(Math.max(...bands));
    const mixed = Math.min(...bands) > Math.max(...bands) * .6;
    const kind = mixed && onset ? 3 : dominant;
    const count = onset ? 1 + (energy > .48 ? 1 : 0) + (energy > .78 && rising > .1 ? 1 : 0) : 1;
    const seed = ++sequence * 7919 + Math.round(energy * 1000) + dominant * 131;
    const random = seededRandom(seed);
    return Array.from({ length: count }, (_, i) => ({
      kind, power: .55 + energy * .85 + (dominant === 0 ? .18 : dominant === 2 ? -.08 : 0),
      x: count === 1 ? random(.25, .75) : .5 + (i - (count - 1) / 2) * .27,
      height: .42 + dominant * .12 + energy * .18,
      depth: random(.25, .75), hue: [38, 325, 195][dominant],
      seed: seed + i, fan: i === 0 && onset && energy > .65 && rising > .1,
    }));
  }
  return { update, reset };
}

export function createMusicReader() {
  let bins = new Uint8Array(0), wave = new Uint8Array(0);
  return (analyser: AnalyserNode, sampleRate = 48000): MusicSignal => {
    const size = analyser.frequencyBinCount || 512;
    if (bins.length !== size) { bins = new Uint8Array(size); wave = new Uint8Array(analyser.fftSize || size * 2); }
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(wave);
    let sum = 0; for (const value of wave) sum += ((value - 128) / 128) ** 2;
    return { bins, rms: Math.sqrt(sum / wave.length), sampleRate, fftSize: analyser.fftSize || size * 2 };
  };
}
