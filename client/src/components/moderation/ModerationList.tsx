import { Shield } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BaseAction {
  id: string | number;
  type: string;
  timestamp: number;
}

interface ModerationListProps<T extends BaseAction> {
  items: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyText?: string;
  renderItem: (item: T) => React.ReactNode;
}

export default function ModerationList<T extends BaseAction>({
  items,
  loading = false,
  emptyIcon = <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />,
  emptyText = 'لا توجد عناصر',
  renderItem,
}: ModerationListProps<T>) {
  return (
    <ScrollArea className="h-[50vh]">
      {loading ? (
        <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {emptyIcon}
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id as any} className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4">{renderItem(item)}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}