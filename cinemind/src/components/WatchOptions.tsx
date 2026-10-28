import { regionName, type WatchOptions as Options } from "@/lib/movies/providers";
import { SmartImage } from "./SmartImage";

export function WatchOptions({ options }: { options: Options }) {
  return (
    <section className="watch-options" aria-labelledby="watch-heading">
      <h2 id="watch-heading">Where to watch in {regionName(options.region)}</h2>
      {options.groups.map((g) => (
        <div key={g.label} className="watch-group">
          <span className="watch-label">{g.label}</span>
          <ul className="watch-providers">
            {g.providers.map((p) => (
              <li key={p.id} title={p.name}>
                {p.logoUrl ? <SmartImage src={p.logoUrl} alt="" fallback={null} /> : null}
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="faint watch-credit">
        Availability from{" "}
        {options.link ? (
          <a href={options.link} target="_blank" rel="noopener noreferrer" className="link">
            JustWatch via TMDB
          </a>
        ) : (
          "JustWatch via TMDB"
        )}
        ; it may change.
      </p>
    </section>
  );
}
