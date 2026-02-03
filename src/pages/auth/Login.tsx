import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();

  // Watch for profile to be loaded after login, then redirect
  useEffect(() => {
    if (loginSuccess && user && profile) {
      let redirectPath = '/makka-bakerry';
      if (profile.role === 'SUPER_ADMIN') {
        redirectPath = '/superadmin';
      } else if (profile.role === 'ADMIN') {
        redirectPath = '/admin';
      }
      navigate(redirectPath);
    }
  }, [loginSuccess, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Berhasil masuk!');
      setLoginSuccess(true);
      // Profile will be loaded by auth context, useEffect will handle redirect
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-16 w-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Masuk</h1>
          <p className="text-muted-foreground">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Belum punya akun?{' '}
          <Link to="/register" className="text-primary font-medium">Daftar</Link>
        </p>
      </div>
    </div>
  );
}
