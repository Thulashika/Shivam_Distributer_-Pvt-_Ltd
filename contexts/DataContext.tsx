declare global {
    interface Window {
        refreshProducts?: () => Promise<void>;
    }
}
import React, { createContext, useState, ReactNode, useContext, Dispatch, SetStateAction } from 'react';
import { User, Product, Order, Customer, DriverAllocation, DriverSale, Supplier } from '../types';
import { supabase } from '../supabaseClient';
import { 
    DatabaseOrder, 
    DatabaseDriverAllocation, 
    safeJsonParse 
} from '../database-types';

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
                const mappedOrders = ordersData.map((row: DatabaseOrder) => {
                    const orderItemsResult = safeJsonParse(row.orderitems, [], 'orderitems', row.id);
                    if (!orderItemsResult.success) {
                        // Log error but continue with fallback
                        console.warn(`Using empty array for order items in order ${row.id}`);
                    }

                    return {
                        id: row.id,
                        customerId: row.customerid,
                        customerName: row.customername,
                        date: row.orderdate,
                        total: row.totalamount,
                        status: row.status,
                        paymentMethod: row.paymentmethod,
                        notes: row.notes,
                        assignedUserId: row.assigneduserid,
                        orderItems: orderItemsResult.success ? orderItemsResult.data : [],
                        backorderedItems: [],
                        chequeBalance: row.chequebalance == null || isNaN(Number(row.chequebalance)) ? 0 : Number(row.chequebalance),
                        creditBalance: row.creditbalance == null || isNaN(Number(row.creditbalance)) ? 0 : Number(row.creditbalance),
                    } as Order;
                });
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
                        console.log('Debug - Raw driver_allocations data from DB:', data);
                        console.log('Debug - Driver_allocations error:', error);
                        const mappedAllocations = data.map((row: any) => ({
                            id: row.id,
                            driverId: row.driver_id ?? row.driverid,
                            driverName: row.driver_name ?? row.drivername,
                            date: row.date,
                            allocatedItems: (() => {
                                console.log(`Debug - Row ${row.id} allocated_items:`, row.allocated_items);
                                console.log(`Debug - Row ${row.id} allocateditems:`, row.allocateditems);
                                
                                const parseJsonSafely = (jsonString: string, fieldName: string, rowId: string) => {
                                    try {
                                        const parsed = JSON.parse(jsonString);
                                        console.log(`Debug - Successfully parsed ${fieldName} for ${rowId}:`, parsed);
                                        return Array.isArray(parsed) ? parsed : [];
                                    } catch (error) {
                                        console.error(`Error parsing ${fieldName} for row ${rowId}:`, error);
                                        console.error(`Raw data that failed to parse:`, jsonString);
                                        return [];
                                    }
                                };
                                
                                if (row.allocated_items) {
                                    if (typeof row.allocated_items === 'string') {
                                        return parseJsonSafely(row.allocated_items, 'allocated_items', row.id);
                                    }
                                    return Array.isArray(row.allocated_items) ? row.allocated_items : [];
                                }
                                if (row.allocateditems) {
                                    if (typeof row.allocateditems === 'string') {
                                        return parseJsonSafely(row.allocateditems, 'allocateditems', row.id);
                                    }
                                    return Array.isArray(row.allocateditems) ? row.allocateditems : [];
                                }
                                return [];
                            })(),
                            returnedItems: (() => {
                                const parseJsonSafely = (jsonString: string, fieldName: string, rowId: string) => {
                                    try {
                                        const parsed = JSON.parse(jsonString);
                                        console.log(`Debug - Successfully parsed ${fieldName} for ${rowId}:`, parsed);
                                        return parsed;
                                    } catch (error) {
                                        console.error(`Error parsing ${fieldName} for row ${rowId}:`, error);
                                        console.error(`Raw data that failed to parse:`, jsonString);
                                        return null;
                                    }
                                };
                                
                                if (row.returned_items) {
                                    if (typeof row.returned_items === 'string') {
                                        return parseJsonSafely(row.returned_items, 'returned_items', row.id);
                                    }
                                    return row.returned_items;
                                }
                                if (row.returneditems) {
                                    if (typeof row.returneditems === 'string') {
                                        return parseJsonSafely(row.returneditems, 'returneditems', row.id);
                                    }
                                    return row.returneditems;
                                }
                                return null;
                            })(),
                            salesTotal: row.sales_total ?? row.salestotal ?? 0,
                            status: row.status ?? 'Allocated',
                        }));
                        console.log('Debug - Mapped driver allocations:', mappedAllocations);
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
                    } else if (name === 'driver_sales') {
                        const mappedSales = data.map((row: any) => ({
                            id: row.id,
                            driverId: row.driver_id,
                            allocationId: row.allocation_id,
                            date: row.date,
                            soldItems: typeof row.sold_items === 'string' ? JSON.parse(row.sold_items) : (row.sold_items || []),
                            total: row.total || 0,
                            customerName: row.customer_name,
                            customerId: row.customer_id,
                            amountPaid: row.amount_paid || 0,
                            creditAmount: row.credit_amount || 0,
                            paymentMethod: row.payment_method,
                            paymentReference: row.payment_reference,
                            notes: row.notes,
                        }));
                        setter(mappedSales);
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
    }, []);

    // Expose driverAllocations globally for driver order filtering whenever it changes
    React.useEffect(() => {
        (window as any).driverAllocations = driverAllocations;
        console.log('Debug - Window driverAllocations updated:', driverAllocations.length, 'allocations');
    }, [driverAllocations]);

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