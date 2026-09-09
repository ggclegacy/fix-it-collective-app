/** Opt-in, locally synthesized ambience. No media requests or autoplay. */
export function createSound() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const voices: OscillatorNode[] = [];
  for (const frequency of [55, 82.41, 110.08]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(master);
    oscillator.start();
    voices.push(oscillator);
  }
  function foley(chapter: number) {
    // Short, restrained material cues: clipper, linen, chair, doorway, ceramic, seal.
    const length = chapter === 2 ? 0.85 : chapter === 1 ? 0.3 : 0.16;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * length),
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = [700, 130, 1100, 210, 600, 2400, 500, 1800][
      chapter
    ];
    filter.Q.value = chapter === 5 || chapter === 7 ? 12 : 0.7;
    const gain = context.createGain();
    gain.gain.value = chapter === 2 ? 0.013 : 0.023;
    const pan = context.createStereoPanner();
    pan.pan.value = chapter % 2 ? -0.25 : 0.25;
    source.connect(filter).connect(gain).connect(pan).connect(master);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  }
  return {
    active(on: boolean) {
      if (on) void context.resume().catch(() => {});
      master.gain.setTargetAtTime(on ? 0.65 : 0, context.currentTime, 0.2);
    },
    cue(chapter: number) {
      foley(chapter);
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const pan = context.createStereoPanner();
      pan.pan.value = chapter % 2 ? -0.3 : 0.3;
      oscillator.type = chapter === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(
        [220, 145, 174.61, 196, 261.63, 220, 329.63, 440][chapter],
        context.currentTime,
      );
      envelope.gain.setValueAtTime(0, context.currentTime);
      envelope.gain.linearRampToValueAtTime(0.07, context.currentTime + 0.04);
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 1.4,
      );
      oscillator.connect(envelope).connect(pan).connect(master);
      oscillator.start();
      oscillator.stop(context.currentTime + 1.5);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
        pan.disconnect();
      };
    },
    dispose() {
      voices.forEach((voice) => voice.stop());
      void context.close().catch(() => {});
    },
  };
}
