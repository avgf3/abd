import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChatUser } from "@/types/chat";
import { EyeIcon, EyeOff } from "lucide-react";
import { getUserRoleIcon } from "./UserRoleBadge";

interface StealthModeButtonProps {
  user: ChatUser;
  onToggle: (isHidden: boolean) => void;
}

export function StealthModeButton({ user, onToggle }: StealthModeButtonProps) {
  const [isHidden, setIsHidden] = useState(user.isHidden || false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // فقط الإدمن والمالك يمكنهم رؤية هذا الزر
  if (user.userType !== 'admin' && user.userType !== 'owner') {
    return null;
  }

  const handleToggle = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const newHiddenState = !isHidden;

      await apiRequest(`/api/users/${user.id}/toggle-hidden`, {
        method: 'POST',
        body: { isHidden: newHiddenState }
      });

      setIsHidden(newHiddenState);
      onToggle(newHiddenState);

      toast({
        title: newHiddenState ? "🔒 تم تفعيل المراقبة المخفية" : "👁️ تم إلغاء المراقبة المخفية",
        description: newHiddenState 
          ? "أنت الآن في وضع المراقبة - لن يراك المستخدمون في القائمة" 
          : "أنت الآن مرئي للجميع في القائمة",
        variant: newHiddenState ? "destructive" : "default"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في تغيير وضع المراقبة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={isHidden ? "destructive" : "secondary"} className="text-xs">
          {isHidden ? "🔒 مخفي" : "👁️ ظاهر"}
        </Badge>
        {(user.userType === 'owner' || user.userType === 'admin') && (
          <Badge variant="default" className="text-xs">
            {getUserRoleIcon(user.userType)}
          </Badge>
        )}
      </div>
      
      <Button
        onClick={handleToggle}
        disabled={loading}
        variant={isHidden ? "destructive" : "outline"}
        size="sm"
        className="text-xs px-3 py-1 h-auto"
      >
        {loading ? (
          <span className="animate-spin">⏳</span>
        ) : isHidden ? (
          <>
            <EyeIcon className="w-3 h-3 ml-1" />
            إظهار
          </>
        ) : (
          <>
            <EyeOff className="w-3 h-3 ml-1" />
            إخفاء
          </>
        )}
      </Button>
    </div>
  );
}