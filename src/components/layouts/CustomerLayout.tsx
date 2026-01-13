import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ClipboardList, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Cari' },
  { path: '/orders', icon: ClipboardList, label: 'Pesanan' },
  { path: '/cart', icon: ShoppingCart, label: 'Keranjang' },
  { path: '/account', icon: User, label: 'Akun' },
];

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Main content */}
      <main className="animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-border z-50 safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  isActive ? "text-nav-active" : "text-nav-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 mb-1 transition-transform",
                    isActive && "scale-110"
                  )} 
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
