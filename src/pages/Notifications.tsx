import React from 'react';
import { Bell } from 'lucide-react';

const Notifications: React.FC = () => {
  return (
    <div className="min-h-[80vh] bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <Bell className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Belum ada notifikasi</h2>
        <p className="text-gray-500 text-sm">
          Pemberitahuan tentang pesanan, promo, dan info lainnya akan muncul di sini.
        </p>
      </div>
    </div>
  );
};

export default Notifications;
