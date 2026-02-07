import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressFormData = Omit<CustomerAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useCustomerAddresses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addressesQuery = useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!user,
  });

  const createAddress = useMutation({
    mutationFn: async (data: AddressFormData) => {
      if (!user) throw new Error('Not authenticated');

      // If this is set as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('customer_addresses')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alamat berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
    onError: () => {
      toast.error('Gagal menambahkan alamat');
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AddressFormData> }) => {
      if (!user) throw new Error('Not authenticated');

      // If this is set as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('customer_addresses')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alamat berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
    onError: () => {
      toast.error('Gagal memperbarui alamat');
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alamat berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
    onError: () => {
      toast.error('Gagal menghapus alamat');
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');

      // Unset all defaults first
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alamat utama berhasil diubah');
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
    onError: () => {
      toast.error('Gagal mengubah alamat utama');
    },
  });

  return {
    addresses: addressesQuery.data || [],
    isLoading: addressesQuery.isLoading,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}
