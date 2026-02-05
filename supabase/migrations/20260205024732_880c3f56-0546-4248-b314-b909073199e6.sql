-- Add RLS policy for Super Admin to view all profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Add RLS policy for Super Admin to update all profiles (for role changes)
CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));