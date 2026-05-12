import { Router, type IRouter } from "express";
import { eq, and, gte, lte, count, sum, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, promotionsTable, combosTable } from "../db";
import { inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import {
  GetDashboardStatsResponse,
  GetSalesChartResponse,
  GetTopProductsResponse,
  GetRecentOrdersResponse,
} from "../validation/api";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayOrdersResult,
      monthOrdersResult,
      pendingOrdersResult,
      todayRevenueResult,
      monthRevenueResult,
      activeProductsResult,
      totalProductsResult,
      activePromotionsResult,
      activeCombosResult,
      totalCombosResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(ordersTable).where(gte(ordersTable.createdAt, todayStart)).then((r) => r[0]),
      db.select({ count: count() }).from(ordersTable).where(gte(ordersTable.createdAt, monthStart)).then((r) => r[0]),
      db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending")).then((r) => r[0]),
      db.select({ total: sum(ordersTable.total) }).from(ordersTable).where(and(gte(ordersTable.createdAt, todayStart), eq(ordersTable.status, "delivered"))).then((r) => r[0]),
      db.select({ total: sum(ordersTable.total) }).from(ordersTable).where(and(gte(ordersTable.createdAt, monthStart), eq(ordersTable.status, "delivered"))).then((r) => r[0]),
      db.select({ count: count() }).from(productsTable).where(eq(productsTable.active, true)).then((r) => r[0]),
      db.select({ count: count() }).from(productsTable).then((r) => r[0]),
      db.select({ count: count() }).from(promotionsTable).where(eq(promotionsTable.active, true)).then((r) => r[0]),
      db.select({ count: count() }).from(combosTable).where(eq(combosTable.active, true)).then((r) => r[0]),
      db.select({ count: count() }).from(combosTable).then((r) => r[0]),
    ]);

    res.json(GetDashboardStatsResponse.parse({
      todayRevenue: Number(todayRevenueResult?.total ?? 0),
      monthRevenue: Number(monthRevenueResult?.total ?? 0),
      todayOrders: todayOrdersResult?.count ?? 0,
      monthOrders: monthOrdersResult?.count ?? 0,
      pendingOrders: pendingOrdersResult?.count ?? 0,
      activeProducts: activeProductsResult?.count ?? 0,
      totalProducts: totalProductsResult?.count ?? 0,
      activePromotions: activePromotionsResult?.count ?? 0,
      activeCombos: activeCombosResult?.count ?? 0,
      totalCombos: totalCombosResult?.count ?? 0,
    }));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar estatísticas do dashboard");
    res.status(500).json({ error: "Erro interno ao buscar estatísticas" });
  }
});

router.get("/dashboard/sales-chart", requireAuth, async (_req, res): Promise<void> => {
  try {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const dateRanges = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      return { date, dayStart, dayEnd };
    });

    const results = await Promise.all(
      dateRanges.map(async ({ date, dayStart, dayEnd }) => {
        const [revenueResult, ordersResult] = await Promise.all([
          db.select({ total: sum(ordersTable.total) }).from(ordersTable).where(and(gte(ordersTable.createdAt, dayStart), lte(ordersTable.createdAt, dayEnd), eq(ordersTable.status, "delivered"))).then((r) => r[0]),
          db.select({ count: count() }).from(ordersTable).where(and(gte(ordersTable.createdAt, dayStart), lte(ordersTable.createdAt, dayEnd))).then((r) => r[0]),
        ]);
        return {
          label: days[date.getDay()],
          revenue: Number(revenueResult?.total ?? 0),
          orders: ordersResult?.count ?? 0,
        };
      })
    );

    res.json(GetSalesChartResponse.parse(results));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar gráfico de vendas");
    res.status(500).json({ error: "Erro interno ao buscar gráfico de vendas" });
  }
});

router.get("/dashboard/top-products", requireAuth, async (_req, res): Promise<void> => {
  try {
    const topItems = await db
      .select({
        productId: orderItemsTable.productId,
        productName: orderItemsTable.productName,
        totalSold: sum(orderItemsTable.quantity),
        revenue: sum(orderItemsTable.totalPrice),
        imageUrl: productsTable.imageUrl,
      })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .groupBy(orderItemsTable.productId, orderItemsTable.productName, productsTable.imageUrl)
      .orderBy(desc(sum(orderItemsTable.quantity)))
      .limit(5);

    const result = topItems.map((item) => ({
      id: item.productId,
      name: item.productName,
      imageUrl: item.imageUrl ?? null,
      totalSold: Number(item.totalSold ?? 0),
      revenue: Number(item.revenue ?? 0),
    }));

    res.json(GetTopProductsResponse.parse(result));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar produtos mais vendidos");
    res.status(500).json({ error: "Erro interno ao buscar produtos mais vendidos" });
  }
});

router.get("/dashboard/recent-orders", requireAuth, async (_req, res): Promise<void> => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10);

    const orderIds = orders.map((o) => o.id);
    const allItems = orderIds.length > 0
      ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const ordersWithItems = orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? null,
      status: order.status,
      total: Number(order.total),
      notes: order.notes ?? null,
      items: (itemsByOrder.get(order.id) ?? []).map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }));

    res.json(GetRecentOrdersResponse.parse(ordersWithItems));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar pedidos recentes");
    res.status(500).json({ error: "Erro interno ao buscar pedidos recentes" });
  }
});

export default router;
