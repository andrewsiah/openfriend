import { describe, expect, it, vi } from "vitest";

import {
  playSyntheticFixture,
  SYNTHETIC_SPEECH_GAIN,
  SYNTHETIC_TRAILING_SILENCE_SECONDS,
} from "./fixture-playback";

class FakeBufferSource extends EventTarget {
  buffer: AudioBuffer | null = null;
  readonly connect = vi.fn();
  readonly start = vi.fn();
}

class FakeGainNode {
  readonly connect = vi.fn();
  readonly gain = { value: 1 };
}

describe("playSyntheticFixture", () => {
  it("normalizes speech and streams silence so server VAD can finalize the turn", async () => {
    const speechSource = new FakeBufferSource();
    const silenceSource = new FakeBufferSource();
    const speechGain = new FakeGainNode();
    const sources = [speechSource, silenceSource];
    const fixture = { duration: 2.3 } as AudioBuffer;
    const silentBuffer = {} as AudioBuffer;
    const destination = {} as MediaStreamAudioDestinationNode;
    const audioContext = {
      createBuffer: vi.fn(() => silentBuffer),
      createBufferSource: vi.fn(() => sources.shift()),
      createGain: vi.fn(() => speechGain),
      currentTime: 10,
      sampleRate: 48_000,
    } as unknown as AudioContext;

    const playback = playSyntheticFixture(audioContext, destination, fixture);

    expect(audioContext.createBuffer).toHaveBeenCalledWith(
      1,
      48_000 * SYNTHETIC_TRAILING_SILENCE_SECONDS,
      48_000,
    );
    expect(speechSource.buffer).toBe(fixture);
    expect(silenceSource.buffer).toBe(silentBuffer);
    expect(audioContext.createGain).toHaveBeenCalledOnce();
    expect(speechGain.gain.value).toBe(SYNTHETIC_SPEECH_GAIN);
    expect(speechSource.connect).toHaveBeenCalledWith(speechGain);
    expect(speechGain.connect).toHaveBeenCalledWith(destination);
    expect(silenceSource.connect).toHaveBeenCalledWith(destination);
    expect(speechSource.start).toHaveBeenCalledWith(10);
    expect(silenceSource.start).toHaveBeenCalledWith(12.3);

    silenceSource.dispatchEvent(new Event("ended"));
    await playback;
  });
});
