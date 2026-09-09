import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { services, money } from "@/lib/catalog";
export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="gold-dash" /> A MORE CONSIDERED KIND OF CARE
          </p>
          <h1>
            Look sharp.
            <br />
            Feel like <em>you.</em>
          </h1>
          <p className="hero-description">
            Good grooming goes beyond the mirror. Make space for yourself, with
            personal care that fits the way you live.
          </p>
          <div className="hero-actions">
            <Link className="button gold" href="/book">
              Find your next visit <ArrowUpRight size={19} />
            </Link>
            <Link className="text-link light" href="/collective">
              Meet the collective <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-foot">
            <span>YOUR STYLE. YOUR PEOPLE. YOUR PLACE.</span>
            <span>01 — THE COLLECTIVE</span>
          </div>
        </div>
        <div
          className="brand-poster"
          aria-label="Fix It Collective brand graphic"
        >
          <div className="poster-top">
            <span>
              PERSONAL CARE,
              <br />
              WITH PURPOSE.
            </span>
            <span>F / C</span>
          </div>
          <div className="poster-type">
            FIX
            <br />
            <span>IT.</span>
          </div>
          <div className="poster-bottom">
            <span>
              GOOD TO BE
              <br />
              YOURSELF.
            </span>
            <span className="poster-star">✳</span>
          </div>
        </div>
      </section>
      <div className="principles">
        <span>
          <Sparkles size={17} /> Considered care
        </span>
        <span>
          <CalendarDays size={17} /> Your time, well spent
        </span>
        <span>
          <Clock3 size={17} /> A routine worth keeping
        </span>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE SERVICE EDIT</p>
            <h2>
              A fresh start.
              <br />
              Down to the details.
            </h2>
          </div>
          <div>
            <p>
              Find your essential, or try a new ritual.
              <br />
              Every good visit starts with a conversation.
            </p>
            <Link className="text-link" href="/services">
              Explore all services <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <p className="sample-caption">
          ILLUSTRATIVE MENU · Services, durations, and prices await studio
          approval.
        </p>
        <div className="service-list">
          {services.slice(0, 3).map((s) => (
            <Link
              key={s.id}
              className="service-row"
              href={`/book?service=${s.id}`}
            >
              <span className="service-number">{s.number}</span>
              <div>
                <span className="eyebrow">{s.category}</span>
                <h3>{s.name}</h3>
              </div>
              <span className="service-meta">
                {s.duration} min <span>from {money(s.price)}</span>
              </span>
              <ArrowUpRight className="row-arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="statement">
        <p className="eyebrow">MORE THAN AN APPOINTMENT</p>
        <h2>
          Your people.
          <br />
          Your rhythm.
          <br />
          <em>Your collective.</em>
        </h2>
        <div>
          <p>
            We’re building a place for personal care to feel personal again.
            Thoughtful services. Room to be yourself. And a simpler way to make
            it part of your everyday.
          </p>
          <Link href="/collective" className="text-link light">
            Get to know Fix It <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section return-section">
        <div>
          <p className="eyebrow">MAKE IT A GOOD HABIT</p>
          <h2>
            Your next visit,
            <br />
            already in mind.
          </h2>
          <p>
            Keep your appointments together. Pick up where you left off.
            <br />
            Make a little time for yourself.
          </p>
          <Link className="button navy" href="/account">
            Step into your space <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="routine-card">
          <span className="eyebrow">YOUR SPACE AT FIX IT</span>
          <h3>
            Less life admin.
            <br />
            More feeling good.
          </h3>
          {[
            "Your appointments, all together",
            "Your favorite service, one tap away",
            "Your routine, on your terms",
          ].map((t, i) => (
            <p key={t}>
              <span>0{i + 1}</span>
              {t}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
