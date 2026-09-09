import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Scissors,
  Sparkles,
  MoveUpRight,
  CalendarDays,
} from "lucide-react";
import { BrandEmblem } from "./brand-emblem";
import { ProviderProfileForm } from "./provider-profile";
import { services, money } from "@/lib/catalog";
import type { ProviderId } from "@/lib/provider-profiles";
import { currentUser } from "@/lib/auth";
import { appointmentsFor } from "@/lib/scheduling";
import { db } from "@/lib/db";
import { AppointmentCard } from "./appointment-card";
import "@/app/providers.css";

export async function ProviderEnvironment({
  provider,
}: {
  provider: ProviderId;
}) {
  const recovery = provider === "camilla";
  const persistence = !process.env.VERCEL;
  const user = persistence ? await currentUser() : null;
  const visits = user ? appointmentsFor({ ...user, role: "client" }) : [];
  const last = visits
    .filter((a) => a.status === "completed")
    .sort((a, b) => b.start_at.localeCompare(a.start_at))[0];
  const next = visits
    .filter(
      (a) => a.status === "confirmed" && a.start_at > new Date().toISOString(),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0];
  const notes = user
    ? (db()
        .prepare(
          "SELECT id,body FROM notes WHERE client_id=? AND visibility='client' ORDER BY created_at DESC LIMIT 3",
        )
        .all(user.id) as { id: string; body: string }[])
    : [];
  const sections = recovery
    ? [
        ["intake", "Your body"],
        ["sessions", "Sessions"],
        ["care", "Your recovery"],
        ["extras", "Beyond the room"],
      ]
    : [
        ["rituals", "The chair"],
        ["profile", "Grooming DNA"],
        ["care", "Your rhythm"],
        ["wellness", "Wellness Wing"],
      ];
  return (
    <main
      id="main"
      className={`provider-environment ${recovery ? "provider-camilla" : "provider-katie"}`}
    >
      <div className="provider-bar">
        <Link href="/#experiences" className="provider-link">
          <ArrowLeft size={16} />
          Back to the Collective
        </Link>
        <span>
          {recovery ? "02 / RECOVERY ROOM BY MILLA" : "01 / KATIE’S STUDIO"}
        </span>
        <Link
          href={recovery ? "/grooming" : "/recovery"}
          className="provider-link"
        >
          {recovery ? "Katie’s Studio" : "Recovery Room"}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <section className="provider-hero">
        <Image
          className="provider-atmosphere"
          src={`/providers/${recovery ? "camilla-room" : "katie-studio"}.webp`}
          fill
          sizes="100vw"
          priority
          alt=""
        />
        <div className="provider-hero-copy">
          <p className="provider-kicker">
            {recovery
              ? "CAMILLA · MASSAGE & RECOVERY"
              : "KATIE · MEN’S GROOMING & WELLNESS"}
          </p>
          <h1>
            {recovery ? (
              <>
                Leave the day.
                <br />
                <em>Come back to you.</em>
              </>
            ) : (
              <>
                Take your seat.
                <br />
                <em>Own your presence.</em>
              </>
            )}
          </h1>
          <p>
            {recovery
              ? "A little less noise. A little more room to feel like yourself. Welcome to Recovery Room by Milla."
              : "Considered grooming. A personal ritual. A space to refine the way you show up, with Katie."}
          </p>
          <div className="provider-actions">
            <a
              className="provider-button"
              href={recovery ? "#intake" : "#rituals"}
            >
              {recovery ? "What does your body need?" : "Book Your Chair"}
              <ArrowUpRight size={19} />
            </a>
            <a className="provider-link" href={recovery ? "#care" : "#profile"}>
              {recovery ? "Your recovery space" : "Build your Grooming DNA"}
            </a>
          </div>
        </div>
        <div className="provider-seal">
          <BrandEmblem
            brand={recovery ? "recovery" : "collective"}
            size={160}
            eager
          />
          <span>
            {recovery
              ? "MIND · BODY · BALANCE"
              : "PRECISION · PRESENCE · PERSONAL"}
          </span>
        </div>
        <div className="provider-hero-foot">
          <span>
            {recovery
              ? "A DEEPER EXHALE STARTS HERE"
              : "YOUR CHAIR. YOUR RITUAL. YOUR STANDARD."}
          </span>
          <span>SCROLL TO SETTLE IN ↓</span>
        </div>
      </section>
      <nav
        className="provider-nav"
        aria-label={
          recovery ? "Recovery Room navigation" : "Katie’s Studio navigation"
        }
      >
        {sections.map(([id, label], i) => (
          <a key={id} href={`#${id}`}>
            <span>0{i + 1}</span>
            {label}
          </a>
        ))}
      </nav>
      {recovery ? (
        <section id="intake" className="provider-section">
          <div className="provider-section-heading">
            <div>
              <p className="provider-kicker">01 / CHECK IN WITH YOURSELF</p>
              <h2>
                Start with how
                <br />
                <em>you want to feel.</em>
              </h2>
            </div>
            <p>
              Choose your focus. Set your comfort. Make space for a conversation
              with Camilla, on your terms.
            </p>
          </div>
          <ProviderProfileForm
            key={`${provider}:${user?.id ?? "guest"}`}
            provider={provider}
            signedIn={Boolean(user)}
            persistence={persistence}
          />
        </section>
      ) : (
        <section id="rituals" className="provider-section">
          <div className="provider-section-heading">
            <div>
              <p className="provider-kicker">01 / THE CHAIR</p>
              <h2>
                Precision.
                <br />
                <em>With personality.</em>
              </h2>
            </div>
            <p>
              Your first move: a fresh shape, a sharper beard, or the full
              ritual. Every appointment starts with a conversation.
            </p>
          </div>
          <p className="provider-availability">
            Preview menu · example pricing. Katie’s practitioner schedule is not
            yet connected.{" "}
            {persistence
              ? "Times below belong to the Collective’s sample professionals."
              : "Online appointment times are not available in this hosted preview."}
          </p>
          <div className="provider-service-list">
            {services
              .filter((s) => s.category !== "Color")
              .map((s) => (
                <article key={s.id} className="provider-service">
                  <span className="provider-service-number">{s.number}</span>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                  </div>
                  <div className="provider-service-action">
                    <span>
                      {s.duration} minutes · from {money(s.price)}
                    </span>
                    <Link
                      className="provider-link"
                      href={
                        persistence
                          ? `/book?service=${s.id}&experience=katie`
                          : "/services"
                      }
                    >
                      {persistence
                        ? "Explore preview times"
                        : "View the preview menu"}
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}
      {recovery ? (
        <section
          id="sessions"
          className="provider-section provider-session-room"
        >
          <div>
            <p className="provider-kicker">02 / TIME, JUST FOR YOU</p>
            <h2>
              Unhurried care.
              <br />
              <em>Thoughtfully chosen.</em>
            </h2>
          </div>
          <div className="provider-glass">
            <CalendarDays size={24} />
            <h3>The Recovery Room menu is being prepared.</h3>
            <p>
              Camilla’s approved treatments, session lengths and availability
              are being prepared. Recovery Room appointments are not yet open.
            </p>
            <p>
              Your body-area selections help you prepare for a conversation;
              they do not determine a treatment or diagnosis.
            </p>
            <a href="#intake" className="provider-link">
              Prepare your session brief
              <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
      ) : (
        <section id="profile" className="provider-section">
          <div className="provider-section-heading">
            <div>
              <p className="provider-kicker">02 / GROOMING DNA</p>
              <h2>
                Your style.
                <br />
                <em>Remembered.</em>
              </h2>
            </div>
            <p>
              The fade you prefer. The finish that feels right. The details that
              make your next consultation easier.
            </p>
          </div>
          <ProviderProfileForm
            key={`${provider}:${user?.id ?? "guest"}`}
            provider={provider}
            signedIn={Boolean(user)}
            persistence={persistence}
          />
        </section>
      )}
      <section id="care" className="provider-section provider-care">
        <div className="provider-section-heading">
          <div>
            <p className="provider-kicker">
              03 / {recovery ? "YOUR RECOVERY" : "YOUR RHYTHM"}
            </p>
            <h2>
              {user
                ? `${user.name.split(" ")[0]}, this is your space.`
                : recovery
                  ? "Care that carries on."
                  : "Pick up where you left off."}
            </h2>
          </div>
          <p>
            {recovery
              ? "Session reflections, care guidance and your next step belong together. Camilla-approved recovery plans will appear when treatment records are connected."
              : "Your Collective visits and shared care notes, together. A familiar ritual is one step closer."}
          </p>
        </div>
        <div className="provider-care-grid">
          <div className="provider-glass">
            <p className="provider-kicker">
              {recovery ? "FROM CAMILLA" : "YOUR COLLECTIVE VISITS"}
            </p>
            {recovery ? (
              <>
                <h3>Your recovery story starts here.</h3>
                <p>
                  No Recovery Room sessions or approved home-care plans are
                  available yet. Stretching instructions and progress tracking
                  will only appear with Camilla’s guidance.
                </p>
              </>
            ) : next ? (
              <AppointmentCard appointment={next} />
            ) : (
              <>
                <h3>
                  {user
                    ? "Time for a fresh start."
                    : "Your next visit, within reach."}
                </h3>
                <p>
                  {user
                    ? "No upcoming Collective visit is booked."
                    : persistence
                      ? "Sign in to see appointments, revisit your preferences and find your next time."
                      : "Accounts and booking are not active on this hosted preview. Prepare and download your consultation brief to keep your preferences."}
                </p>
              </>
            )}
            {!recovery && (
              <Link
                className="provider-link"
                href={
                  last
                    ? `/book?service=${last.service_id}&professional=${last.professional_id}&experience=katie`
                    : persistence
                      ? "/account"
                      : "#profile"
                }
              >
                {last
                  ? "Rebook your last Collective service"
                  : persistence
                    ? "Open your Collective account"
                    : "Prepare your consultation"}
                <ArrowUpRight size={17} />
              </Link>
            )}
            {recovery && (
              <Link
                className="provider-link"
                href={persistence ? "/account" : "#intake"}
              >
                {persistence
                  ? "View your Collective account"
                  : "Revisit your session brief"}
                <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
          <div className="provider-glass">
            <p className="provider-kicker">
              {recovery ? "A MOMENT TO PREPARE" : "FROM YOUR PROFESSIONAL"}
            </p>
            {recovery ? (
              <>
                <h3>Your comfort stays in your hands.</h3>
                <p>
                  Bring your questions and tell Camilla what you’d like to
                  discuss before a session. You can ask to adjust pressure,
                  change focus or pause at any time.
                </p>
                <a className="provider-link" href="#intake">
                  Revisit your preferences
                  <ArrowUpRight size={17} />
                </a>
              </>
            ) : notes.length ? (
              notes.map((n) => <p key={n.id}>{n.body}</p>)
            ) : (
              <>
                <h3>Advice, made personal.</h3>
                <p>
                  Your professional’s shared Collective care notes will appear
                  here. Build your routine brief above to discuss products,
                  technique and maintenance together.
                </p>
                <a className="provider-link" href="#profile">
                  Refine your routine
                  <ArrowUpRight size={17} />
                </a>
              </>
            )}
          </div>
        </div>
      </section>
      {!recovery && (
        <section className="provider-section provider-editorial">
          <div>
            <Scissors size={28} />
            <p className="provider-kicker">THE DETAILS MAKE THE DIFFERENCE</p>
            <h2>
              A transformation.
              <br />
              <em>With your name on it.</em>
            </h2>
          </div>
          <div>
            <h3>The studio lookbook</h3>
            <p>
              Katie’s approved before-and-after work will live here. Client
              photography will only be published with permission.
            </p>
            <p>
              Until then, bring a reference and use your consultation brief to
              describe the shape, texture and finish you want.
            </p>
            <a href="#profile" className="provider-link">
              Prepare your reference
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
      )}
      <section
        id={recovery ? "extras" : "wellness"}
        className="provider-section provider-wing"
      >
        <div>
          <p className="provider-kicker">
            04 / {recovery ? "BEYOND THE ROOM" : "THE WELLNESS WING"}
          </p>
          <h2>
            {recovery ? (
              <>
                Good care.
                <br />
                <em>Connected.</em>
              </>
            ) : (
              <>
                Look sharper.
                <br />
                <em>Feel more like you.</em>
              </>
            )}
          </h2>
          <p>
            {recovery
              ? "Different kinds of support, connected through the Collective. Explore the next step at your own pace."
              : "Confidence is bigger than a haircut. Make space for scalp and hair questions, recovery and qualified support beyond the chair."}
          </p>
        </div>
        <div className="provider-wing-links">
          <Link href={recovery ? "/grooming" : "/men"}>
            <span>
              {recovery ? "Katie’s Studio" : "Men’s wellness resources"}
              <small>
                {recovery
                  ? "Grooming, confidence and personal ritual"
                  : "Public directories for qualified care and support"}
              </small>
            </span>
            <MoveUpRight size={22} />
          </Link>
          <Link href={recovery ? "/men" : "/recovery"}>
            <span>
              {recovery
                ? "Wellness beyond the studio"
                : "Recovery Room by Milla"}
              <small>
                {recovery
                  ? "Explore the Collective’s men’s wellness network"
                  : "Step into Camilla’s environment"}
              </small>
            </span>
            <MoveUpRight size={22} />
          </Link>
          <a href={recovery ? "#intake" : "#profile"}>
            <span>
              {recovery
                ? "Prepare for your conversation"
                : "Scalp & hair conversation"}
              <small>
                {recovery
                  ? "Your priorities, preferences and questions"
                  : "Bring your questions; grooming is not medical care"}
              </small>
            </span>
            <MoveUpRight size={22} />
          </a>
        </div>
      </section>
      <section className="provider-section provider-membership">
        <Sparkles size={24} />
        <div>
          <p className="provider-kicker">MORE WAYS TO MAKE TIME</p>
          <h3>
            {recovery
              ? "Give someone room to exhale."
              : "A ritual worth returning to."}
          </h3>
          <p>
            {recovery
              ? "Gift experiences, packages and memberships"
              : "Memberships, packages, loyalty and gift cards"}{" "}
            are not available to purchase yet. No deposits or payments are
            collected in this preview.
          </p>
        </div>
        <Link
          href={persistence ? "/account" : "/policies"}
          className="provider-link"
        >
          {persistence
            ? "Account & payment status"
            : "View preview visit policies"}
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="provider-return">
        <BrandEmblem brand={recovery ? "recovery" : "collective"} size={72} />
        <p>
          {recovery ? "Your pace. Your space." : "Your presence starts here."}
        </p>
        <Link href="/#experiences" className="provider-link">
          <ArrowLeft size={16} />
          Return to the Collective
        </Link>
      </div>
      <div className="provider-mobile-action">
        <a className="provider-button" href={recovery ? "#intake" : "#rituals"}>
          {recovery ? "Prepare your session" : "Book Your Chair"}
          <ArrowUpRight size={17} />
        </a>
      </div>
    </main>
  );
}
