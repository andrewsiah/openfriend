"use client";

import type {
  LiveModelProfile,
  LiveModelProfileId,
} from "@openfriend/contracts";

interface LiveProfileSelectorProps {
  disabled?: boolean;
  onSelectedIdChange: (profileId: LiveModelProfileId) => void;
  profiles: readonly LiveModelProfile[];
  selectedId: LiveModelProfileId;
}

export function LiveProfileSelector({
  disabled = false,
  onSelectedIdChange,
  profiles,
  selectedId,
}: LiveProfileSelectorProps) {
  const selectedProfile =
    profiles.find((profile) => profile.id === selectedId) ?? profiles[0];

  if (!selectedProfile) {
    return null;
  }

  return (
    <div className="profileSelector">
      <fieldset>
        <legend className="srOnly">Live conversation profile</legend>

        <div className="profileOptions">
          {profiles.map((profile) => (
            <label className="profileOption" key={profile.id}>
              <input
                type="radio"
                name="live-profile"
                value={profile.id}
                checked={selectedId === profile.id}
                disabled={disabled}
                onChange={() => onSelectedIdChange(profile.id)}
              />
              <span className="profileCard">
                <span className="profileCardTopline">
                  <strong>{profile.displayName}</strong>
                  <span>
                    {profile.tier === "lower-cost"
                      ? "Lower cost"
                      : "Higher fidelity"}
                  </span>
                </span>
                <span className="profileDescription">
                  {profile.description}
                </span>
                <span className="profileCheck" aria-hidden="true">
                  <span />
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="profileReadout" aria-live="polite">
        <span>New sessions will use</span>
        <code>{selectedProfile.model}</code>
      </div>
    </div>
  );
}
