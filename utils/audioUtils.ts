/**
 * Decodifica una cadena base64 en un Uint8Array.
 * @param base64 La cadena base64 a decodificar.
 * @returns Un Uint8Array con los bytes decodificados.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodifica datos de audio PCM crudos en un AudioBuffer.
 * @param data Los datos de audio como un Uint8Array (PCM de 16 bits).
 * @param ctx El AudioContext del navegador.
 * @param sampleRate La tasa de muestreo del audio (ej. 24000).
 * @param numChannels El número de canales de audio (ej. 1 para mono).
 * @returns Una promesa que se resuelve con el AudioBuffer decodificado.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // El buffer de entrada es Int16, por lo que cada muestra tiene 2 bytes.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normaliza la muestra de 16 bits (rango -32768 a 32767) a un flotante de 32 bits (rango -1.0 a 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
