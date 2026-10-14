/** Modèles partagés entre le front Angular et l'API ASP.NET Core. */

export type OrderStatus = 'recue' | 'preparation' | 'prete' | 'livree' | 'annulee';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  channel: 'whatsapp';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  description?: string;
}

export type ProductInput = Omit<Product, 'id'>;

export interface User {
  name: string;
  email: string;
  shop: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DayStat {
  date: string;
  revenue: number;
  orders: number;
}

export interface Stats {
  revenueToday: number;
  ordersToday: number;
  averageBasket: number;
  pendingOrders: number;
  byDay: DayStat[];
  topProducts: { name: string; quantity: number }[];
}
