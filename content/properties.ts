export type PropertyStatus = "For sale" | "For rent" | "Sold" | "Rented";
export type Property = { id: string; name: string; address: string; status: PropertyStatus; price: number; beds: number; baths: number; area: number; x: number; y: number; image: string; description: string };
export const properties: Property[] = [
  { id: "HH-101", name: "The Willow House", address: "12 Willow Lane", status: "For sale", price: 785000, beds: 3, baths: 2, area: 168, x: 25, y: 30, image: "willow", description: "A light-filled family home with a sheltered courtyard, open-plan living and room to grow." },
  { id: "HH-102", name: "Parkside Retreat", address: "8 Park Crescent", status: "For rent", price: 620, beds: 2, baths: 1, area: 94, x: 57, y: 25, image: "park", description: "An easy-care home beside the neighbourhood green, with a private terrace and a dedicated study nook." },
  { id: "HH-103", name: "Riverstone Residence", address: "24 River Walk", status: "For sale", price: 1120000, beds: 4, baths: 3, area: 242, x: 76, y: 58, image: "river", description: "Generous living spaces, a garden entertaining area and an upstairs retreat overlooking the river walk." },
  { id: "HH-104", name: "Cedar Cottage", address: "3 Cedar Close", status: "For rent", price: 480, beds: 2, baths: 1, area: 82, x: 28, y: 69, image: "cedar", description: "A compact cottage on a quiet street, with two bedrooms and a sunny, low-maintenance garden." },
  { id: "HH-105", name: "The Garden House", address: "16 Willow Lane", status: "Sold", price: 890000, beds: 3, baths: 2, area: 185, x: 39, y: 42, image: "park", description: "A completed fictional sale, retained in the catalogue to demonstrate the full property lifecycle." },
  { id: "HH-106", name: "Harbor Terrace", address: "9 River Walk", status: "Rented", price: 710, beds: 3, baths: 2, area: 126, x: 70, y: 79, image: "willow", description: "A completed fictional rental. Explore its details, but viewing requests are unavailable." },
];
export const isAvailable = (property: Property) => property.status === "For sale" || property.status === "For rent";
export const isRental = (property: Property) => property.status === "For rent" || property.status === "Rented";
export const priceLabel = (property: Property) => `USD ${property.price.toLocaleString("en-US")}${isRental(property) ? " / week" : ""}`;
export function filterProperties(mode: "Buy" | "Rent", status: string, min: number, max: number, beds: number) {
  return properties.filter(property => isRental(property) === (mode === "Rent") && (status === "All" || (status === "Available" ? isAvailable(property) : !isAvailable(property))) && property.price >= min && property.price <= max && property.beds >= beds);
}
