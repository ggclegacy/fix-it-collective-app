import type { Metadata } from "next";
import { NetworkNavigator } from "@/components/network-navigator";
export const metadata: Metadata = {
  title: "Men — Restore Yourself",
  description:
    "Katie’s Men’s Wellness Network. Find responsible starting points for health, confidence and wellbeing.",
};
export default function MenPage() {
  return (
    <main id="main" className="network-page men-network">
      <div className="network-intro">
        <div>
          <p className="eyebrow">KATIE · MEN’S WELLNESS NETWORK</p>
          <h1>
            Restore
            <br />
            <em>yourself.</em>
          </h1>
          <p className="network-lead">
            Feel more like you.
            <br />
            Take the next step on your terms.
          </p>
        </div>
        <div className="network-intro-note">
          <span className="eyebrow">STRONG ENOUGH TO START</span>
          <p>
            Energy. Health. Connection. Confidence.
            <br />A place to find direction, without judgment.
          </p>
          <span>NO ACCOUNT REQUIRED · NO DIAGNOSIS HERE</span>
        </div>
      </div>
      <div className="network-content">
        <NetworkNavigator network="men" />
        <aside className="network-side">
          <span className="eyebrow">CARE, WITH INTENTION</span>
          <h2>
            A better next step.
            <br />
            <em>Not another guess.</em>
          </h2>
          <ol className="network-principles">
            <li>
              <span>01</span>
              <div>
                <strong>Name what’s changed.</strong>
                <p>Start with a need, a goal or just a feeling.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Explore qualified care.</strong>
                <p>
                  Use a public resource to find a clinician or service. Ask
                  about credentials, costs and fit.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Choose your next move.</strong>
                <p>
                  Contact the organization directly. Nothing is sent on your
                  behalf.
                </p>
              </div>
            </li>
          </ol>
          <div className="network-note">
            <h3>Need support right now?</h3>
            <p>
              For immediate danger or a medical emergency, call{" "}
              <a href="tel:911">911</a>. For a mental health or suicide crisis,
              call or text <a href="tel:988">988</a>, or{" "}
              <a href="https://988lifeline.org/" rel="noreferrer">
                visit 988 for chat
              </a>
              .
            </p>
            <p>
              Fix It Collective is not an emergency service or a medical
              provider.
            </p>
          </div>
          <details className="network-note">
            <summary>Prefer to explore directly?</summary>
            <p>
              <a href="https://findahealthcenter.hrsa.gov/" rel="noreferrer">
                Find a health center
              </a>
            </p>
            <p>
              <a href="https://findtreatment.gov/" rel="noreferrer">
                Find mental health & recovery care
              </a>
            </p>
            <p>
              <a href="https://www.louisiana211.org/" rel="noreferrer">
                Louisiana 211 community resources
              </a>
            </p>
          </details>
        </aside>
      </div>
    </main>
  );
}
