declare global {
    interface Window {
        refreshProducts?: () => Promise<void>;
    }
}
import React, { createContext, useState, ReactNode, useContext, Dispatch, SetStateAction } from 'react';
import { User, Product, Order, Customer, DriverAllocation, DriverSale, Supplier } from '../types';
import { supabase } from '../supabaseClient';

interface DataContextType {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  driverAllocations: DriverAllocation[];
  setDriverAllocations: Dispatch<SetStateAction<DriverAllocation[]>>;
  driverSales: DriverSale[];
  setDriverSales: Dispatch<SetStateAction<DriverSale[]>>;
  suppliers: Supplier[];
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [driverAllocations, setDriverAllocations] = useState<DriverAllocation[]>([]);
    const [driverSales, setDriverSales] = useState<DriverSale[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    React.useEffect(() => {
        // Fetch all data from Supabase tables
        const fetchData = async () => {
            // Force refresh products after allocation/reconciliation
            window.refreshProducts = async () => {
                const { data: productsData, error: productsError } = await supabase.from('products').select('*');
                if (!productsError && productsData) {
                    const mappedProducts = productsData.map((row: any) => ({
                        id: row.id,
                        name: row.name,
                        category: row.category,
                        price: row.price,
                        stock: row.stock,
                        sku: row.sku,
                        supplier: row.supplier,
                        imageUrl: row.imageurl || row.imageUrl || '',
                    }));
                    setProducts(mappedProducts);
                }
            };
            // Orders table fetch mapping
            const { data: ordersData, error: ordersError } = await supabase.from('orders').select('*');
            if (ordersError) {
                console.error('Supabase orders fetch error:', ordersError);
            }
            if (!ordersError && ordersData) {
                const mappedOrders = ordersData.map((row: any) => ({
                    id: row.id,
                    customerId: row.customerid,
                    customerName: row.customername,
                    date: row.orderdate,
                    total: row.totalamount,
                    status: row.status,
                    paymentMethod: row.paymentmethod,
                    notes: row.notes,
                    assignedUserId: row.assigneduserid,
                    orderItems: typeof row.orderitems === 'string' ? JSON.parse(row.orderitems) : (row.orderitems || []),
                    backorderedItems: [],
                    chequeBalance: row.chequebalance == null || isNaN(Number(row.chequebalance)) ? 0 : Number(row.chequebalance),
                    creditBalance: row.creditbalance == null || isNaN(Number(row.creditbalance)) ? 0 : Number(row.creditbalance),
                }));
                setOrders(mappedOrders);
            }
            // Products table fetch mapping
            await window.refreshProducts();
            // Other tables
            const tables = [
                { name: 'customers', setter: setCustomers },
                { name: 'suppliers', setter: setSuppliers },
                { name: 'driver_allocations', setter: setDriverAllocations },
                { name: 'driver_sales', setter: setDriverSales },
                { name: 'users', setter: setUsers },
            ];
            for (const { name, setter } of tables) {
                const { data, error } = await supabase.from(name).select('*');
                if (error) {
                    console.error(`Supabase ${name} fetch error:`, error);
                }
                if (!error && data) {
                    if (name === 'customers') {
                        const mappedCustomers = data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            email: row.email,
                            phone: row.phone,
                            location: row.location,
                            joinDate: row.joindate,
                            totalSpent: typeof row.totalspent === 'number' ? row.totalspent : 0,
                            outstandingBalance: typeof row.outstandingbalance === 'number' ? row.outstandingbalance : 0,
                            avatarUrl: row.avatarurl ?? `https://i.pravatar.cc/100?u=${row.email}`,
                            discounts: row.discounts ?? {},
                        }));
                        setter(mappedCustomers);
                    } else if (name === 'suppliers') {
                        const mappedSuppliers = data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            contactPerson: row.contactperson,
                            email: row.email,
                            phone: row.phone,
                            address: row.address,
                            joinDate: row.joindate,
                        }));
                        setter(mappedSuppliers);
                    } else if (name === 'driver_allocations') {
                        const mappedAllocations = data.map((row: any) => ({
                            id: row.id,
                            driverId: row.driver_id ?? row.driverid,
                            driverName: row.driver_name ?? row.drivername,
                            date: row.date,
                            allocatedItems: (() => {
                                if (row.allocated_items) {
                                    if (typeof row.allocated_items === 'string') {
                                        try { return JSON.parse(row.allocated_items); } catch { return []; }
                                    }
                                    return row.allocated_items;
                                }
                                if (row.allocateditems) {
                                    if (typeof row.allocateditems === 'string') {
                                        try { return JSON.parse(row.allocateditems); } catch { return []; }
                                    }
                                    return row.allocateditems;
                                }
                                return [];
                            })(),
                            returnedItems: (() => {
                                if (row.returned_items) {
                                    if (typeof row.returned_items === 'string') {
                                        try { return JSON.parse(row.returned_items); } catch { return null; }
                                    }
                                    return row.returned_items;
                                }
                                if (row.returneditems) {
                                    if (typeof row.returneditems === 'string') {
                                        try { return JSON.parse(row.returneditems); } catch { return null; }
                                    }
                                    return row.returneditems;
                                }
                                return null;
                            })(),
                            salesTotal: row.sales_total ?? row.salestotal ?? 0,
                            status: row.status ?? 'Allocated',
                        }));
                        setter(mappedAllocations);
                    } else if (name === 'users') {
                        const mappedUsers = data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            email: row.email,
                            phone: row.phone,
                            role: row.role,
                            status: row.status,
                            avatarUrl: row.avatarurl ?? '',
                            lastLogin: row.lastlogin,
                            password: row.password,
                            assignedSupplierNames: row.assignedsuppliernames ?? [],
                            settings: row.settings ?? {},
                        }));
                        setter(mappedUsers);
                    } else {
                        setter(data);
                    }
                }
            }
        };
        fetchData();
    // Expose driverAllocations globally for driver order filtering
    (window as any).driverAllocations = driverAllocations;
    }, []);

    const value = {
        users, setUsers,
        products, setProducts,
        orders, setOrders,
        customers, setCustomers,
        driverAllocations, setDriverAllocations,
        driverSales, setDriverSales,
        suppliers, setSuppliers,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};