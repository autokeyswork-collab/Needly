export const AUTO_PROVIDERS = [
  {
    id: "auto-1",
    name: "John Auto Care",
    area: "Panseke",
    rating: 4.7,
    distance: "2.4 km away",
    eta: "25-35 min",
    services: [
      { id: "oil-change", name: "Oil change", price: 8500, duration: "45 min" },
      { id: "brake-repair", name: "Brake repair inspection", price: 12000, duration: "1 hr" },
      { id: "engine-diagnostics", name: "Engine diagnostics", price: 15000, duration: "1 hr" },
      { id: "battery", name: "Battery replacement check", price: 6500, duration: "30 min" },
    ],
  },
  {
    id: "auto-2",
    name: "Kuto Mobile Mechanics",
    area: "Kuto",
    rating: 4.6,
    distance: "3.1 km away",
    eta: "30-45 min",
    services: [
      { id: "jump-start", name: "Jump start", price: 5000, duration: "25 min" },
      { id: "engine-diagnostics", name: "Engine diagnostics", price: 14000, duration: "1 hr" },
      { id: "tire-change", name: "Emergency tire change", price: 4500, duration: "25 min" },
    ],
  },
  {
    id: "auto-3",
    name: "Oke-Ilewo Wash & Wheels",
    area: "Oke-Ilewo",
    rating: 4.5,
    distance: "4.0 km away",
    eta: "20-30 min",
    services: [
      { id: "car-wash", name: "Premium car wash", price: 3500, duration: "35 min" },
      { id: "interior-detail", name: "Interior detailing", price: 9000, duration: "1 hr 30 min" },
      { id: "vulcanizer", name: "Vulcanizer visit", price: 4000, duration: "30 min" },
    ],
  },
];

export const SERVICE_CATEGORIES = {
  Auto: AUTO_PROVIDERS,
};
