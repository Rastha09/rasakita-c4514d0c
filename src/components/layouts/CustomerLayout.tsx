import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ClipboardList, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CartBadge } from '@/components/customer/CartBadge';
import { Footer } from '@/components/customer/Footer';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home', exact: true },
    { path: '/search', icon: Search, label: 'Cari' },
    { path: '/orders', icon: ClipboardList, label: 'Pesanan' },
    { path: '/cart', icon: ShoppingCart, label: 'Keranjang', hasBadge: true },
    { path: '/account', icon: User, label: 'Akun' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Main content */}
      <main className="animate-fade-in">
        {children}
      </main>

      {/* Footer removed - now rendered conditionally in StorePage */}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-border z-50 safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                  isActive ? "text-nav-active" : "text-nav-foreground"
                )}
              >
                <div className="relative">
                  <Icon 
                    className={cn(
                      "h-5 w-5 mb-1 transition-transform",
                      isActive && "scale-110"
                    )} 
                  />
                  {item.hasBadge && <CartBadge />}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
