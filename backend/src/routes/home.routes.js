const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

function publicBanner(promotion) {
  return {
    id: promotion.id,
    code: promotion.code,
    kicker: promotion.bannerKicker || promotion.title,
    title: promotion.bannerTitle || promotion.title,
    body: promotion.bannerBody || "",
    cta: promotion.bannerCta || "Shop Now",
    badge: promotion.bannerBadge || "",
    imageUrl: promotion.bannerImageUrl || "",
    category: promotion.destinationCategory || "Local Market",
    location: promotion.location || "",
    displayOrder: promotion.displayOrder || 0,
    endDate: promotion.endDate,
  };
}

router.get("/banners", async (req, res) => {
  const now = new Date();
  const location = String(req.query.location || "").trim();
  const where = {
    active: true,
    placement: "HOMEPAGE_CAROUSEL",
    startDate: { lte: now },
    OR: [{ endDate: null }, { endDate: { gt: now } }],
  };

  if (location) {
    where.AND = [
      {
        OR: [
          { location: null },
          { location: "" },
          { location: { equals: location, mode: "insensitive" } },
        ],
      },
    ];
  }

  try {
    const banners = await prisma.promotion.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    });
    res.json(banners.map(publicBanner));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load homepage banners" });
  }
});

module.exports = router;
