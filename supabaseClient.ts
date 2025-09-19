import { createClient } from '@supabase/supabase-js';
import { Supplier } from './types';

const supabaseUrl = 'https://xsoptewtyrogfepnpsde.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzb3B0ZXd0eXJvZ2ZlcG5wc2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjE0NTcsImV4cCI6MjA3MzEzNzQ1N30.y42ifDCqqbmK5cnpOxLLA796XMNG1w6EbmuibHgX1PI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supabase update helper functions
export const updateProductStock = async (productId: string, newStock: number) => {
  await supabase.from('products').update({ stock: newStock }).eq('id', productId);
};

export const updateOrderStatus = async (orderId: string, newStatus: string) => {
  await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
};

export const updateSupplierDetails = async (supplierId: string, newDetails: Partial<Supplier>) => {
  await supabase.from('suppliers').update(newDetails).eq('id', supplierId);
};

// Fetch latest data after update
export const fetchProducts = async () => {
  const { data } = await supabase.from('products').select('*');
  if (!data) return [];
  return data.map((row: any) => ({
    ...row,
    imageUrl: row.imageurl ?? row.imageUrl ?? '',
  }));
};

export const fetchOrders = async () => {
  const { data } = await supabase.from('orders').select('*');
  return data;
};

export const fetchSuppliers = async () => {
  const { data } = await supabase.from('suppliers').select('*');
  return data;
};
