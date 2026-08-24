const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

function publicCategory(category, includeChildren = false) {
  const payload = {
    id: category.id,
    parentId: category.parentId || null,
    divisionId: category.divisionId || (category.type === "DIVISION" ? category.id : null),
    key: category.key,
    label: category.label,
    name: category.label,
    slug: category.slug || category.key,
    flow: category.flow,
    type: category.type || "CATEGORY",
    description: category.description || "",
    icon: category.icon || "",
    image: category.image || "",
    imageKey: category.imageKey || category.key,
    bannerImage: category.bannerImage || "",
    position: category.position,
    active: category.active,
    isFeatured: category.isFeatured,
    showOnHomepage: category.showOnHomepage,
    location: category.location || "",
    customFields: category.customFields || [],
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
  if (includeChildren) {
    payload.children = (category.children || []).map((child) => publicCategory(child, true));
  }
  return payload;
}

function activeWhere(req) {
  const location = String(req.query.location || "").trim();
  return {
    active: true,
    deletedAt: null,
    ...(location ? {
      OR: [
        { location: null },
        { location: "" },
        { location: { equals: location, mode: "insensitive" } },
      ],
    } : {}),
  };
}

router.get("/divisions", async (req, res) => {
  const divisions = await prisma.category.findMany({
    where: { ...activeWhere(req), type: "DIVISION", parentId: null },
    orderBy: [{ position: "asc" }, { label: "asc" }],
    include: {
      children: {
        where: { active: true, deletedAt: null },
        orderBy: [{ position: "asc" }, { label: "asc" }],
      },
    },
  });
  res.json(divisions.map((division) => publicCategory(division, true)));
});

router.get("/categories", async (req, res) => {
  const { divisionId, parentId, featured, homepage } = req.query;
  const where = {
    ...activeWhere(req),
    ...(divisionId ? { divisionId: String(divisionId) } : {}),
    ...(parentId !== undefined ? { parentId: parentId ? String(parentId) : null } : {}),
    ...(featured !== undefined ? { isFeatured: String(featured).toLowerCase() === "true" } : {}),
    ...(homepage !== undefined ? { showOnHomepage: String(homepage).toLowerCase() === "true" } : {}),
  };
  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ position: "asc" }, { label: "asc" }],
    include: {
      children: {
        where: { active: true, deletedAt: null },
        orderBy: [{ position: "asc" }, { label: "asc" }],
      },
    },
    take: 1000,
  });
  res.json(categories.map((category) => publicCategory(category, true)));
});

router.get("/featured-categories", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { ...activeWhere(req), isFeatured: true, showOnHomepage: true },
    orderBy: [{ position: "asc" }, { label: "asc" }],
    take: 40,
  });
  res.json(categories.map((category) => publicCategory(category)));
});

router.get("/categories/:id", async (req, res) => {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id: req.params.id }, { slug: req.params.id }, { key: req.params.id }],
      deletedAt: null,
    },
    include: {
      parent: true,
      children: {
        where: { active: true, deletedAt: null },
        orderBy: [{ position: "asc" }, { label: "asc" }],
      },
    },
  });
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(publicCategory(category, true));
});

router.get("/categories/:id/children", async (req, res) => {
  const parent = await prisma.category.findFirst({
    where: { OR: [{ id: req.params.id }, { slug: req.params.id }, { key: req.params.id }], deletedAt: null },
    select: { id: true },
  });
  if (!parent) return res.status(404).json({ error: "Category not found" });
  const children = await prisma.category.findMany({
    where: { ...activeWhere(req), parentId: parent.id },
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });
  res.json(children.map((category) => publicCategory(category)));
});

module.exports = router;
