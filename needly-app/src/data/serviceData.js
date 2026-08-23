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

export const HOME_SERVICE_PROVIDERS = [
  {
    id: "home-1",
    name: "Abeokuta Sparkle Cleaning",
    area: "Ibara",
    rating: 4.8,
    distance: "2.1 km away",
    eta: "45-60 min",
    services: [
      { id: "home-cleaning", name: "Home cleaning visit", price: 9000, duration: "2 hrs" },
      { id: "deep-cleaning", name: "Deep cleaning", price: 18000, duration: "4 hrs" },
      { id: "office-cleaning", name: "Small office cleaning", price: 14000, duration: "3 hrs" },
    ],
  },
  {
    id: "home-2",
    name: "Kuto Laundry & Ironing",
    area: "Kuto",
    rating: 4.6,
    distance: "2.8 km away",
    eta: "Same day",
    services: [
      { id: "laundry-bag", name: "Laundry bag wash & fold", price: 6500, duration: "Same day" },
      { id: "ironing", name: "Ironing service", price: 3000, duration: "4 hrs" },
      { id: "pickup-laundry", name: "Pickup laundry service", price: 8500, duration: "Same day" },
    ],
  },
  {
    id: "home-3",
    name: "Panseke Repairs Hub",
    area: "Panseke",
    rating: 4.5,
    distance: "3.5 km away",
    eta: "35-50 min",
    services: [
      { id: "plumbing", name: "Plumbing visit", price: 10000, duration: "1 hr" },
      { id: "electrical", name: "Electrical repair visit", price: 12000, duration: "1 hr" },
      { id: "minor-carpentry", name: "Minor carpentry repair", price: 11000, duration: "1 hr 30 min" },
    ],
  },
];

export const LEARN_PROVIDERS = [
  {
    id: "learn-1",
    name: "Abeokuta Home Tutors",
    area: "Oke-Ilewo",
    rating: 4.7,
    distance: "3.0 km away",
    eta: "By schedule",
    services: [
      { id: "math-tutor", name: "Mathematics tutor", price: 7000, duration: "1 hr" },
      { id: "english-tutor", name: "English tutor", price: 6500, duration: "1 hr" },
      { id: "exam-prep", name: "WAEC/JAMB prep session", price: 9000, duration: "1 hr 30 min" },
    ],
  },
];

export const UTILITY_PROVIDERS = [
  {
    id: "utility-1",
    name: "Needly Gas & Water",
    area: "Asero",
    rating: 4.6,
    distance: "4.2 km away",
    eta: "30-45 min",
    services: [
      { id: "gas-refill", name: "Cooking gas refill pickup", price: 2500, duration: "Pickup fee" },
      { id: "water-delivery", name: "Water delivery", price: 3500, duration: "45 min" },
      { id: "utility-run", name: "Utility errand", price: 3000, duration: "1 hr" },
    ],
  },
];

export const ALL_SERVICE_PROVIDERS = [
  ...AUTO_PROVIDERS.map((provider) => ({ ...provider, category: "Auto" })),
  ...HOME_SERVICE_PROVIDERS.map((provider) => ({ ...provider, category: "Home Services" })),
  ...LEARN_PROVIDERS.map((provider) => ({ ...provider, category: "Learn" })),
  ...UTILITY_PROVIDERS.map((provider) => ({ ...provider, category: "Utilities" })),
];

export const SERVICE_CATEGORIES = {
  Auto: AUTO_PROVIDERS,
  "Home Services": HOME_SERVICE_PROVIDERS,
  Learn: LEARN_PROVIDERS,
  Utilities: UTILITY_PROVIDERS,
  Services: ALL_SERVICE_PROVIDERS,
};
