import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminPanelShellProps {
  isVisible: boolean;
  icon?: React.ReactNode;
  title: React.ReactNode;
  roleLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  titleBadges?: React.ReactNode;
}

export default function AdminPanelShell({
  isVisible,
  icon,
  title,
  roleLabel,
  onClose,
  children,
  titleBadges,
}: AdminPanelShellProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-gray-900/95 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
              {icon}
              {title}
              {titleBadges}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {roleLabel}
              </Badge>
              <Button onClick={onClose} variant="ghost" size="sm">
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}

