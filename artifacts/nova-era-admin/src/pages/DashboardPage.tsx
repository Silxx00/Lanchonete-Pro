import { useState } from "react";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { DollarSign, ShoppingBag, Clock, Package, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

import { 
  useGetDashboardStats, 
  useGetSalesChart, 
  useGetTopProducts, 
  useGetRecentOrders 
} from "@workspace/api-client-react";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: salesChart, isLoading: salesLoading } = useGetSalesChart();
  const { data: topProducts, isLoading: topProductsLoading } = useGetTopProducts();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'accepted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'preparing': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'ready': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'delivered': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to Nova Era Lanchonete admin panel.</p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-sm border-card-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-12 h-12" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {statsLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{formatCurrency(stats?.todayRevenue || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-4 w-32 mt-1" /> : `Monthly: ${formatCurrency(stats?.monthRevenue || 0)}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-sm border-card-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShoppingBag className="w-12 h-12" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.todayOrders || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-4 w-32 mt-1" /> : `Monthly: ${stats?.monthOrders || 0}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-sm border-card-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-yellow-500">{stats?.pendingOrders || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-4 w-32 mt-1" /> : "Requires immediate attention"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 backdrop-blur-sm border-card-border overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Package className="w-12 h-12" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold">{stats?.activeProducts || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-4 w-32 mt-1" /> : `Total products: ${stats?.totalProducts || 0}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Daily revenue for the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {salesLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-card/50 backdrop-blur-sm border-card-border">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best selling items by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts || []} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [
                        name === 'totalSold' ? value : formatCurrency(value), 
                        name === 'totalSold' ? 'Sold' : 'Revenue'
                      ]}
                    />
                    <Bar dataKey="totalSold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-card-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders requiring attention</CardDescription>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : recentOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent orders found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders?.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg bg-background/50 hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Order #{order.id}</span>
                      <span className="text-muted-foreground">• {order.customerName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{order.items.length} items</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full capitalize border", getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
