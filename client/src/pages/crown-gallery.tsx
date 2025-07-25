import GoldenCrown from '@/components/chat/GoldenCrown';
import CartoonCrown from '@/components/chat/CartoonCrown';

export default function CrownGalleryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 py-8">
      <div className="space-y-12">
        <GoldenCrown />
        <CartoonCrown />
      </div>
    </div>
  );
}