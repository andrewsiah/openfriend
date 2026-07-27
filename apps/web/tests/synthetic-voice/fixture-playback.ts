export const SYNTHETIC_TRAILING_SILENCE_SECONDS = 1.5;

export async function playSyntheticFixture(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  fixture: AudioBuffer,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const playbackStartedAt = audioContext.currentTime;
    const speechSource = audioContext.createBufferSource();
    speechSource.buffer = fixture;
    speechSource.connect(destination);

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
