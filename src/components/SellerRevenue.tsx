import React, { useMemo } from 'react';
import { Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface SellerRevenueProps {
  orders: Order[];
  travelBookings?: any[];
}

const SellerRevenue: React.FC<SellerRevenueProps> = ({ orders, travelBookings = [] }) => {
  const chartData = useMemo(() => {
    // Filter only completed orders and confirmed/paid travel bookings
    const completedOrders = orders.filter(order => order.status === 'completed' || order.status === 'paid');
    const completedTravel = travelBookings.filter(booking => booking.status === 'confirmed' || booking.status === 'paid');

    // Group by month
    const monthlyData: Record<string, { month: string; revenue: number; sales: number }> = {};

    const processItem = (item: any) => {
      // Handle Firestore Timestamp or string
      let date: Date;
      if (item.createdAt?.toDate) {
        date = item.createdAt.toDate();
      } else if (typeof item.createdAt === 'string') {
        date = parseISO(item.createdAt);
      } else if (typeof item.createdAt === 'number') {
        date = new Date(item.createdAt);
      } else {
        date = new Date(); // Fallback
      }

      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yyyy', { locale: id });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          revenue: 0,
          sales: 0
        };
      }

      // Calculate revenue (totalPrice - shippingCost for orders, totalPrice for travel)
      const revenue = item.totalPrice - (item.shippingCost || 0);
      
      monthlyData[monthKey].revenue += revenue;
      monthlyData[monthKey].sales += 1;
    };

    completedOrders.forEach(processItem);
    completedTravel.forEach(processItem);

    // Convert to array and sort by month
    return Object.entries(monthlyData)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, data]) => data);
  }, [orders, travelBookings]);

  const totalRevenue = chartData.reduce((sum, data) => sum + data.revenue, 0);
  const totalSales = chartData.reduce((sum, data) => sum + data.sales, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-1">Total Pendapatan</h3>
          <p className="text-3xl font-bold text-emerald-600">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-1">Total Penjualan Selesai</h3>
          <p className="text-3xl font-bold text-emerald-600">
            {totalSales}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Grafik Pendapatan Bulanan</h3>
        
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `Rp ${(value / 1000).toLocaleString('id-ID')}k`}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dx={10}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'Pendapatan') return [`Rp ${value.toLocaleString('id-ID')}`, name];
                    return [value, name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="revenue" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="sales" name="Jumlah Penjualan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">Belum ada data penjualan yang selesai.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerRevenue;
