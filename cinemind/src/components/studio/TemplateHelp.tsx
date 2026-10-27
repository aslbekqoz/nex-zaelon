export function TemplateHelp() {
  const rows: [string, string][] = [
    ["{{title}}", "Title (Uzbek title in Uzbek templates when available)"],
    ["{{original_title}}", "Original/English title when it differs"],
    ["{{year}} {{rating}} {{runtime}} {{genres}} {{director}}", "Movie details (respect Brand toggles)"],
    ["{{overview}} {{tagline}}", "Synopsis, or its first sentence"],
    ["{{trailer_url}} {{url}}", "YouTube trailer, movie page link (needs Site URL)"],
    ["{{signature}} {{hashtags}} {{brand}}", "From Brand settings"],
    ["{{week_range}}", "This week, e.g. 26-oktabr – 1-noyabr, 2026"],
    ["{{#movies}}…{{index}}…{{/movies}}", "Weekly: repeat for each movie"],
    ["{{#facts}}{{index}}. {{text}} {{source}}{{/facts}}", "Facts: repeat for each verified fact"],
    ["{{#x}}…{{/x}} / {{^x}}…{{/x}}", "Show only when x is present / missing"],
    ["**bold** _italic_", "Formatting"],
  ];
  return (
    <details className="card-panel help">
      <summary>Template syntax</summary>
      <dl className="facts">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt className="mono">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
