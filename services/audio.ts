import { generateSpeech } from './geminiService';

let ctx: AudioContext | null = null;

// Speaks Chinese text through the app's text-to-speech function.
export const playSpeech = async (text: string): Promise<void> => {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (ctx.state === 'suspended') await ctx.resume();

  const result = await generateSpeech(text);
  if (!result) throw new Error('No audio returned');

  let buffer: AudioBuffer;
  if (typeof result === 'object') {
    // OpenAI: an encoded audio file
    buffer = await ctx.decodeAudioData(result.audioData);
  } else {
    // Gemini: base64 of raw 16-bit mono PCM at 24kHz
    const binary = atob(result.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    buffer = ctx.createBuffer(1, Math.max(samples.length, 1), 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};
