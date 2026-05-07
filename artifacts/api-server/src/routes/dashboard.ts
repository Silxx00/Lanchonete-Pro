import { Router, type IRouter } from "express";
import { eq, and, gte, lte, count, sum, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, promotionsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetSalesChartResponse,
  GetTopProductsResponse,
  GetRecentOrdersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, todayStart));

  const [monthOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, monthStart));

  const [pendingOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));

  const [todayRevenueResult] = await db
    .select({ total: sum(ordersTable.total) })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, todayStart),
        eq(ordersTable.status, "delivered")
      )
    );

  const [monthRevenueResult] = await db
    .select({ total: sum(ordersTable.total) })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, monthStart),
        eq(ordersTable.status, "delivered")
      )
    );

  const [activeProductsResult] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(eq(productsTable.active, true));

  const [totalProductsResult] = await db
    .select({ count: count() })
    .from(productsTable);

  const [activePromotionsResult] = await db
    .select({ count: count() })
    .from(promotionsTable)
    .where(eq(promotionsTable.active, true));

  const stats = GetDashboardStatsResponse.parse({
    todayRevenue: Number(todayRevenueResult?.total ?? 0),
    monthRevenue: Number(monthRevenueResult?.total ?? 0),
    todayOrders: todayOrdersResult?.count ?? 0,
    monthOrders: monthOrdersResult?.count ?? 0,
    pendingOrders: pendingOrdersResult?.count ?? 0,
    activeProducts: activeProductsResult?.count ?? 0,
    totalProducts: totalProductsResult?.count ?? 0,
    activePromotions: activePromotionsResult?.count ?? 0,
  });

  res.json(stats);
});

router.get("/dashboard/sales-chart", async (_req, res): Promise<void> => {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const results = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [revenueResult] = await db
      .select({ total: sum(ordersTable.total) })
      .from(ordersTable)
      .where(
        and(
          gte(ordersTable.createdAt, dayStart),
          lte(ordersTable.createdAt, dayEnd),
          eq(ordersTable.status, "delivered")
        )
      );

    const [ordersResult] = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(
        and(
          gte(ordersTable.createdAt, dayStart),
          lte(ordersTable.createdAt, dayEnd)
        )
      );

    results.push({
      label: days[date.getDay()],
      revenue: Number(revenueResult?.total ?? 0),
      orders: ordersResult?.count ?? 0,
    });
  }

  res.json(GetSalesChartResponse.parse(results));
});

router.get("/dashboard/top-products", async (_req, res): Promise<void> => {
  const topItems = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      totalSold: sum(orderItemsTable.quantity),
      revenue: sum(orderItemsTable.totalPrice),
    })
    .from(orderItemsTable)
    .groupBy(orderItemsTable.productId, orderItemsTable.productName)
    .orderBy(desc(sum(orderItemsTable.quantity)))
    .limit(5);

  const result = await Promise.all(
    topItems.map(async (item) => {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, item.productId));
      return {
        id: item.productId,
        name: item.productName,
        imageUrl: product?.imageUrl ?? null,
        totalSold: Number(item.totalSold ?? 0),
        revenue: Number(item.revenue ?? 0),
      };
    })
  );

  res.json(GetTopProductsResponse.parse(result));
});

router.get("/dashboard/recent-orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));
      return {
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? null,
        status: order.status,
        total: Number(order.total),
        notes: order.notes ?? null,
        items: items.map((item) => ({
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
      };
    })
  );

  res.json(GetRecentOrdersResponse.parse(ordersWithItems));
});

export default router;
