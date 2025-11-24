import { Users, CheckSquare, Mail } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-white/50 text-base">Welcome back! Here's what's happening today.</p>
      </div>
      
      {/* Stats Cards - Professional Blue Theme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Total Clients</h2>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">0</p>
          </div>
        </div>
        
        <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Active Tasks</h2>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">0</p>
          </div>
        </div>
        
        <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Unread Emails</h2>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">0</p>
          </div>
        </div>
      </div>

      {/* Recent Activity - Professional Theme */}
      <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Recent Activity</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
              View all
            </button>
          </div>
          <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
            <div className="text-center space-y-2">
              <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No recent activity</p>
              <p className="text-slate-500 dark:text-white/30 text-xs">Activity will appear here as it happens</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

