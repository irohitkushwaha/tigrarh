/**
 * Dynamic Audio Synthesizer using Web Audio API.
 * Synthesizes organic sound effects without downloading external asset files.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play Pebble Thud (low frequency wood-earth impact for placing stones)
 */
export function playPebbleThud() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Primary low impact
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(140, now);
  osc1.frequency.exponentialRampToValueAtTime(45, now + 0.15);
  
  gain1.gain.setValueAtTime(0.8, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  
  // Secondary harmonic for timberiness
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(280, now);
  osc2.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  
  gain2.gain.setValueAtTime(0.2, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  
  // Lowpass filter to muffle and make it earthy
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, now);
  
  osc1.connect(gain1);
  osc2.connect(gain2);
  
  gain1.connect(filter);
  gain2.connect(filter);
  filter.connect(ctx.destination);
  
  osc1.start(now);
  osc2.start(now);
  
  osc1.stop(now + 0.2);
  osc2.stop(now + 0.2);
}

/**
 * Play Stick Click (mid-high organic wooden snapping sound for placing sticks)
 */
export function playStickClick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  osc.type = "triangle";
  osc.frequency.setValueAtTime(950, now);
  osc.frequency.exponentialRampToValueAtTime(450, now + 0.05);
  
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, now);
  filter.Q.setValueAtTime(3, now);
  
  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.08);
}

/**
 * Play Tiga Chime (a harmonious positive chord for completed mills)
 */
export function playTigaChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.8;
  
  // Play a major triad chord (C5 - E5 - G5 - C6)
  const frequencies = [523.25, 659.25, 783.99, 1046.50];
  const masterGain = ctx.createGain();
  
  masterGain.gain.setValueAtTime(0.01, now);
  masterGain.gain.linearRampToValueAtTime(0.45, now + 0.08); // soft attack
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  masterGain.connect(ctx.destination);
  
  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    // Stagger the notes slightly for a beautiful arpeggiated chime effect
    const stagger = index * 0.04;
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + stagger);
    
    oscGain.gain.setValueAtTime(0.25, now + stagger);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + stagger + 0.5);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    
    osc.start(now + stagger);
    osc.stop(now + duration);
  });
}

/**
 * Play Capture Shatter (a short noise burst representing stone crumbles for captures)
 */
export function playCaptureShatter() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.35;
  
  // Create white noise buffer
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + duration);
  filter.Q.setValueAtTime(2.0, now);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  
  noiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseNode.start(now);
  noiseNode.stop(now + duration);
}
