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

// Customer Pages
import SearchPage from "./pages/customer/SearchPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import OrdersPage from "./pages/customer/OrdersPage";
import OrderDetailPage from "./pages/customer/OrderDetailPage";
import AccountPage from "./pages/customer/AccountPage";
import PaymentPage from "./pages/customer/PaymentPage";
import ProductDetailPage from "./pages/customer/ProductDetailPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminProductFormPage from "./pages/admin/AdminProductFormPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import PaymentsDebugPage from "./pages/admin/PaymentsDebugPage";

// Super Admin Pages
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminStoresPage from "./pages/superadmin/SuperAdminStoresPage";
import SuperAdminUsersPage from "./pages/superadmin/SuperAdminUsersPage";
import SuperAdminOrdersPage from "./pages/superadmin/SuperAdminOrdersPage";
import SuperAdminSettingsPage from "./pages/superadmin/SuperAdminSettingsPage";

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
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Customer routes - with role check to redirect admin/superadmin */}
              <Route path="/" element={
                <RouteGuard customerOnly>
                  <Index />
                </RouteGuard>
              } />
              <Route path="/search" element={
                <RouteGuard customerOnly>
                  <SearchPage />
                </RouteGuard>
              } />
              <Route path="/product/:slug" element={
                <RouteGuard customerOnly>
                  <ProductDetailPage />
                </RouteGuard>
              } />
              <Route path="/cart" element={
                <RouteGuard customerOnly>
                  <CartPage />
                </RouteGuard>
              } />
              <Route path="/checkout" element={
                <RouteGuard requireAuth customerOnly>
                  <CheckoutPage />
                </RouteGuard>
              } />
              <Route path="/orders" element={
                <RouteGuard requireAuth customerOnly>
                  <OrdersPage />
                </RouteGuard>
              } />
              <Route path="/orders/:orderId" element={
                <RouteGuard requireAuth customerOnly>
                  <OrderDetailPage />
                </RouteGuard>
              } />
              <Route path="/payment/:orderId" element={
                <RouteGuard requireAuth customerOnly>
                  <PaymentPage />
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
              <Route path="/admin/orders" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminOrdersPage />
                </RouteGuard>
              } />
              <Route path="/admin/orders/:orderId" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminOrderDetailPage />
                </RouteGuard>
              } />
              <Route path="/admin/products" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminProductsPage />
                </RouteGuard>
              } />
              <Route path="/admin/products/:productId" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminProductFormPage />
                </RouteGuard>
              } />
              <Route path="/admin/settings" element={
                <RouteGuard allowedRoles={['ADMIN']}>
                  <AdminSettingsPage />
                </RouteGuard>
              } />
              <Route path="/admin/settings/payments-debug" element={
                <RouteGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <PaymentsDebugPage />
                </RouteGuard>
              } />

              {/* Super Admin routes */}
              <Route path="/superadmin" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </RouteGuard>
              } />
              <Route path="/superadmin/stores" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminStoresPage />
                </RouteGuard>
              } />
              <Route path="/superadmin/users" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminUsersPage />
                </RouteGuard>
              } />
              <Route path="/superadmin/orders" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminOrdersPage />
                </RouteGuard>
              } />
              <Route path="/superadmin/settings" element={
                <RouteGuard allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminSettingsPage />
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
