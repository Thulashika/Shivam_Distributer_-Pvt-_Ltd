import React, { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Customer, UserRole } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportCustomers } from '../../utils/exportUtils';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount).replace('$', `${currency} `);
};


export const Customers: React.FC = () => {
  const { customers, setCustomers, orders, products } = useData();
  const { currentUser } = useAuth();
  const currency = currentUser?.settings.currency || 'LKR';

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>({});
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const canEdit = useMemo(() => 
    currentUser?.role === UserRole.Admin || 
    currentUser?.role === UserRole.Manager ||
    currentUser?.role === UserRole.Sales ||
    currentUser?.role === UserRole.Driver,
    [currentUser]
  );
  
  const accessibleSuppliers = useMemo(() => {
    if (currentUser?.role === UserRole.Sales && currentUser.assignedSupplierNames) {
        return new Set(currentUser.assignedSupplierNames);
    }
    return null; // null means all access for Admin/Manager
  }, [currentUser]);


  const openModal = (mode: 'add' | 'edit', customer?: Customer) => {
    setModalMode(mode);
    setCurrentCustomer(customer || { name: '', email: '', phone: '', location: '', outstandingBalance: 0, avatarUrl: `https://i.pravatar.cc/100?u=new` });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCustomer({});
  };

  const openDeleteConfirm = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const closeDeleteConfirm = () => {
    setCustomerToDelete(null);
  };

    const handleSave = () => {
    (async () => {
      try {
        if (!currentCustomer.name || !currentCustomer.email) {
          alert('Please fill in all required fields (name and email)');
          return;
        }

        if (modalMode === 'add') {
          const newCustomer = {
            id: `CUST${(customers.length + 10).toString().padStart(3, '0')}`,
            name: currentCustomer.name || '',
            email: currentCustomer.email || '',
            phone: currentCustomer.phone || '',
            location: currentCustomer.location || '',
            joindate: new Date().toISOString().split('T')[0],
            totalspent: 0,
            outstandingbalance: 0,
            avatarurl: currentCustomer.avatarUrl || `https://i.pravatar.cc/40?u=${currentCustomer.email || 'new'}`,
          };
          
          const { error } = await supabase.from('customers').insert([newCustomer]);
          if (error) {
            alert(`Error adding customer: ${error.message}`);
            return;
          }
          alert('Customer added successfully!');
        } else {
          const { error } = await supabase.from('customers').update({
            name: currentCustomer.name,
            email: currentCustomer.email,
            phone: currentCustomer.phone,
            location: currentCustomer.location,
            outstandingbalance: currentCustomer.outstandingBalance,
            avatarurl: currentCustomer.avatarUrl,
          }).eq('id', currentCustomer.id);
          
          if (error) {
            alert(`Error updating customer: ${error.message}`);
            return;
          }
          alert('Customer updated successfully!');
        }
        // Only update context if you want to show new customer immediately
        // Otherwise, rely on DataContext to refetch on next mount
        closeModal();
      } catch (error) {
        console.error('Unexpected error in customer operation:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    })();
  };
  
  const handleDelete = async () => {
    if (customerToDelete) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);
        if (error) {
          alert(`Error deleting customer: ${error.message}`);
          return;
        }
        
        alert('Customer deleted successfully!');
        // Only update context if you want to show new customer immediately
        // Otherwise, rely on DataContext to refetch on next mount
        closeDeleteConfirm();
      } catch (error) {
        console.error('Unexpected error deleting customer:', error);
        alert('An unexpected error occurred while deleting. Please try again.');
      }
    }
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setCurrentCustomer(prev => ({ ...prev, avatarUrl: base64String }));
        };
        reader.readAsDataURL(file);
    }
  };



  // Calculate outstanding for each customer from orders table
  const customerOutstandingMap: Record<string, number> = {};
  orders.forEach(order => {
    if (!order.customerId) return;
    // Treat null, undefined, or non-number as 0
    const cheque = order.chequeBalance == null || isNaN(Number(order.chequeBalance)) ? 0 : Number(order.chequeBalance);
    const credit = order.creditBalance == null || isNaN(Number(order.creditBalance)) ? 0 : Number(order.creditBalance);
    customerOutstandingMap[order.customerId] = (customerOutstandingMap[order.customerId] || 0) + cheque + credit;
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.location.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const customersBySupplier = useMemo(() => {
    const getPrimarySupplier = (customerId: string): string => {
        const customerOrders = orders.filter(o => o.customerId === customerId);
        if (customerOrders.length === 0) return 'Unassigned';

        const spendingBySupplier: Record<string, number> = {};

        customerOrders.forEach(order => {
            order.orderItems.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const supplier = product.supplier || 'Unassigned';
                    const itemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                    spendingBySupplier[supplier] = (spendingBySupplier[supplier] || 0) + itemTotal;
                }
            });
        });
        
        const topSupplier = Object.entries(spendingBySupplier).sort((a, b) => b[1] - a[1])[0];
        return topSupplier ? topSupplier[0] : 'Unassigned';
    };

    const grouped = filteredCustomers.reduce((acc, customer) => {
        const primarySupplier = getPrimarySupplier(customer.id);
        if (!acc[primarySupplier]) {
            acc[primarySupplier] = [];
        }
        acc[primarySupplier].push(customer);
        return acc;
    }, {} as Record<string, Customer[]>);

    if (!accessibleSuppliers) return grouped;

    return Object.fromEntries(
        Object.entries(grouped).filter(([supplierName]) => accessibleSuppliers.has(supplierName))
    );
  }, [filteredCustomers, orders, products, accessibleSuppliers]);

  const allCustomers = Object.values(customersBySupplier).flat() as Customer[];
  // Total outstanding from orders table
  const totalOutstanding = useMemo(() => 
    allCustomers.reduce((sum, customer) => sum + (customerOutstandingMap[customer.id] || 0), 0), 
    [allCustomers, customerOutstandingMap]
  );

  const totalSpent = useMemo(() => 
    allCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0), 
    [allCustomers]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Customers</h1>
        <div className="flex gap-2">
          {/* Export Buttons */}
          <button
            onClick={() => exportCustomers(filteredCustomers, 'csv')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            title="Export as CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={() => exportCustomers(filteredCustomers, 'xlsx')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            title="Export as Excel"
          >
            📋 Excel
          </button>
          {canEdit && (
              <button 
                  onClick={() => openModal('add')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
              Add Customer
              </button>
          )}
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Customers</CardTitle>
          <CardDescription>Visible in current view</CardDescription>
        </CardHeader>
        <CardContent>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{allCustomers.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Spent</CardTitle>
          <CardDescription>For visible customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalSpent, currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Outstanding</CardTitle>
          <CardDescription>For visible customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-500">{formatCurrency(totalOutstanding, currency)}</p>
        </CardContent>
      </Card>
        </div>


      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>Manage your customer information, grouped by primary supplier.</CardDescription>
           <div className="pt-4">
             <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent>
           <div className="space-y-8">
            {Object.entries(customersBySupplier).map(([supplierName, supplierCustomers]) => (
              <div key={supplierName}>
                <div className="flex items-center space-x-3 mb-4">
                  <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{supplierName}</h2>
                  <Badge variant="default">{(supplierCustomers as Customer[]).length} {(supplierCustomers as Customer[]).length === 1 ? 'Customer' : 'Customers'}</Badge>
                </div>
                 <div className="overflow-x-auto border dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                          <th scope="col" className="px-6 py-3">Customer</th>
                          <th scope="col" className="px-6 py-3">Contact</th>
                          <th scope="col" className="px-6 py-3">Total Spent</th>
                          <th scope="col" className="px-6 py-3">Outstanding</th>
                          {canEdit && <th scope="col" className="px-6 py-3">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(supplierCustomers as Customer[]).map((customer) => (
                          <tr key={customer.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                <div className="flex items-center space-x-3">
                                    <img src={customer.avatarUrl} alt={customer.name} className="w-10 h-10 rounded-full" />
                                    <div>
                                        <span>{customer.name}</span>
                                        <p className="text-xs text-slate-500">{customer.location}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div>{customer.email}</div>
                                <div className="text-xs text-slate-500">{customer.phone}</div>
                            </td>
                            <td className="px-6 py-4">{formatCurrency(customer.totalSpent, currency)}</td>
                            <td className={`px-6 py-4 font-bold ${(customerOutstandingMap[customer.id] || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(customerOutstandingMap[customer.id] || 0, currency)}</td>
                            {canEdit && (
                                <td className="px-6 py-4 flex items-center space-x-2">
                                <button onClick={() => openModal('edit', customer)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                                <button onClick={() => openDeleteConfirm(customer)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                                </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>
            ))}
            {Object.keys(customersBySupplier).length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 dark:text-slate-400">No customers found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        
        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Customer' : 'Edit Customer'}>
            <div className="p-6 space-y-4">
                <div className="flex flex-col items-center space-y-2">
                    <img 
                        src={currentCustomer.avatarUrl || 'https://i.pravatar.cc/100?u=default'} 
                        alt="Avatar preview" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-600"
                    />
                    <label htmlFor="avatar-upload-customer" className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Upload Photo
                        <input 
                            id="avatar-upload-customer" 
                            type="file" 
                            className="hidden" 
                            accept="image/png, image/jpeg, image/gif"
                            onChange={handleAvatarChange}
                        />
                    </label>
                </div>
                 <div>
                    <label htmlFor="name" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Name</label>
                    <input
                        type="text"
                        id="name"
                        value={currentCustomer.name || ''}
                        onChange={(e) => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={currentCustomer.email || ''}
                        onChange={(e) => setCurrentCustomer({ ...currentCustomer, email: e.target.value })}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Phone</label>
                    <input
                        type="tel"
                        id="phone"
                        value={currentCustomer.phone || ''}
                        onChange={(e) => setCurrentCustomer({ ...currentCustomer, phone: e.target.value })}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="location" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Location</label>
                    <input
                        type="text"
                        id="location"
                        value={currentCustomer.location || ''}
                        onChange={(e) => setCurrentCustomer({ ...currentCustomer, location: e.target.value })}
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        placeholder="City, State"
                        required
                    />
                </div>
                 {modalMode === 'edit' && (
                    <div>
                        <label htmlFor="outstandingBalance" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Outstanding Balance</label>
                        <input
                            type="number"
                            id="outstandingBalance"
                            value={currentCustomer.outstandingBalance || ''}
                            onChange={(e) => setCurrentCustomer({ ...currentCustomer, outstandingBalance: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white"
                        />
                    </div>
                )}
            </div>
             <div className="flex items-center justify-end p-6 space-x-2 border-t border-slate-200 rounded-b dark:border-slate-600">
                <button onClick={closeModal} type="button" className="text-slate-500 bg-white hover:bg-slate-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-slate-200 text-sm font-medium px-5 py-2.5 hover:text-slate-900 focus:z-10 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500 dark:hover:text-white dark:hover:bg-slate-600">
                    Cancel
                </button>
                <button onClick={handleSave} type="button" className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700">
                    Save Customer
                </button>
            </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!customerToDelete} onClose={closeDeleteConfirm} title="Confirm Deletion">
            <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300">Are you sure you want to delete the customer "{customerToDelete?.name}"?</p>
            </div>
            <div className="flex items-center justify-end p-6 space-x-2 border-t border-slate-200 rounded-b dark:border-slate-600">
                <button onClick={closeDeleteConfirm} type="button" className="text-slate-500 bg-white hover:bg-slate-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-slate-200 text-sm font-medium px-5 py-2.5 hover:text-slate-900 focus:z-10 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500 dark:hover:text-white dark:hover:bg-slate-600">
                    Cancel
                </button>
                <button onClick={handleDelete} type="button" className="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700">
                    Delete
                </button>
            </div>
        </Modal>
    </div>
  );
};