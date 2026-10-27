import { backdropImage } from "@/lib/movies/images";
import { SmartImage } from "./SmartImage";

/** Full-bleed hero background; the gradient overlay comes from .hero-bg::after. */
export function Backdrop({ url, fallbackStyle }: { url: string | null; fallbackStyle: React.CSSProperties }) {
  return (
    <div className="hero-bg" style={url ? undefined : fallbackStyle}>
      {url ? <SmartImage {...backdropImage(url)} alt="" className="hero-img" eager fallback={<div className="hero-img" style={fallbackStyle} />} /> : null}
    </div>
  );
}
