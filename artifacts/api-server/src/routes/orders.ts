import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable } from "../db";
import { auditLog } from "../lib/audit";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import {
  CreateOrderBody,
  UpdateOrderBody,
  GetOrderParams,
  UpdateOrderParams,
  DeleteOrderParams,
  ListOrdersQueryParams,
  ListOrdersResponse,
  GetOrderResponse,
  UpdateOrderResponse,
} from "../validation/api";

const router: IRouter = Router();

function safeJsonParse<T>(str: string | null | undefined): T | null {
  if (!str) return null;
  try { return JSON.parse(str) as T; } catch { return null; }
}

function toOrderItemDto(item: typeof orderItemsTable.$inferSelect) {
  return {
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    extras: safeJsonParse<Array<{ name: string; price: number }>>(item.extras),
    removedIngredients: safeJsonParse<string[]>(item.removedIngredients),
    itemNotes: item.itemNotes ?? null,
  };
}

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? null,
    status: order.status,
    total: Number(order.total),
    notes: order.notes ?? null,
    items: items.map(toOrderItemDto),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  try {
    const queryParams = ListOrdersQueryParams.safeParse(req.query);
    if (!queryParams.success) {
      res.status(400).json({ error: queryParams.error.message });
      return;
    }

    let query = db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).$dynamic();
    if (queryParams.data.status) query = query.where(eq(ordersTable.status, queryParams.data.status));
    if (queryParams.data.limit) query = query.limit(queryParams.data.limit);

    const orders = await query;

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
      items: (itemsByOrder.get(order.id) ?? []).map(toOrderItemDto),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    }));

    res.json(ListOrdersResponse.parse(ordersWithItems));
  } catch (err) {
    logger.error({ err }, "Erro ao listar pedidos");
    res.status(500).json({ error: "Erro interno ao listar pedidos" });
  }
});

router.post("/orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { customerName, customerPhone, notes, items } = parsed.data;
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const productIds = items.map((i) => i.productId);
    const [orderResult, products] = await Promise.all([
      db.insert(ordersTable)
        .values({ customerName, customerPhone: customerPhone ?? null, notes: notes ?? null, total: String(total), status: "pending" })
        .returning(),
      productIds.length > 0
        ? db.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, productIds))
        : Promise.resolve([]),
    ]);

    const [order] = orderResult;
    const productMap = new Map(products.map((p) => [p.id, p]));

    if (items.length > 0) {
      await db.insert(orderItemsTable).values(
        items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: productMap.get(item.productId)?.name ?? "Produto",
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.quantity * item.unitPrice),
          extras: item.extras ? JSON.stringify(item.extras) : null,
          removedIngredients: item.removedIngredients ? JSON.stringify(item.removedIngredients) : null,
          itemNotes: item.itemNotes ?? null,
        }))
      );
    }

    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "order", entityId: order.id, details: { customerName, total }, req });
    const orderWithItems = await getOrderWithItems(order.id);
    res.status(201).json(GetOrderResponse.parse(orderWithItems));
  } catch (err) {
    logger.error({ err }, "Erro ao criar pedido");
    res.status(500).json({ error: "Erro interno ao criar pedido" });
  }
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = GetOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const order = await getOrderWithItems(params.data.id);
    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }
    res.json(GetOrderResponse.parse(order));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar pedido");
    res.status(500).json({ error: "Erro interno ao buscar pedido" });
  }
});

router.patch("/orders/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = UpdateOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status != null) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;

    const [order] = await db
      .update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, params.data.id))
      .returning();

    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }

    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "order", entityId: order.id, details: updateData, req });
    const orderWithItems = await getOrderWithItems(order.id);
    res.json(UpdateOrderResponse.parse(orderWithItems));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar pedido");
    res.status(500).json({ error: "Erro interno ao atualizar pedido" });
  }
});

router.delete("/orders/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = DeleteOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, params.data.id));
    const [order] = await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id)).returning();

    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "order", entityId: params.data.id, req });
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir pedido");
    res.status(500).json({ error: "Erro interno ao excluir pedido" });
  }
});

export default router;
