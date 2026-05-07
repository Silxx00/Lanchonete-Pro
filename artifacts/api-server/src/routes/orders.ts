import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
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
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

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
}

router.get("/orders", async (req, res): Promise<void> => {
  const queryParams = ListOrdersQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  let query = db
    .select()
    .from(ordersTable)
    .orderBy(ordersTable.createdAt)
    .$dynamic();

  if (queryParams.data.status) {
    query = query.where(eq(ordersTable.status, queryParams.data.status));
  }

  if (queryParams.data.limit) {
    query = query.limit(queryParams.data.limit);
  }

  const orders = await query;

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

  res.json(ListOrdersResponse.parse(ordersWithItems));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, customerPhone, notes, items } = parsed.data;

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerName,
      customerPhone: customerPhone ?? null,
      notes: notes ?? null,
      total: String(total),
      status: "pending",
    })
    .returning();

  for (const item of items) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, item.productId));
    const productName = product?.name ?? "Produto";
    const totalPrice = item.quantity * item.unitPrice;
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: item.productId,
      productName,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      totalPrice: String(totalPrice),
    });
  }

  const orderWithItems = await getOrderWithItems(order.id);
  res.status(201).json(GetOrderResponse.parse(orderWithItems));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
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
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
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

  const orderWithItems = await getOrderWithItems(order.id);
  res.json(UpdateOrderResponse.parse(orderWithItems));
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, params.data.id));
  const [order] = await db
    .delete(ordersTable)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
