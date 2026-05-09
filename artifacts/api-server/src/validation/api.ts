import * as zod from "zod";

export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

export const LoginBody = zod.object({
  email: zod.string(),
  password: zod.string(),
});

export const LoginResponse = zod.object({
  accessToken: zod.string(),
  refreshToken: zod.string(),
  user: zod.object({
    id: zod.number(),
    name: zod.string(),
    email: zod.string(),
    role: zod.string(),
    active: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
  }),
});

export const LogoutResponse = zod.object({
  message: zod.string(),
});

export const RefreshTokenBody = zod.object({
  refreshToken: zod.string(),
});

export const RefreshTokenResponse = zod.object({
  accessToken: zod.string(),
});

export const GetMeResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.string(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const ListUsersResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.string(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const ListUsersResponse = zod.array(ListUsersResponseItem);

export const CreateUserBody = zod.object({
  name: zod.string(),
  email: zod.string(),
  password: zod.string(),
  role: zod.string(),
});

export const GetUserParams = zod.object({
  id: zod.coerce.number(),
});

export const GetUserResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.string(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const UpdateUserParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdateUserBody = zod.object({
  name: zod.string().nullish(),
  email: zod.string().nullish(),
  role: zod.string().nullish(),
  active: zod.boolean().nullish(),
});

export const UpdateUserResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.string(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const DeleteUserParams = zod.object({
  id: zod.coerce.number(),
});

export const ListCategoriesResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  imageUrl: zod.string().nullish(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const ListCategoriesResponse = zod.array(ListCategoriesResponseItem);

export const CreateCategoryBody = zod.object({
  name: zod.string(),
  description: zod.string().nullish(),
  imageUrl: zod.string().nullish(),
  active: zod.boolean().optional(),
});

export const GetCategoryParams = zod.object({
  id: zod.coerce.number(),
});

export const GetCategoryResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  imageUrl: zod.string().nullish(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const UpdateCategoryParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdateCategoryBody = zod.object({
  name: zod.string().nullish(),
  description: zod.string().nullish(),
  imageUrl: zod.string().nullish(),
  active: zod.boolean().nullish(),
});

export const UpdateCategoryResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  imageUrl: zod.string().nullish(),
  active: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const DeleteCategoryParams = zod.object({
  id: zod.coerce.number(),
});

export const ListProductsQueryParams = zod.object({
  categoryId: zod.coerce.number().nullish(),
  search: zod.coerce.string().nullish(),
  active: zod.coerce.string().nullish(),
});

export const ListProductsResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  price: zod.number(),
  imageUrl: zod.string().nullish(),
  categoryId: zod.number().nullish(),
  categoryName: zod.string().nullish(),
  stock: zod.number(),
  active: zod.boolean(),
  featured: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const ListProductsResponse = zod.array(ListProductsResponseItem);

export const CreateProductBody = zod.object({
  name: zod.string(),
  description: zod.string().nullish(),
  price: zod.number(),
  imageUrl: zod.string().nullish(),
  categoryId: zod.number().nullish(),
  stock: zod.number(),
  active: zod.boolean().optional(),
  featured: zod.boolean().optional(),
});

export const GetProductParams = zod.object({
  id: zod.coerce.number(),
});

export const GetProductResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  price: zod.number(),
  imageUrl: zod.string().nullish(),
  categoryId: zod.number().nullish(),
  categoryName: zod.string().nullish(),
  stock: zod.number(),
  active: zod.boolean(),
  featured: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const UpdateProductParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdateProductBody = zod.object({
  name: zod.string().nullish(),
  description: zod.string().nullish(),
  price: zod.number().nullish(),
  imageUrl: zod.string().nullish(),
  categoryId: zod.number().nullish(),
  stock: zod.number().nullish(),
  active: zod.boolean().nullish(),
  featured: zod.boolean().nullish(),
});

export const UpdateProductResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  price: zod.number(),
  imageUrl: zod.string().nullish(),
  categoryId: zod.number().nullish(),
  categoryName: zod.string().nullish(),
  stock: zod.number(),
  active: zod.boolean(),
  featured: zod.boolean(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const DeleteProductParams = zod.object({
  id: zod.coerce.number(),
});

export const ListOrdersQueryParams = zod.object({
  status: zod.coerce.string().nullish(),
  limit: zod.coerce.number().nullish(),
});

export const ListOrdersResponseItem = zod.object({
  id: zod.number(),
  customerName: zod.string(),
  customerPhone: zod.string().nullish(),
  status: zod.string(),
  total: zod.number(),
  notes: zod.string().nullish(),
  items: zod.array(
    zod.object({
      id: zod.number(),
      orderId: zod.number(),
      productId: zod.number(),
      productName: zod.string(),
      quantity: zod.number(),
      unitPrice: zod.number(),
      totalPrice: zod.number(),
    }),
  ),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const ListOrdersResponse = zod.array(ListOrdersResponseItem);

export const CreateOrderBody = zod.object({
  customerName: zod.string(),
  customerPhone: zod.string().nullish(),
  notes: zod.string().nullish(),
  items: zod.array(
    zod.object({
      productId: zod.number(),
      quantity: zod.number(),
      unitPrice: zod.number(),
    }),
  ),
});

export const GetOrderParams = zod.object({
  id: zod.coerce.number(),
});

export const GetOrderResponse = zod.object({
  id: zod.number(),
  customerName: zod.string(),
  customerPhone: zod.string().nullish(),
  status: zod.string(),
  total: zod.number(),
  notes: zod.string().nullish(),
  items: zod.array(
    zod.object({
      id: zod.number(),
      orderId: zod.number(),
      productId: zod.number(),
      productName: zod.string(),
      quantity: zod.number(),
      unitPrice: zod.number(),
      totalPrice: zod.number(),
    }),
  ),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const UpdateOrderParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdateOrderBody = zod.object({
  status: zod.string().nullish(),
  notes: zod.string().nullish(),
});

export const UpdateOrderResponse = zod.object({
  id: zod.number(),
  customerName: zod.string(),
  customerPhone: zod.string().nullish(),
  status: zod.string(),
  total: zod.number(),
  notes: zod.string().nullish(),
  items: zod.array(
    zod.object({
      id: zod.number(),
      orderId: zod.number(),
      productId: zod.number(),
      productName: zod.string(),
      quantity: zod.number(),
      unitPrice: zod.number(),
      totalPrice: zod.number(),
    }),
  ),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const DeleteOrderParams = zod.object({
  id: zod.coerce.number(),
});

export const ListPromotionsResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  type: zod.string(),
  discountValue: zod.number(),
  code: zod.string().nullish(),
  minOrderValue: zod.number().nullish(),
  active: zod.boolean(),
  startDate: zod.string().nullish(),
  endDate: zod.string().nullish(),
  usageCount: zod.number(),
  maxUsage: zod.number().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const ListPromotionsResponse = zod.array(ListPromotionsResponseItem);

export const CreatePromotionBody = zod.object({
  name: zod.string(),
  description: zod.string().nullish(),
  type: zod.string(),
  discountValue: zod.number(),
  code: zod.string().nullish(),
  minOrderValue: zod.number().nullish(),
  active: zod.boolean().optional(),
  startDate: zod.string().nullish(),
  endDate: zod.string().nullish(),
  maxUsage: zod.number().nullish(),
});

export const GetPromotionParams = zod.object({
  id: zod.coerce.number(),
});

export const GetPromotionResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  type: zod.string(),
  discountValue: zod.number(),
  code: zod.string().nullish(),
  minOrderValue: zod.number().nullish(),
  active: zod.boolean(),
  startDate: zod.string().nullish(),
  endDate: zod.string().nullish(),
  usageCount: zod.number(),
  maxUsage: zod.number().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const UpdatePromotionParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdatePromotionBody = zod.object({
  name: zod.string().nullish(),
  description: zod.string().nullish(),
  type: zod.string().nullish(),
  discountValue: zod.number().nullish(),
  code: zod.string().nullish(),
  minOrderValue: zod.number().nullish(),
  active: zod.boolean().nullish(),
  startDate: zod.string().nullish(),
  endDate: zod.string().nullish(),
  maxUsage: zod.number().nullish(),
});

export const UpdatePromotionResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  description: zod.string().nullish(),
  type: zod.string(),
  discountValue: zod.number(),
  code: zod.string().nullish(),
  minOrderValue: zod.number().nullish(),
  active: zod.boolean(),
  startDate: zod.string().nullish(),
  endDate: zod.string().nullish(),
  usageCount: zod.number(),
  maxUsage: zod.number().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const DeletePromotionParams = zod.object({
  id: zod.coerce.number(),
});

export const GetDashboardStatsResponse = zod.object({
  todayRevenue: zod.number(),
  monthRevenue: zod.number(),
  todayOrders: zod.number(),
  monthOrders: zod.number(),
  pendingOrders: zod.number(),
  activeProducts: zod.number(),
  totalProducts: zod.number(),
  activePromotions: zod.number(),
});

export const GetSalesChartResponseItem = zod.object({
  label: zod.string(),
  revenue: zod.number(),
  orders: zod.number(),
});
export const GetSalesChartResponse = zod.array(GetSalesChartResponseItem);

export const GetTopProductsResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  imageUrl: zod.string().nullish(),
  totalSold: zod.number(),
  revenue: zod.number(),
});
export const GetTopProductsResponse = zod.array(GetTopProductsResponseItem);

export const GetRecentOrdersResponseItem = zod.object({
  id: zod.number(),
  customerName: zod.string(),
  customerPhone: zod.string().nullish(),
  status: zod.string(),
  total: zod.number(),
  notes: zod.string().nullish(),
  items: zod.array(
    zod.object({
      id: zod.number(),
      orderId: zod.number(),
      productId: zod.number(),
      productName: zod.string(),
      quantity: zod.number(),
      unitPrice: zod.number(),
      totalPrice: zod.number(),
    }),
  ),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});
export const GetRecentOrdersResponse = zod.array(GetRecentOrdersResponseItem);
