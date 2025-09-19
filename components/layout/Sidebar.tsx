import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

const Logo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0">
        <path d="M381.6 224c0 5.2-3.1 9.5-7 9.5-2.3 0-4.4-.9-6-2.4-5.2-4.9-11.7-7.1-18.7-7.1-7 0-13.5 2.2-18.7 7.1-1.6 1.5-3.7 2.4-6 2.4-3.9 0-7-4.2-7-9.5s3.1-9.5 7-9.5c5.2 0 10.1 2 13.8 5.7 2.9-2.2 6.3-3.4 9.9-3.4s7 1.2 9.9 3.4c3.7-3.7 8.6-5.7 13.8-5.7 3.9 0 7 4.3 7 9.5zM256 208c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm0 80c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm-64-56c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8zm128 0c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8 8-3.6 8-8zM256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm0 432c-114.9 0-208-93.1-208-208S141.1 48 256 48s208 93.1 208 208-93.1 208-208 208zm-80-168c0-8.8-7.2-16-16-16s-16 7.2-16 16 7.2 16 16 16 16-7.2 16-16zm160 0c0-8.8-7.2-16-16-16s-16 7.2-16 16 7.2 16 16 16 16-7.2 16-16z"/>
        <path d="M256 128c-44.2 0-80 35.8-80 80v32c0 8.8-7.2 16-16 16s-16-7.2-16-16v-32c0-61.9 50.1-112 112-112s112 50.1 112 112v32c0 8.8-7.2 16-16 16s-16-7.2-16-16v-32c0-44.2-35.8-80-80-80zm-48 224h96c8.8 0 16-7.2 16-16s-7.2-16-16-16h-96c-8.8 0-16 7.2-16 16s7.2 16 16 16z"/>
    </svg>
);


export const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, closeSidebar }) => {
  const { currentUser } = useAuth();

  const accessibleNavItems = NAV_ITEMS.filter(item => {
    if (item.path === '/users') {
      return currentUser?.role === UserRole.Admin;
    }
     if (item.path === '/drivers' || item.path === '/suppliers') {
      return currentUser?.role === UserRole.Admin || currentUser?.role === UserRole.Manager;
    }
    return true;
  });


  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-center h-20 border-b border-slate-200 dark:border-slate-700 px-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 102.5 102.5" fill="currentColor" className="h-10 w-10 text-blue-600 dark:text-blue-400 flex-shrink-0">
          <path d="M60.3 75.8c-5.4 0-10.3 1.9-14.4 5.1-4.1-3.2-9-5.1-14.4-5.1-13.4 0-24.2 10.8-24.2 24.2v2.5h77.3v-2.5c-.1-13.4-11-24.2-24.3-24.2zM51.3 0C32.7 0 17.6 15.1 17.6 33.8v10.3c0 18.6 15.1 33.8 33.8 33.8s33.8-15.1 33.8-33.8V33.8C85 15.1 69.9 0 51.3 0zm0 67.8c-13.2 0-24-10.7-24-24V33.8c0-13.2 10.7-24 24-24s24 10.7 24 24v10.3c0 13-10.8 23.7-24 23.7z"/>
          <path d="M96.7 45.1c-1.3-1-3.2-1.5-5.1-1.5-3.5 0-6.8 1.4-9.2 3.8-3.7-2.9-8.4-4.6-13.5-4.6-5.1 0-9.8 1.7-13.5 4.6-2.4-2.4-5.7-3.8-9.2-3.8-1.9 0-3.8.5-5.1 1.5-6.5 4.9-10.5 12.3-10.5 20.6 0 13.4 10.8 24.2 24.2 24.2 5.4 0 10.3-1.9 14.4-5.1 4.1 3.2 9 5.1 14.4 5.1s10.3-1.9 14.4-5.1c4.1 3.2 9 5.1 14.4 5.1 13.4 0 24.2-10.8 24.2-24.2.1-8.3-3.9-15.7-10.3-20.6zM51.3 75.8c-5.4 0-10.3-1.9-14.4-5.1-4.1 3.2-9 5.1-14.4 5.1-8 0-14.9-3.9-19.1-9.8 4.2-5.9 11.1-9.8 19.1-9.8 5.4 0 10.3 1.9 14.4 5.1 4.1-3.2 9-5.1 14.4-5.1s10.3 1.9 14.4 5.1c4.1-3.2 9-5.1 14.4-5.1 8 0 14.9 3.9 19.1 9.8-4.2 5.9-11.1 9.8-19.1 9.8-5.4 0-10.3-1.9-14.4-5.1-4.1 3.2-9 5.1-14.4 5.1z"/>
        </svg>
        <h1 className="text-base font-bold text-blue-600 dark:text-blue-400 ml-2">Shivam Distributer (Pvt) Ltd</h1>
      </div>
      <nav className="p-4">
        <ul>
          {accessibleNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center p-3 my-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200 ${
                    isActive ? 'bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400' : ''
                  }`
                }
              >
                {item.icon}
                <span className="ml-4 font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};