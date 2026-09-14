import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
const worlds = [
  {
    name: "Fix It Shop",
    word: "CONFIDENCE",
    owner: "KATIE’S MEN’S SALON",
    href: "/grooming",
    image: "confidence",
    portrait: "katie",
    description:
      "Personal style. A sharper presence. The confidence to show up as yourself.",
  },
  {
    name: "Casa Valora",
    word: "RESTORE",
    owner: "KAMILLA’S MASSAGE & WELLNESS",
    href: "/recovery",
    image: "restore",
    portrait: "kamilla",
    description:
      "Professional massage, recovery and a little room to return to yourself.",
  },
  {
    name: "Legacy Sanctum",
    word: "BUILD",
    owner: "NEIL’S PERSONAL CARE & PRODUCTS",
    href: "/legacy",
    image: "build",
    portrait: "neil-tan-v3",
    description:
      "Personal guidance. Everyday care. Products and rituals to carry your confidence forward.",
  },
];
export function ExperienceWorlds() {
  return (
    <div className="sanctum-portals">
      {worlds.map((world, index) => (
        <Link
          className={`sanctum-portal portal-${world.image}`}
          href={world.href}
          key={world.name}
        >
          <div className="portal-image">
            <Image
              src={`/sanctum/people-v2/${world.portrait}.webp`}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 33vw"
            />
            <span className="portal-number">
              0{index + 1} / {world.word}
            </span>
          </div>
          <div className="portal-copy">
            <p className="eyebrow">{world.owner}</p>
            <h3>{world.name}</h3>
            <p>{world.description}</p>
            <span className="portal-link">
              Explore {world.name}
              <ArrowUpRight size={18} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
