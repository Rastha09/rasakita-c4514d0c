import { HelpCircle, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    question: 'Bagaimana cara melacak pesanan saya?',
    answer: 'Anda dapat melacak pesanan melalui menu "Pesanan" di navigasi bawah. Di sana akan terlihat status pesanan Anda secara real-time mulai dari diproses hingga sampai ke tujuan.',
  },
  {
    question: 'Bagaimana cara mengubah alamat pengiriman?',
    answer: 'Buka menu "Akun", lalu scroll ke bagian "Alamat Pengiriman". Anda dapat menambah, mengedit, atau menghapus alamat sesuai kebutuhan.',
  },
  {
    question: 'Apa saja metode pembayaran yang tersedia?',
    answer: 'Kami menyediakan pembayaran COD (Bayar di Tempat) dan QRIS untuk kemudahan transaksi Anda.',
  },
  {
    question: 'Bagaimana jika pesanan saya tidak sesuai?',
    answer: 'Segera hubungi toko melalui kontak yang tersedia. Kami akan membantu menyelesaikan masalah Anda secepat mungkin.',
  },
  {
    question: 'Berapa lama estimasi pengiriman?',
    answer: 'Estimasi pengiriman tergantung pada lokasi Anda dan jarak dari toko. Biasanya pesanan akan tiba dalam 1-3 hari kerja.',
  },
];

export function HelpSection() {
  const handleWhatsApp = () => {
    const phone = '6281234567890'; // Replace with actual support number
    const message = encodeURIComponent('Halo, saya butuh bantuan terkait pesanan saya.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    window.open('mailto:support@rasakita.com?subject=Butuh%20Bantuan', '_blank');
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Bantuan & FAQ</h3>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-sm text-left">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground mb-3">Butuh bantuan lebih lanjut?</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full"
            onClick={handleEmail}
          >
            <Mail className="h-4 w-4 mr-1" /> Email
          </Button>
        </div>
      </div>
    </div>
  );
}
