import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/queryClient';
import { ChatUser } from '../../types/chat';

interface UsersListProps {
  currentUserId: number;
  onUserSelect?: (user: ChatUser) => void;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const UsersList: React.FC<UsersListProps> = ({ currentUserId, onUserSelect }) => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searchPagination, setSearchPagination] = useState<PaginationInfo | null>(null);

  // جلب المستخدمين مع pagination
  const fetchUsers = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest(`/api/users?page=${page}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError('فشل في جلب المستخدمين');
      }
    } catch (err) {
      setError('خطأ في الاتصال');
      console.error('خطأ في جلب المستخدمين:', err);
    } finally {
      setLoading(false);
    }
  };

  // البحث عن المستخدمين
  const searchUsers = async (term: string, page: number = 1) => {
    if (!term.trim()) {
      setSearchResults([]);
      setSearchPagination(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest(`/api/users/search?q=${encodeURIComponent(term)}&userId=${currentUserId}&page=${page}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
        setSearchPagination(data.pagination);
      } else {
        setError('فشل في البحث');
      }
    } catch (err) {
      setError('خطأ في الاتصال');
      console.error('خطأ في البحث:', err);
    } finally {
      setLoading(false);
    }
  };

  // تحميل المستخدمين عند بدء التطبيق
  useEffect(() => {
    fetchUsers();
  }, []);

  // البحث عند تغيير النص
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
        setSearchPagination(null);
      }
    }, 300); // تأخير 300ms لتجنب استدعاءات كثيرة

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentUserId]);

  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      searchUsers(searchTerm, newPage);
    } else {
      fetchUsers(newPage);
    }
  };

  const displayUsers = searchTerm.trim() ? searchResults : users;
  const displayPagination = searchTerm.trim() ? searchPagination : pagination;

  return (
    <div className="users-list-container bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">قائمة المستخدمين</h3>
      
      {/* شريط البحث */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="البحث عن مستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* رسالة التحميل */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري التحميل...</p>
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="text-red-500 text-center py-4">
          {error}
        </div>
      )}

      {/* قائمة المستخدمين */}
      {!loading && !error && (
        <div className="space-y-2">
          {displayUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {searchTerm.trim() ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمين'}
            </p>
          ) : (
            displayUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  user.id === currentUserId
                    ? 'bg-blue-100 border-l-4 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => onUserSelect?.(user)}
              >
                {/* صورة المستخدم */}
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* معلومات المستخدم */}
                <div className="flex-1">
                  <div className="flex items-center">
                    <span 
                      className="font-medium text-gray-800"
                      style={{ color: user.usernameColor || '#000' }}
                    >
                      {user.username}
                    </span>
                    {user.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    المستوى: {user.level || 1} | النقاط: {user.points || 0}
                  </div>
                </div>

                {/* نوع المستخدم */}
                <div className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                  {user.userType === 'admin' ? 'مدير' : 
                   user.userType === 'moderator' ? 'مشرف' : 
                   user.userType === 'owner' ? 'مالك' : 'عضو'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {displayPagination && displayPagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => handlePageChange(displayPagination.page - 1)}
            disabled={!displayPagination.hasPrev}
            className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            السابق
          </button>
          
          <span className="text-sm text-gray-600">
            صفحة {displayPagination.page} من {displayPagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(displayPagination.page + 1)}
            disabled={!displayPagination.hasNext}
            className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            التالي
          </button>
        </div>
      )}

      {/* معلومات إضافية */}
      {displayPagination && (
        <div className="text-xs text-gray-500 text-center mt-2">
          إجمالي المستخدمين: {displayPagination.total}
        </div>
      )}
    </div>
  );
};