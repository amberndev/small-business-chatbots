"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { filterProperties, isAvailable, isRental, priceLabel, type Property } from "@/content/properties";
import type { ChatbotClientConfig } from "@/lib/types";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { PropertyFilm } from "./PropertyFilm";

export function PropertyExplorer({ config }: { config: ChatbotClientConfig }) {
  const [mode, setMode] = useState<"Buy" | "Rent">("Buy");
  const [status, setStatus] = useState("All");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [beds, setBeds] = useState(0);
  const [selectedId, setSelectedId] = useState("HH-101");
  const [viewing, setViewing] = useState<Property | undefined>();
  useEffect(() => {
    if (!viewing) return;
    const frame = window.requestAnimationFrame(() => {
      const assistant = document.querySelector<HTMLElement>("#property-assistant .chat-widget");
      if (assistant) window.scrollTo({ top: Math.max(0, assistant.getBoundingClientRect().top + window.scrollY - 100), behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewing]);
  const invalid = minimum !== "" && maximum !== "" && Number(minimum) > Number(maximum);
  const results = invalid ? [] : filterProperties(mode, status, minimum === "" ? 0 : Number(minimum), maximum === "" ? Infinity : Number(maximum), beds);
  const selected = results.find(property => property.id === selectedId) ?? results[0];
  const available = results.filter(isAvailable);
  const average = available.length ? Math.round(available.reduce((sum, property) => sum + property.price, 0) / available.length) : null;
  function changeMode(next: "Buy" | "Rent") { setMode(next); setMinimum(""); setMaximum(""); }
  function requestViewing(property: Property) {
    setViewing(property);
    window.setTimeout(() => {
      const assistant = document.querySelector<HTMLElement>("#property-assistant .chat-widget");
      if (assistant) window.scrollTo({ top: Math.max(0, assistant.getBoundingClientRect().top + window.scrollY - 100), behavior: "auto" });
    }, 300);
  }
  return <><section className="property-explorer" aria-label="Fictional property catalogue">
    <div className="property-heading"><div><span className="eyebrow">HARBOR HOMES / NEIGHBOURHOOD COLLECTION</span><h2>A place to picture<br />your next chapter.</h2><p>Explore Riverside Gardens, a fictional neighbourhood in Example City.</p></div><span className="property-demo-label">DEMO COLLECTION<br /><small>Invented homes, prices and locations</small></span></div>
    <div className="property-filters"><div className="property-mode" aria-label="Transaction type">{(["Buy", "Rent"] as const).map(option => <button type="button" key={option} aria-pressed={mode === option} onClick={() => changeMode(option)}>{option}</button>)}</div>
      <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="All">All statuses</option><option value="Available">Available</option><option value="Closed">{mode === "Buy" ? "Sold" : "Rented"}</option></select></label>
      <label>Min price (USD{mode === "Rent" ? "/week" : ""})<input type="number" min="0" value={minimum} onChange={event => setMinimum(event.target.value)} placeholder="No minimum" /></label>
      <label>Max price (USD{mode === "Rent" ? "/week" : ""})<input type="number" min="0" value={maximum} onChange={event => setMaximum(event.target.value)} placeholder="No maximum" /></label>
      <label>Bedrooms<select value={beds} onChange={event => setBeds(Number(event.target.value))}><option value="0">Any bedrooms</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option></select></label>
    </div>
    {invalid && <p className="chat-error" role="alert">Minimum price must not exceed maximum price.</p>}
    <div className="property-results" aria-live="polite"><span>{results.length} homes in this selection</span><span>Average available {mode === "Rent" ? "rent" : "asking price"}: <strong>{average === null ? "No available homes" : `USD ${average.toLocaleString("en-US")}${mode === "Rent" ? " / week" : ""}`}</strong></span></div>
    <div className="property-layout"><div className="neighbourhood-map" role="group" aria-label="Illustrative map of Riverside Gardens">
      <svg viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true"><rect width="600" height="520" fill="#eeeade"/><path d="M530 0 Q450 170 560 280 T530 520" stroke="#bdd4da" strokeWidth="85" fill="none"/><rect x="225" y="48" width="180" height="120" rx="35" fill="#d0dbbd"/><rect x="35" y="278" width="90" height="190" rx="24" fill="#d0dbbd"/><path d="M0 230 L465 230 M110 0 L110 520 M0 370 L465 370 M300 170 L300 520 M430 0 L430 520" stroke="#d6cebc" strokeWidth="28" fill="none"/><path d="M0 230 L465 230 M110 0 L110 520 M0 370 L465 370 M300 170 L300 520 M430 0 L430 520" stroke="#fffdf6" strokeWidth="21" fill="none"/><g fill="#67665c" fontSize="11" fontFamily="Arial"><text x="253" y="107">RIVERSIDE GREEN</text><text x="152" y="225">WILLOW LANE</text><text x="148" y="365">CEDAR CLOSE</text><text x="444" y="160" transform="rotate(90 444 160)">RIVER WALK</text></g></svg>
      <span className="map-caption">RIVERSIDE GARDENS <small>Illustrative map · Not to scale</small></span><span className="map-north" aria-hidden="true">N ↑</span>
      {results.map(property => <button type="button" className={`property-pin ${!isAvailable(property) ? "closed" : ""}`} style={{ left: `${property.x}%`, top: `${property.y}%` }} key={property.id} aria-label={`${property.name}, ${property.status}, ${priceLabel(property)}`} aria-pressed={selected?.id === property.id} onClick={() => setSelectedId(property.id)}>{isAvailable(property) ? `${property.price >= 1000 ? `${Math.round(property.price / 1000)}k` : property.price}` : property.status}</button>)}
      <div className="map-key"><span>● Available</span><span>○ Sold / rented</span></div>
    </div><div className="property-list" aria-label="Matching properties">{results.length ? results.map(property => <button type="button" className="property-card" key={property.id} aria-pressed={selected?.id === property.id} onClick={() => setSelectedId(property.id)}><Image src={`/properties/${property.image}.jpg`} alt={`Illustrative home photograph for ${property.name}`} width={300} height={200} /><div><span className={`property-status ${!isAvailable(property) ? "closed" : ""}`}>{property.status}</span><h3>{property.name}</h3><p>{property.address}</p><strong>{priceLabel(property)}</strong><small>{property.beds} beds · {property.baths} baths · {property.area} m²</small></div></button>) : <div className="property-empty"><h3>No homes match these filters.</h3><p>Try a wider price range or fewer bedrooms.</p><button className="secondary-button" onClick={() => { setMinimum(""); setMaximum(""); setBeds(0); setStatus("All"); }}>Clear filters</button></div>}</div></div>
    {selected && <article className="property-detail" aria-label="Selected property"><PropertyFilm property={selected} /><div><span className="eyebrow">{selected.id} / {selected.status.toUpperCase()}</span><h3>{selected.name}</h3><p>{selected.description}</p><small>{selected.address}, Riverside Gardens · {isRental(selected) ? "Weekly rent" : "Illustrative asking price"}: {priceLabel(selected)}</small></div><button type="button" className="primary-button" disabled={!isAvailable(selected)} onClick={() => requestViewing(selected)}>{isAvailable(selected) ? "Request a demo viewing ↗" : `${selected.status} · Viewings unavailable`}</button></article>}
    <p className="property-footnote">All listings and prices are fictional. Photographs are illustrative stock images, not the listed homes. Averages include available homes matching your filters only; they are not market valuations.</p>
  </section><section className="property-conversation" id="property-assistant"><div><span className="eyebrow">YOUR NEXT STEP</span><h2>Found a possibility?<br />Let’s talk it through.</h2><p>Select a home above to prepare a simulated viewing, or explore buying and renting with the assistant.</p><div className="property-trust"><span>01 · Choose a home</span><span>02 · Pick a date and time</span><span>03 · Review your request</span></div><p className="demo-note">No real viewing is booked. Use fictional contact details only.</p></div><ChatWidget config={config} property={viewing} /></section></>;
}
