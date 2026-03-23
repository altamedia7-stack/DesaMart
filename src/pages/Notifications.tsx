import React, { useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotification();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  return (
    <div className="min-h-[80vh] bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          {notifications.length > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              <Check className="h-4 w-4" /> Tandai semua dibaca
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center w-full mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <Bell className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Belum ada notifikasi</h2>
            <p className="text-gray-500 text-sm">
              Pemberitahuan tentang pesanan, promo, dan info lainnya akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-4 sm:p-6 hover:bg-gray-50 transition cursor-pointer flex gap-4 ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                >
                  <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notif.isRead ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm sm:text-base font-medium ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap ml-2">
                        {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="flex-shrink-0 flex items-center">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
