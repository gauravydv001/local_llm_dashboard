export function speakText(text: string, opts?: { rate?: number; pitch?: number; voiceName?: string }) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  try {
    synth.cancel();
  } catch {}

  const utter = new SpeechSynthesisUtterance(text);
  if (opts?.rate) utter.rate = opts.rate;
  if (opts?.pitch) utter.pitch = opts.pitch;

  if (opts?.voiceName) {
    const voices = synth.getVoices();
    const match = voices.find((v) => v.name === opts.voiceName);
    if (match) utter.voice = match;
  }

  synth.speak(utter);
}

export function stopSpeaking() {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
}
