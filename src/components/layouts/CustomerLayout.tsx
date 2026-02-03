import { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Search, ClipboardList, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CartBadge } from '@/components/customer/CartBadge';

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const basePath = `/${storeSlug || 'makka-bakerry'}`;

  const navItems = [
    { path: basePath, icon: Home, label: 'Home' },
    { path: `${basePath}/search`, icon: Search, label: 'Cari' },
    { path: `${basePath}/orders`, icon: ClipboardList, label: 'Pesanan' },
    { path: `${basePath}/cart`, icon: ShoppingCart, label: 'Keranjang', hasBadge: true },
    { path: `${basePath}/account`, icon: User, label: 'Akun' },
  ];

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
              (item.path !== basePath && location.pathname.startsWith(item.path));
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
