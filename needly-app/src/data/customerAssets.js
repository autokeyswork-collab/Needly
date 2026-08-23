export const CATEGORY_IMAGES = {
  Supermarket: require("../assets/marketplace/supermarket.jpg"),
  Restaurant: require("../assets/marketplace/restaurant.jpg"),
  "Home Services": require("../assets/marketplace/home-services.jpg"),
  Services: require("../assets/marketplace/home-services.jpg"),
  Auto: require("../assets/marketplace/auto.jpg"),
  Pharmacy: require("../assets/marketplace/pharmacy.jpg"),
  "Stay & Dine": require("../assets/marketplace/stay-dine.jpg"),
  Learn: require("../assets/marketplace/learn.jpg"),
  Utilities: require("../assets/marketplace/utilities.jpg"),
  "Local Market": require("../assets/marketplace/local-market.jpg"),
  "Open Market Hero": require("../assets/marketplace/open-market-abeokuta.png"),
  Grills: require("../assets/marketplace/grills.jpg"),
};

export const CATEGORY_AVATAR_IMAGES = {
  Auto: require("../assets/marketplace/auto-avatar.png"),
};

export const CUSTOMER_AVATAR = require("../assets/marketplace/customer.jpg");
export const LOGIN_AVATAR = require("../assets/marketplace/login-avatar-transparent-v2.png");
export const LOGIN_HERO_MARKET = require("../assets/marketplace/login-hero-market.png");
export const LOGIN_HERO_FOOD_CENTER = require("../assets/marketplace/abeokuta-food-center.png");
export const LOGIN_HERO_CLEANING_LADY = require("../assets/marketplace/abeokuta-cleaning-lady.png");
export const LOGIN_HERO_CAR_STAND = require("../assets/marketplace/abeokuta-car-stand.png");

export const LOGIN_HERO_SLIDES = [
  {
    key: "market",
    image: LOGIN_HERO_MARKET,
    location: "Abeokuta, Nigeria",
    title: "Support Local, Grow Local",
    text: "Shop quality products and services from trusted local sellers in Abeokuta.",
  },
  {
    key: "open-market",
    image: CATEGORY_IMAGES["Open Market Hero"],
    location: "Kuto Market, Abeokuta",
    title: "Fresh Market Finds",
    text: "Buy vegetables, tomatoes, peppers, fruits and daily essentials from nearby sellers.",
  },
  {
    key: "food",
    image: LOGIN_HERO_FOOD_CENTER,
    location: "Abeokuta Food Center",
    title: "Meals In Minutes",
    text: "Order favourite meals, grills and local dishes from trusted Abeokuta vendors.",
  },
  {
    key: "home-services",
    image: LOGIN_HERO_CLEANING_LADY,
    location: "Abeokuta Home Services",
    title: "Book Help Fast",
    text: "Find trusted cleaners, laundry, repairs and useful home services around Abeokuta.",
  },
  {
    key: "auto",
    image: LOGIN_HERO_CAR_STAND,
    location: "Abeokuta Car Stand",
    title: "Keep Moving",
    text: "Book mechanics, car wash, vulcanizers and rider support from local auto stands.",
  },
];
