import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';

const Index = () => {
  const { user, profile } = useAuth();

  return (
    <CustomerLayout>
      <div className="px-4 py-6">
        {/* Hero Section */}
        <div className="gradient-primary rounded-2xl p-6 text-primary-foreground mb-6">
          <h1 className="text-2xl font-bold mb-2">Selamat Datang! 👋</h1>
          <p className="text-primary-foreground/90 mb-4">
            {user ? `Halo, ${profile?.full_name || 'Customer'}!` : 'Temukan produk terbaik di sini'}
          </p>
          {!user && (
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/login">
                Masuk <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Demo Products */}
        <h2 className="text-lg font-semibold mb-4">Produk Populer</h2>
        <div className="grid grid-cols-2 gap-3">
          {['Nasi Goreng Spesial', 'Mie Ayam Bakso', 'Es Teh Manis', 'Ayam Geprek'].map((name, i) => (
            <div key={i} className="bg-card rounded-xl p-3 shadow-card">
              <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-sm truncate">{name}</h3>
              <p className="text-primary font-semibold text-sm">Rp {(15000 + i * 5000).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Index;
