import { MapPin, Crown, ShoppingBag, Sparkles } from "lucide-react";

/** Read-only, stylized renderings of entities matching the public site's visual
 * language. Used both for the standalone "Preview" action on each admin list
 * and as the live preview pane inside Cities/Artifacts/Gallery/Homepage
 * editors, so what an admin sees while editing is what players will see. */

const RARITY_COLORS: Record<string, string> = {
  legendary: "#B8892B",
  rare: "#6B8CA3",
  common: "#5C4E38",
};

export function CityPreview({
  city,
}: {
  city: {
    name: string;
    historical_period: string;
    description: string;
    significance?: string | null;
    population_estimate?: string | null;
    historical_facts?: string[] | null;
    trade_info?: string | null;
    image_url?: string | null;
  };
}) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: "#EDE1C4", borderColor: "rgba(59,42,19,0.08)" }}>
      <div
        className="relative h-32 flex flex-col justify-end p-4"
        style={{
          background: city.image_url
            ? `linear-gradient(135deg, rgba(230,216,184,0.4), rgba(230,216,184,0.9)), url(${city.image_url}) center/cover`
            : "linear-gradient(135deg, #DCCBA0 0%, #EDE1C4 60%)",
        }}
      >
        <div
          className="inline-block mb-1.5 px-2 py-0.5 rounded text-[9px] font-semibold tracking-widest self-start"
          style={{ background: "rgba(184,137,43,0.15)", color: "#B8892B", border: "1px solid rgba(184,137,43,0.3)" }}
        >
          GOLDEN HORDE CITY
        </div>
        <h3 className="orda-cinzel text-xl font-bold" style={{ color: "#2E2013" }}>
          {city.name || "Untitled city"}
        </h3>
        <p className="text-xs italic" style={{ color: "#B8892B" }}>
          {city.historical_period || "—"}
        </p>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: "#5C4E38" }}>
          {city.description || "No description yet."}
        </p>
        {city.significance && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "rgba(184,137,43,0.05)", border: "1px solid rgba(184,137,43,0.1)" }}>
            <Crown size={13} color="#B8892B" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs italic" style={{ color: "#2E2013" }}>{city.significance}</p>
          </div>
        )}
        {city.historical_facts && city.historical_facts.length > 0 && (
          <ul className="space-y-1.5">
            {city.historical_facts.slice(0, 3).map((fact, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#5C4E38" }}>
                <span className="flex-shrink-0" style={{ color: "#B8892B" }}>•</span>
                {fact}
              </li>
            ))}
          </ul>
        )}
        {city.trade_info && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "rgba(107,140,163,0.05)", border: "1px solid rgba(107,140,163,0.1)" }}>
            <ShoppingBag size={13} color="#6B8CA3" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs" style={{ color: "#5C4E38" }}>{city.trade_info}</p>
          </div>
        )}
        {city.population_estimate && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5C4E38" }}>
            <MapPin size={11} color="#B8892B" /> Population: {city.population_estimate}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArtifactPreview({
  artifact,
}: {
  artifact: { name: string; description: string; era: string; rarity: string; historical_context?: string | null; image_url?: string | null };
}) {
  const rarityColor = RARITY_COLORS[artifact.rarity?.toLowerCase()] || RARITY_COLORS.common;
  return (
    <div className="rounded-2xl p-5 border" style={{ background: "rgba(241,233,210,0.6)", borderColor: "rgba(59,42,19,0.08)" }}>
      <div
        className="aspect-square rounded-xl flex items-center justify-center mb-4 relative overflow-hidden"
        style={{ background: "rgba(230,216,184,0.5)", border: "1px solid rgba(59,42,19,0.06)" }}
      >
        {artifact.image_url ? (
          <img src={artifact.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Sparkles size={32} color={rarityColor} opacity={0.5} />
        )}
      </div>
      <span
        className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold tracking-widest mb-2"
        style={{ color: rarityColor, borderColor: rarityColor + "40", background: rarityColor + "15", border: "1px solid" }}
      >
        {(artifact.rarity || "common").toUpperCase()}
      </span>
      <h3 className="orda-cinzel text-sm font-semibold mb-1" style={{ color: "#2E2013" }}>
        {artifact.name || "Untitled artifact"}
      </h3>
      <p className="text-[11px] mb-2" style={{ color: "#B8892B" }}>{artifact.era}</p>
      <p className="text-xs leading-relaxed" style={{ color: "#5C4E38" }}>{artifact.description}</p>
      {artifact.historical_context && (
        <p className="text-[11px] mt-2 pt-2 border-t italic" style={{ color: "#5C4E38", borderColor: "rgba(59,42,19,0.06)" }}>
          {artifact.historical_context}
        </p>
      )}
    </div>
  );
}

export function GalleryImagePreview({
  image,
}: {
  image: { title?: string | null; alt_text?: string | null; image_url: string };
}) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(59,42,19,0.08)" }}>
      <div className="aspect-[4/3] relative" style={{ background: "#0a0a0a" }}>
        {image.image_url && <img src={image.image_url} alt={image.alt_text || ""} className="w-full h-full object-cover" />}
        {image.title && (
          <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: "linear-gradient(0deg, rgba(230,216,184,0.9), transparent)" }}>
            <span className="text-xs orda-cinzel" style={{ color: "#2E2013" }}>{image.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function HomepageSectionPreview({
  section,
}: {
  section: { section: string; title?: string | null; body?: string | null; image_url?: string | null; cta_text?: string | null };
}) {
  if (section.section === "stats") {
    return (
      <div className="rounded-2xl p-6 text-center border" style={{ background: "#DCCBA0", borderColor: "rgba(59,42,19,0.06)" }}>
        <div className="orda-cinzel text-3xl font-black" style={{ color: "#B8892B" }}>{section.title || "0"}+</div>
        <div className="text-xs mt-1" style={{ color: "#5C4E38" }}>{section.body || "Label"}</div>
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{
        background: section.image_url
          ? `linear-gradient(135deg, rgba(230,216,184,0.5), rgba(230,216,184,0.9)), url(${section.image_url}) center/cover`
          : "#E6D8B8",
        borderColor: "rgba(59,42,19,0.08)",
      }}
    >
      {section.title && <h3 className="orda-cinzel text-lg font-bold mb-2" style={{ color: "#2E2013" }}>{section.title}</h3>}
      {section.body && <p className="text-xs leading-relaxed" style={{ color: "#5C4E38" }}>{section.body}</p>}
      {section.cta_text && (
        <span className="inline-block mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "linear-gradient(135deg,#B8892B,#8C6239)", color: "#EDE1C4" }}>
          {section.cta_text}
        </span>
      )}
    </div>
  );
}
