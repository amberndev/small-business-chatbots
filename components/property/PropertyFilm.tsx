import type { Property } from "@/content/properties";

export function PropertyFilm({ property }: { property: Property }) {
  return <figure className="property-film"><video autoPlay muted loop playsInline preload="metadata" poster={`/properties/${property.image}.jpg`} aria-label={`Illustrative video preview of ${property.name}`}><source src={`/properties/${property.image}.mp4`} type="video/mp4" /></video><figcaption><span>PROPERTY FILM</span><small>Illustrative preview · {property.name}</small></figcaption></figure>;
}
