import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { RouteGuard } from "@/components/guards/RouteGuard";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";

// Customer Pages
import SearchPage from "./pages/customer/SearchPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import OrdersPage from "./pages/customer/OrdersPage";
import OrderDetailPage from "./pages/customer/OrderDetailPage";
import AccountPage from "./pages/customer/AccountPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/cart" element={<CartPage />} />
              
              {/* Customer protected routes */}
              <Route path="/checkout" element={
                <RouteGuard requireAuth allowedRoles={['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']}>
                  <CheckoutPage />
                </RouteGuard>
              } />
              <Route path="/orders" element={
                <RouteGuard requireAuth allowedRoles={['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']}>
                  <OrdersPage />
                </RouteGuard>
              } />
              <Route path="/orders/:orderId" element={
                <RouteGuard requireAuth allowedRoles={['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']}>
                  <OrderDetailPage />
                </RouteGuard>
              } />
              <Route path="/account" element={
                <RouteGuard requireAuth>
                  <AccountPage />
                </RouteGuard>
              } />

              {/* Admin routes */}
              <Route path="/admin" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </RouteGuard>
              } />
              <Route path="/admin/*" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </RouteGuard>
              } />

              {/* Super Admin routes */}
              <Route path="/superadmin" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </RouteGuard>
              } />
              <Route path="/superadmin/*" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </RouteGuard>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
