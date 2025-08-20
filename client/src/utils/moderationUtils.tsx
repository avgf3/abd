import { Shield, UserX, Ban, Clock, Crown, Settings, Users } from 'lucide-react';

export function getModerationActionIcon(type: string) {
  switch (type) {
    case 'mute':
      return <UserX className="w-4 h-4 text-orange-500" />;
    case 'ban':
      return <Clock className="w-4 h-4 text-red-500" />;
    case 'block':
      return <Ban className="w-4 h-4 text-red-700" />;
    case 'kick':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'promote':
      return <Crown className="w-4 h-4 text-green-600" />;
    case 'demote':
      return <Users className="w-4 h-4 text-gray-500" />;
    default:
      return <Shield className="w-4 h-4 text-gray-500" />;
  }
}

export function getModerationActionColor(type: string) {
  switch (type) {
    case 'mute':
      return 'text-orange-400';
    case 'ban':
    case 'kick':
      return 'text-yellow-400';
    case 'block':
      return 'text-red-400';
    case 'promote':
      return 'text-green-500';
    case 'demote':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export function getModerationActionBadgeClasses(type: string) {
  switch (type) {
    case 'mute':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'ban':
    case 'kick':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'block':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'promote':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'demote':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'unblock':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

export function getRoleIconComponent(userType: string) {
  switch (userType) {
    case 'owner':
      return <Crown className="w-5 h-5 text-purple-600" />;
    case 'admin':
      return <Shield className="w-5 h-5 text-blue-600" />;
    case 'moderator':
      return <Settings className="w-5 h-5 text-green-600" />;
    default:
      return <Users className="w-5 h-5 text-gray-600" />;
  }
}

export function getRoleTextLabel(userType: string) {
  switch (userType) {
    case 'owner':
      return 'مالك';
    case 'admin':
      return 'مشرف عام';
    case 'moderator':
      return 'مشرف';
    default:
      return 'عضو';
  }
}

