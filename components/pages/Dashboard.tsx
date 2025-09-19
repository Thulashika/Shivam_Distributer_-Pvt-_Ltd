import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SalesChart } from '../charts/SalesChart';
import { TopProductsChart } from '../charts/TopProductsChart';
import { OrderStatus, Product, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
        case OrderStatus.Delivered: return 'success';
        case OrderStatus.Pending: return 'warning';
        case OrderStatus.Shipped: return 'info';
        case OrderStatus.Cancelled: return 'danger';
        default: return 'default';
    }
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount).replace('$', `${currency} `);
};

export const Dashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const {
      orders = [],
      products = [],
      customers = [],
      suppliers = []
    } = useData() || {};

    // Defensive fallback for products array
    const safeProducts = Array.isArray(products) ? products : [];
    // Compute top products by stock from products
    const topProducts = useMemo(() => {
      return safeProducts
        .slice()
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 5)
        .map(p => ({ name: p.name, stock: p.stock }));
    }, [safeProducts]);

    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const currency = currentUser?.settings.currency || 'LKR';

    const accessibleSuppliers = useMemo(() => {
    if (currentUser?.role === UserRole.Sales && currentUser.assignedSupplierNames) {
      return new Set(currentUser.assignedSupplierNames);
    }
    return null; // null means all access for Admin/Manager
  }, [currentUser]);

  const availableSuppliers = useMemo(() => {
  const safeSuppliers = suppliers || [];
  if (!accessibleSuppliers) return safeSuppliers;
  return safeSuppliers.filter(s => accessibleSuppliers.has(s.name));
  }, [suppliers, accessibleSuppliers]);

    const filteredOrders = useMemo(() => {
    let baseOrders = orders;

    // Pre-filter orders for Sales Reps based on their assigned suppliers
    if (accessibleSuppliers) {
      const productSupplierMap = new Map(safeProducts.map(p => [p.id, p.supplier]));
      baseOrders = orders.filter(order =>
        order.orderItems && Array.isArray(order.orderItems) &&
        order.orderItems.some(item => {
          const supplier = productSupplierMap.get(item.productId);
          return supplier && accessibleSuppliers.has(supplier);
        })
      );
    }

    return baseOrders.filter(order => {
      // Customer Filter
      if (selectedCustomer !== 'all' && order.customerId !== selectedCustomer) {
        return false;
      }

      // Date Range Filter
      const orderDate = new Date(order.date);
      if (dateRange.start && orderDate < new Date(dateRange.start)) {
        return false;
      }
      // Add 1 day to the end date to make it inclusive
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setDate(endDate.getDate() + 1);
        if (orderDate >= endDate) {
          return false;
        }
      }

      // Get product details for items in the current order
      const orderProducts = (order.orderItems || [])
        .map(item => safeProducts.find(p => p.id === item.productId))
        .filter(Boolean) as Product[];

      // Supplier Filter
      if (selectedSupplier !== 'all' && !orderProducts.some(p => p.supplier === selectedSupplier)) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && !orderProducts.some(p => p.category === selectedCategory)) {
        return false;
      }

      return true;
    });
  }, [orders, safeProducts, selectedCustomer, selectedSupplier, selectedCategory, dateRange, accessibleSuppliers]);
    
  const categories = useMemo(() => {
    const relevantProducts = accessibleSuppliers 
      ? safeProducts.filter(p => accessibleSuppliers.has(p.supplier))
      : safeProducts;
    return ['all', ...new Set(relevantProducts.map(p => p.category))]
  }, [safeProducts, accessibleSuppliers]);

    const salesDataForChart = useMemo(() => {
        const monthlySales: { [key: string]: number } = {};
        const monthYearSet = new Set<string>();

        filteredOrders.forEach(order => {
            if (order.status === OrderStatus.Delivered) {
                const date = new Date(order.date);
                const month = date.toLocaleString('en-US', { month: 'short' });
                const year = date.getFullYear();
                const key = `${month} ${year}`;
                
                monthYearSet.add(key);
                monthlySales[key] = (monthlySales[key] || 0) + order.total;
            }
        });
        
        const sortedMonths = Array.from(monthYearSet).sort((a, b) => {
             return new Date(a).getTime() - new Date(b).getTime();
        });

        return sortedMonths.map(key => ({
            month: key,
            sales: monthlySales[key] || 0
        }));

    }, [filteredOrders]);


    const handleResetFilters = () => {
        setSelectedSupplier('all');
        setSelectedCustomer('all');
        setSelectedCategory('all');
        setDateRange({ start: '', end: '' });
    };

    // Stats based on filtered data
    const totalSales = filteredOrders.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const totalOrders = filteredOrders.length;
    
    // Stats that remain unfiltered (inventory-wide)
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.stock < 100).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        
        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Refine the sales data shown on the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
             <div>
                <label htmlFor="supplier-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                <select id="supplier-filter" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Suppliers</option>
                    {availableSuppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
             </div>
             <div>
        <label htmlFor="customer-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer</label>
        <select id="customer-filter" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Customers</option>
          {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
             </div>
             <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select id="category-filter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
             </div>
             <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                    <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                    <input type="date" id="start-date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="sm:col-span-1">
                    <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                    <input type="date" id="end-date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-transparent mb-1">Reset</label>
                    <button onClick={handleResetFilters} className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">Reset</button>
                </div>
             </div>
          </CardContent>
        </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>Revenue from filtered orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalSales, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
            <CardDescription>Filtered order count</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Total items in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock</CardTitle>
            <CardDescription>Items needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{lowStockItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Monthly performance of filtered sales</CardDescription>
          </CardHeader>
          <CardContent>
            {salesDataForChart.length > 0 ? (
                <SalesChart data={salesDataForChart} />
            ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <p>No sales data for the selected filters.</p>
                </div>
            )}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Top Products by Stock</CardTitle>
            <CardDescription>Current inventory levels</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProductsChart data={topProducts} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>A list of the most recent orders based on current filters.</CardDescription>
        </CardHeader>
        <CardContent>
            {filteredOrders.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                        <th scope="col" className="px-6 py-3">Order ID</th>
                        <th scope="col" className="px-6 py-3">Customer</th>
                        <th scope="col" className="px-6 py-3">Total</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{order.id}</td>
                            <td className="px-6 py-4">{order.customerName}</td>
                            <td className="px-6 py-4">{formatCurrency(order.total, currency)}</td>
                            <td className="px-6 py-4">
                                <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                            </td>
                            <td className="px-6 py-4">{order.date}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            ) : (
                 <div className="text-center py-10">
                    <p className="text-slate-500 dark:text-slate-400">No recent orders match the selected filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};