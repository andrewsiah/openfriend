export const SYNTHETIC_SPEECH_GAIN = 1.5;
export const SYNTHETIC_TRAILING_SILENCE_SECONDS = 1.5;

export async function playSyntheticFixture(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  fixture: AudioBuffer,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const playbackStartedAt = audioContext.currentTime;
    const speechSource = audioContext.createBufferSource();
    const speechGain = audioContext.createGain();
    speechSource.buffer = fixture;
    speechGain.gain.value = SYNTHETIC_SPEECH_GAIN;
    speechSource.connect(speechGain);
    speechGain.connect(destination);

    const silenceSource = audioContext.createBufferSource();
    silenceSource.buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * SYNTHETIC_TRAILING_SILENCE_SECONDS,
      audioContext.sampleRate,
    );
    silenceSource.connect(destination);
    silenceSource.addEventListener("ended", () => resolve(), { once: true });

    speechSource.start(playbackStartedAt);
    silenceSource.start(playbackStartedAt + fixture.duration);
  });
}
