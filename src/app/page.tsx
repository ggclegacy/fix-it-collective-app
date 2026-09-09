import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { ExperienceWorlds } from "@/components/experience-worlds";
export default function Home() {
  return (
    <main id="main">
      <section className="entrance">
        <div className="entrance-coordinate">
          <span>EUNICE, LOUISIANA</span>
          <span>PEOPLE / BEAUTY / WELLNESS / COMMUNITY</span>
        </div>
        <div className="entrance-body">
          <div className="entrance-copy">
            <p className="eyebrow">FIX IT COLLECTIVE</p>
            <h1>
              A sharper presence.
              <br />
              <em>A deeper exhale.</em>
            </h1>
            <p className="entrance-description">
              Grooming, beauty and recovery.
              <br />
              Two distinct identities. One place to return to yourself.
            </p>
            <div className="hero-actions">
              <Link className="button gold" href="/book">
                Find your next visit <ArrowUpRight size={18} />
              </Link>
              <a className="text-link" href="#experiences">
                Discover your experience <ArrowDown size={16} />
              </a>
            </div>
          </div>
          <aside
            className="entrance-directory"
            aria-label="Partner destinations"
          >
            <span className="eyebrow">YOUR DESTINATION</span>
            <Link href="/services">
              <span>01</span>
              <div>
                Fix It Collective<small>Grooming · Beauty · Community</small>
              </div>
              <ArrowUpRight size={20} />
            </Link>
            <Link href="/recovery">
              <span>02</span>
              <div>
                Recovery Room<small>by Milla · Massage & Wellness</small>
              </div>
              <ArrowUpRight size={20} />
            </Link>
            <p>RESTORE · CONFIDENCE · TOGETHER</p>
          </aside>
        </div>
        <div className="entrance-baseline">
          <span>CARE, WITH INTENTION.</span>
          <a href="#experiences">EXPLORE THE PARTNERSHIP ↓</a>
          <span>01 — ENTER</span>
        </div>
      </section>
      <section className="section worlds-section" id="experiences">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TWO BRANDS. A SHARED PHILOSOPHY.</p>
            <h2>
              Choose how you
              <br />
              want to <em>feel.</em>
            </h2>
          </div>
          <p>
            Distinct care. Connected appointments.
            <br />
            Your own rhythm, in one place.
          </p>
        </div>
        <ExperienceWorlds />
      </section>
      <section className="ritual-story section">
        <p className="eyebrow">THE SPACE BETWEEN VISITS</p>
        <h2>
          Care becomes
          <br />
          <em>part of your rhythm.</em>
        </h2>
        <div>
          <p>
            Your next appointment. The details you want remembered. A familiar
            service, ready to book again.
          </p>
          <Link className="button outline" href="/account">
            Enter your personal space <ArrowUpRight size={18} />
          </Link>
        </div>
        <ol>
          <li>
            <span>01</span>Choose your experience
          </li>
          <li>
            <span>02</span>Find your person & time
          </li>
          <li>
            <span>03</span>Return on your terms
          </li>
        </ol>
      </section>
    </main>
  );
}
