import Link from "next/link";
import { HeritageStory } from "@/components/heritage-story";
import { SanctumFilm } from "@/components/sanctum-film";
import { NetworkDoors } from "@/components/network-doors";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { ExperienceWorlds } from "@/components/experience-worlds";

export const metadata = {
  title: "Sanctum Collective — A place built around becoming better",
  description:
    "One destination in Eunice, Louisiana. Discover Fix It Shop, Casa Valora and Legacy Sanctum: hair, massage, wellness, performance and community.",
};

export default function Home() {
  return (
    <main id="main" className="sanctum-home">
      <section className="sanctum-hero" aria-labelledby="sanctum-title">
        <SanctumFilm />
        <div className="sanctum-location">
          <span>EUNICE, LOUISIANA</span>
          <span>A LITTLE TIME. A BETTER YOU.</span>
        </div>
        <div className="sanctum-copy">
          <p className="eyebrow">SANCTUM COLLECTIVE</p>
          <h1 id="sanctum-title">
            A place built around
            <br /> <em>becoming better.</em>
          </h1>
          <p className="sanctum-description">
            Hair. Massage. Wellness.
            <br className="mobile-break" /> Performance. Community.
          </p>
          <div className="hero-actions">
            <Link className="button gold" href="/book">
              Book Your Experience <ArrowUpRight size={17} />
            </Link>
            <a className="sanctum-explore" href="#experiences">
              Explore the Sanctum <ArrowDown size={16} />
            </a>
          </div>
        </div>
        <div className="sanctum-baseline">
          <span>LOOK BETTER. FEEL BETTER. LIVE BETTER.</span>
          <a href="#experiences" aria-label="Scroll to the three experiences">
            SCROLL TO DISCOVER <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <div id="home-content">
        <section
          className="section sanctum-worlds"
          id="experiences"
          aria-labelledby="worlds-title"
        >
          <div className="sanctum-section-heading">
            <p className="eyebrow">YOUR PLACE TO BECOME</p>
            <h2 id="worlds-title">
              Three visions.
              <br />
              <em>One Sanctum.</em>
            </h2>
            <p>
              Confidence in how you look. Space to restore.
              <br />
              The intention to take it further.
            </p>
          </div>
          <ExperienceWorlds />
          <p className="sanctum-concept-note">
            A glimpse of the vision · AI-created scenes based on Katie, Kamilla
            and Neil’s reference photos. Settings and products are illustrative.
          </p>
        </section>
        <HeritageStory />
        <NetworkDoors />
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
              Your personal space <ArrowUpRight size={18} />
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
      </div>
    </main>
  );
}
