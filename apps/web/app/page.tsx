import { listLiveModelProfiles } from "@openfriend/contracts";

import { LiveConversationLab } from "../components/live-conversation-lab";

const deliveryPhases = [
  {
    number: "01",
    eyebrow: "Now",
    title: "Web Voice Lab",
    description:
      "Prove the rhythm first: natural turns, interruptions, latency, and conversational quality.",
  },
  {
    number: "02",
    eyebrow: "Next",
    title: "Watch Field Test",
    description:
      "Take the same live relationship outside on an independent Apple Watch over Wi-Fi and cellular.",
  },
] as const;

export default function HomePage() {
  const profiles = listLiveModelProfiles();

  return (
    <main>
      <div className="ambient ambientTop" aria-hidden="true" />
      <div className="ambient ambientBottom" aria-hidden="true" />

      <header className="siteHeader">
        <a className="brand" href="#top" aria-label="OpenFriend home">
          <span className="brandMark" aria-hidden="true">
            <span />
          </span>
          <span>OpenFriend</span>
        </a>

        <div className="headerMeta">
          <span>Personal build · Open source</span>
          <a href="#delivery">Read the idea</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="heroCopy">
          <p className="eyebrow">A personal companion, built in public</p>
          <h1>A conversation that can keep up with a life.</h1>
          <p className="heroLead">
            OpenFriend is a full-duplex conversational companion: present in the
            moment, able to delegate deeper work, and designed to come with you
            when the phone stays home.
          </p>

          <div className="principle">
            <span className="principleIndex">01</span>
            <p>
              Voice carries the relationship.
              <br />
              The web makes decisions clear.
            </p>
          </div>
        </div>

        <aside className="presencePanel" aria-label="OpenFriend live status">
          <div className="presenceVisual" aria-hidden="true">
            <div className="presenceHalo" />
            <div className="presenceCore">
              <span />
            </div>
          </div>

          <div className="presenceStatus">
            <span className="statusDot" aria-hidden="true" />
            <p>
              <strong>Voice lab ready</strong>
              <span>Session starts only when you ask</span>
            </p>
          </div>

          <a className="voiceButton voiceButtonLink" href="#voice-lab">
            <span>Open the voice lab</span>
            <small>Microphone stays off until Start</small>
          </a>
        </aside>
      </section>

      <section
        className="profileSection"
        id="voice-lab"
        aria-labelledby="profile-heading"
      >
        <div className="sectionIntro">
          <p className="eyebrow">The live voice layer</p>
          <h2 id="profile-heading">
            Choose the conversation, not the code path.
          </h2>
          <p>
            Start economical while we shape the experience. Switch to the full
            model when you want to compare conversational depth. Harder work can
            still move to a separate, stronger operator.
          </p>
        </div>

        <LiveConversationLab profiles={profiles} />
      </section>

      <section
        className="deliverySection"
        id="delivery"
        aria-labelledby="delivery-heading"
      >
        <div className="deliveryHeading">
          <p className="eyebrow">The shortest path outside</p>
          <h2 id="delivery-heading">
            Prove the voice. Then take the Watch for a walk.
          </h2>
        </div>

        <ol className="deliverySequence" aria-label="Delivery sequence">
          {deliveryPhases.map((phase) => (
            <li key={phase.number}>
              <div className="phaseTopline">
                <span>{phase.number}</span>
                <span>{phase.eyebrow}</span>
              </div>
              <h3>{phase.title}</h3>
              <p>{phase.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer>
        <p>OpenFriend · Phase 1</p>
        <p>Conversation first. Actions only when confirmed.</p>
      </footer>
    </main>
  );
}
