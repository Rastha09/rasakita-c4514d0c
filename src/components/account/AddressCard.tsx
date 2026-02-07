import { MapPin, MoreVertical, Star, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomerAddress } from '@/hooks/useCustomerAddresses';

interface AddressCardProps {
  address: CustomerAddress;
  onEdit: (address: CustomerAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">{address.label}</span>
          {address.is_default && (
            <Badge variant="secondary" className="text-xs">Utama</Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(address)}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            {!address.is_default && (
              <DropdownMenuItem onClick={() => onSetDefault(address.id)}>
                <Star className="h-4 w-4 mr-2" /> Jadikan Utama
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onDelete(address.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="text-sm space-y-1">
        <p className="font-medium">{address.recipient_name}</p>
        <p className="text-muted-foreground">{address.phone}</p>
        <p className="text-muted-foreground">
          {address.address_line}
          {address.city && `, ${address.city}`}
          {address.postal_code && ` ${address.postal_code}`}
        </p>
      </div>
    </div>
  );
}
