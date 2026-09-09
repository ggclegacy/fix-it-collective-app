import { NetworkNavigator } from "@/components/network-navigator";
export default function WomenPage() {
  return (
    <main id="main" className="network-page women-network">
      <div className="women-welcome">
        <p className="eyebrow">CAMILLA · WOMEN’S SUPPORT NETWORK</p>
        <h1>
          You don’t have to figure
          <br />
          <em>everything out today.</em>
        </h1>
        <p>
          One next step is enough. Find support for where you are,
          <br className="desktop-break" /> and room for where you want to go.
        </p>
      </div>
      <section className="immediate-support" aria-labelledby="immediate-title">
        <div>
          <h2 id="immediate-title">Need help now?</h2>
          <p>
            In immediate danger, call <a href="tel:911">911</a> if you can
            safely do so.
            <br />
            This site is not an emergency service.
          </p>
        </div>
        <a href="tel:18884111333">
          <strong>Domestic violence support</strong>
          <span>24/7 · 1-888-411-1333</span>
        </a>
        <a href="tel:13372337273">
          <strong>Sexual assault support</strong>
          <span>Hearts of Hope · 337-233-7273</span>
        </a>
        <a href="https://988lifeline.org/" rel="noreferrer">
          <strong>Emotional crisis support</strong>
          <span>Call / text 988 · online chat</span>
        </a>
      </section>
      <div className="network-content">
        <NetworkNavigator network="women" />
        <aside className="network-side">
          <div className="network-note privacy-note">
            <span className="eyebrow">BEFORE YOU BEGIN</span>
            <h2>
              Your privacy
              <br />
              <em>matters here.</em>
            </h2>
            <p>
              If your device may be monitored, consider using a safer device.
              Private browsing and Quick Exit cannot hide activity from all
              monitoring.
            </p>
            <p>
              Quick Exit opens a weather site in this tab. It does not erase
              browsing history. Calls, texts and external websites can also
              leave records.
            </p>
            <p>
              No account, saved choices, contact form or notifications are used
              by this navigator. Your visit may still appear in browser history
              and hosting logs.
            </p>
            <a
              className="text-link"
              href="https://www.techsafety.org/internetbrowserprivacytips"
              rel="noreferrer"
            >
              Read technology-safety guidance ↗
            </a>
          </div>
          <div className="network-note">
            <h3>You choose the pace.</h3>
            <p>
              Survive → Stabilize → Restore → Ascend is a way to find support,
              never a checklist you have to complete. Move between them whenever
              you need.
            </p>
            <p>
              You don’t need to share your story here, prove what happened, or
              know exactly what you need.
            </p>
          </div>
          <details className="network-note">
            <summary>Go directly to an organization</summary>
            <p>
              <a href="https://faithhouseacadiana.com/" rel="noreferrer">
                Faith House · domestic violence support
              </a>
            </p>
            <p>
              <a
                href="https://lcadv.org/resources-and-other-publications/"
                rel="noreferrer"
              >
                LCADV · statewide domestic violence routing
              </a>
            </p>
            <p>
              <a href="https://theheartsofhope.org/" rel="noreferrer">
                Hearts of Hope · sexual assault support
              </a>
            </p>
            <p>
              <a href="https://www.lafasa.org/" rel="noreferrer">
                LaFASA · statewide sexual assault support
              </a>
            </p>
            <p>
              <a href="https://www.la-law.org/get-help/" rel="noreferrer">
                Acadiana Legal Service Corporation
              </a>
            </p>
            <p>
              <a href="https://www.louisiana211.org/" rel="noreferrer">
                Louisiana 211 · everyday support
              </a>
            </p>
          </details>
        </aside>
      </div>
      <div className="network-foundation">
        <span className="eyebrow">A FOUNDATION FOR WHAT COMES NEXT</span>
        <p>
          Camilla’s vision starts with connection: safety, stability, healing
          and opportunity. This network is part of Fix It Collective, not a
          nonprofit organization. Listed resources are independent
          organizations; their inclusion does not imply a partnership.
        </p>
      </div>
    </main>
  );
}
