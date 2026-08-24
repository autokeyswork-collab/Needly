const prisma = require("./prisma");

function groupOrderItems(items = []) {
  const grouped = new Map();
  for (const item of items) {
    if (!item.productId) continue;
    grouped.set(item.productId, (grouped.get(item.productId) || 0) + Math.max(1, Number(item.qty) || 1));
  }
  return grouped;
}

async function reserveOrderInventory(orderId, txClient) {
  const db = txClient || prisma;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");
  if (!order.inventoryReleasedAt) return order;

  const grouped = groupOrderItems(order.items);
  for (const [productId, qty] of grouped.entries()) {
    const result = await db.product.updateMany({
      where: { id: productId, isAvailable: true, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (result.count !== 1) {
      const err = new Error("One or more products are no longer available in the requested quantity");
      err.statusCode = 409;
      throw err;
    }
  }

  return db.order.update({
    where: { id: orderId },
    data: { inventoryReleasedAt: null },
    include: { items: true },
  });
}

async function releaseOrderInventory(orderId, txClient) {
  const db = txClient || prisma;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.inventoryReleasedAt) return order;

  const grouped = groupOrderItems(order.items);
  for (const [productId, qty] of grouped.entries()) {
    await db.product.update({
      where: { id: productId },
      data: { stock: { increment: qty } },
    });
  }

  return db.order.update({
    where: { id: orderId },
    data: { inventoryReleasedAt: new Date() },
    include: { items: true },
  });
}

async function cleanupExpiredPendingOrders({ olderThanMinutes = Number(process.env.PENDING_ORDER_EXPIRE_MINUTES || 45), limit = 100 } = {}) {
  const cutoff = new Date(Date.now() - Math.max(5, Number(olderThanMinutes) || 45) * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      status: "PLACED",
      inventoryReleasedAt: null,
      createdAt: { lt: cutoff },
      OR: [
        { payment: null },
        { payment: { status: { in: ["PENDING", "FAILED"] } } },
      ],
    },
    include: { payment: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const order of orders) {
    await prisma.$transaction(async (tx) => {
      await releaseOrderInventory(order.id, tx);
      if (order.payment?.status === "PENDING") {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "FAILED" },
        });
      }
    });
  }

  return { released: orders.length, cutoff };
}

module.exports = { reserveOrderInventory, releaseOrderInventory, cleanupExpiredPendingOrders };
