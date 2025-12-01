import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import CountUp from 'react-countup';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Users, Scale, MapPin, TrendingUp, FileText, Activity, Calendar, DollarSign } from 'lucide-react';


// Mock Data (Replace with API calls later)
const mockUserGrowth = [
  { month: 'Jan', users: 1200 },
  { month: 'Feb', users: 1900 },
  { month: 'Mar', users: 2800 },
  { month: 'Apr', users: 3600 },
  { month: 'May', users: 4200 },
  { month: 'Jun', users: 5100 },
];

const mockAreaUsers = [
  { area: 'Mumbai', users: 3200 },
  { area: 'Delhi', users: 2800 },
  { area: 'Bangalore', users: 2400 },
  { area: 'Pune', users: 1800 },
  { area: 'Chennai', users: 1500 },
  { area: 'Hyderabad', users: 1300 },
];

const mockTransactions = [
  { day: 'Mon', transactions: 45 },
  { day: 'Tue', transactions: 72 },
  { day: 'Wed', transactions: 58 },
  { day: 'Thu', transactions: 89 },
  { day: 'Fri', transactions: 103 },
  { day: 'Sat', transactions: 67 },
  { day: 'Sun', transactions: 41 },
];

const mockUserTypes = [
  { name: 'Clients', value: 8200, color: '#3b82f6' },
  { name: 'Lawyers', value: 1800, color: '#10b981' },
];

const mockLawyerClientDonut = [
  { name: 'Lawyers', value: 1800 },
  { name: 'Clients', value: 8200 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminDashboardPage: FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const stats = [
    { label: 'Total Users', value: 10000, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Lawyers', value: 1800, icon: Scale, color: 'bg-green-500' },
    { label: 'Cases Tracked', value: 5420, icon: FileText, color: 'bg-purple-500' },
    { label: 'Transactions', value: 475, icon: DollarSign, color: 'bg-yellow-500' },
  ];

  if (!isClient) return null; // Prevent hydration mismatch

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor platform growth, user activity, and legal case insights.</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    <CountUp end={stat.value} duration={2.5} separator="," />
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* 1. User Growth Line Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              User Growth (6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mockUserGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Area-wise Users Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              Users by City
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockAreaUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="area" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="users" radius={[8, 8, 0, 0]}>
                  {mockAreaUsers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Transactions Area Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-yellow-600" />
              Daily Transactions (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={mockTransactions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke="#f59e0b"
                  fill="#fde68a"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 4. User Types Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              User Type Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={mockUserTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockUserTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Clients (82%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Lawyers (18%)</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
