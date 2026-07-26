import { describe, expect, it } from "vitest";

import {
  getLiveModelProfile,
  listLiveModelProfiles,
} from "./live-model-profile";

describe("live model profiles", () => {
  it("lists the stable economy and quality profiles in product order", () => {
    expect(listLiveModelProfiles().map(({ id }) => id)).toEqual([
      "economy",
      "quality",
    ]);
  });

  it("maps economy to the current mini Realtime model", () => {
    expect(getLiveModelProfile("economy").model).toBe("gpt-realtime-2.1-mini");
  });

  it("maps quality to the current full Realtime model", () => {
    expect(getLiveModelProfile("quality").model).toBe("gpt-realtime-2.1");
  });

  it("declares the live capabilities required by OpenFriend", () => {
    for (const profile of listLiveModelProfiles()) {
      expect(profile.capabilities).toEqual({
        fullDuplexAudio: true,
        interruption: true,
        toolUse: true,
      });
    }
  });

  it("returns known profiles and rejects unknown profile IDs", () => {
    expect(getLiveModelProfile("economy").displayName).toBe("Economy");
    expect(() => getLiveModelProfile("missing")).toThrow(
      'Unknown live model profile: "missing"',
    );
  });

  it("never registers the deprecated mini model", () => {
    expect(
      listLiveModelProfiles().some(
        ({ model }) => model === "gpt-realtime-mini",
      ),
    ).toBe(false);
  });
});
