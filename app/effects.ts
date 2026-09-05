import type {Settings, SoundEngine} from './fireworks';

// Short, band-limited accents leave room for music; one voice per physical event.
export function createFireworkSound(settings: Settings, getEngine: () => SoundEngine | null) {
  const voices = new Map<AudioBufferSourceNode, () => void>();
  let noise: AudioBuffer | undefined;
  function dispose() {
    for (const [source, cleanup] of voices) { source.onended = null; source.stop(); cleanup(); }
  }
  function sync() { if (!settings.sound || settings.paused || settings.musicPaused) dispose(); }
  function play(event: 'launch' | 'burst', power: number, position: number, crackle = false) {
    const engine = getEngine();
    if (!settings.sound || settings.paused || settings.musicPaused || !engine || engine.context.state !== 'running' || voices.size >= 6) return;
    const c = engine.context;
    if (!noise || noise.sampleRate !== c.sampleRate) {
      noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = c.createBufferSource(); source.buffer = noise;
    const filter = c.createBiquadFilter(), gain = c.createGain(), pan = c.createStereoPanner();
    const launch = event === 'launch', t = c.currentTime, duration = launch ? .22 : crackle ? .65 : .48;
    filter.type = launch ? 'highpass' : 'bandpass'; filter.frequency.value = launch ? 1600 : crackle ? 950 : 260; filter.Q.value = .7;
    pan.pan.value = Math.max(-1, Math.min(1, position));
    const peak = (launch ? .012 : .055) * Math.min(1.5, power) * (settings.connected ? .4 : 1) / Math.sqrt(voices.size + 1);
    gain.gain.setValueAtTime(.0001, t); gain.gain.linearRampToValueAtTime(peak, t + (launch ? .07 : .012)); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter).connect(gain).connect(pan).connect(c.destination);
    const cleanup = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
    voices.set(source, cleanup); source.onended = cleanup; source.start(t); source.stop(t + duration + .02);
  }
  return {play, sync, dispose};
}
