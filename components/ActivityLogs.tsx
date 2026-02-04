"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import type { ActivityLog, ActivityType } from "@/types/guest";
import { Activity, Filter, UserCheck, UserPlus, Shield, LogIn } from "lucide-react";

export default function ActivityLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");

  const fetchLogs = useCallback(async () => {
    try {
      if (!user) return;

      const token = await user.getIdToken();
      const url = filterType === "all"
        ? "/api/admin/logs"
        : `/api/admin/logs?type=${filterType}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, filterType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "registration":
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case "check_in":
        return <UserCheck className="h-5 w-5 text-green-600" />;
      case "admin_created":
        return <Shield className="h-5 w-5 text-purple-600" />;
      case "admin_login":
        return <LogIn className="h-5 w-5 text-gray-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case "registration":
        return "bg-blue-100 text-blue-800";
      case "check_in":
        return "bg-green-100 text-green-800";
      case "admin_created":
        return "bg-purple-100 text-purple-800";
      case "admin_login":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatActivityType = (type: ActivityType) => {
    switch (type) {
      case "registration":
        return "Registration";
      case "check_in":
        return "Check-In";
      case "admin_created":
        return "Admin Created";
      case "admin_login":
        return "Admin Login";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | "all")}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Activities</option>
            <option value="registration">Registrations</option>
            <option value="check_in">Check-Ins</option>
            <option value="admin_created">Admin Created</option>
            <option value="admin_login">Admin Logins</option>
          </select>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No activity logs found
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="shrink-0 mt-1">
                    {getActivityIcon(log.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(
                          log.type
                        )}`}
                      >
                        {formatActivityType(log.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">{log.details}</p>
                    <p className="text-xs text-gray-500">
                      Performed by: <span className="font-medium">{log.performedBy}</span>
                      {log.targetGuest && (
                        <span className="ml-2">
                          • Guest: <span className="font-medium">{log.targetGuest}</span>
                        </span>
                      )}
                      {log.targetAdmin && (
                        <span className="ml-2">
                          • Admin: <span className="font-medium">{log.targetAdmin}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Registrations</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {logs.filter((l) => l.type === "registration").length}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Check-Ins</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {logs.filter((l) => l.type === "check_in").length}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Admins Created</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {logs.filter((l) => l.type === "admin_created").length}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Total Activities</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
        </div>
      </div>
    </div>
  );
}
