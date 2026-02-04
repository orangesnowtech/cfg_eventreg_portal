"use client";

import { useEffect, useState, useCallback } from "react";
import { Guest, AdminRole } from "@/types/guest";
import {
  Download,
  Search,
  Filter,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Shield,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import UserManagement from "./UserManagement";
import ActivityLogs from "./ActivityLogs";

interface GuestWithId extends Guest {
  id: string;
}

type TabType = "guests" | "users" | "logs";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<GuestWithId[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<GuestWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabType>("guests");
  const [userRole, setUserRole] = useState<AdminRole | null>(null);

  const fetchUserRole = useCallback(async () => {
    try {
      if (!user) return;

      const token = await user.getIdToken();
      
      const response = await fetch(`/api/admin/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // Default to admin if error
      setUserRole("admin");
    }
  }, [user]);

  const applyFilters = useCallback(() => {
    let filtered = [...guests];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (guest) =>
          guest.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.accessCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          guest.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Guest type filter
    if (filterType !== "all") {
      filtered = filtered.filter((guest) => guest.guestType === filterType);
    }

    // Check-in status filter
    if (filterStatus === "checked-in") {
      filtered = filtered.filter((guest) => guest.checkedIn);
    } else if (filterStatus === "pending") {
      filtered = filtered.filter((guest) => !guest.checkedIn);
    }

    setFilteredGuests(filtered);
  }, [searchTerm, filterType, filterStatus, guests]);

  useEffect(() => {
    fetchGuests();
    fetchUserRole();
  }, [fetchUserRole]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchGuests = async () => {
    try {
      const response = await fetch("/api/guests");
      const data = await response.json();
      setGuests(data.guests || []);
      setFilteredGuests(data.guests || []);
    } catch (error) {
      console.error("Error fetching guests:", error);
      setGuests([]);
      setFilteredGuests([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Organization",
      "Job Title",
      "Guest Type",
      "Access Code",
      "Checked In",
      "Registered At",
      "Checked In At",
    ];

    const rows = filteredGuests.map((guest) => [
      guest.firstName || "",
      guest.lastName || "",
      guest.email || "",
      guest.phone || "",
      guest.organizationName || "",
      guest.jobTitle || "",
      guest.guestType || "",
      guest.accessCode || "",
      guest.checkedIn ? "Yes" : "No",
      guest.registeredAt ? new Date(guest.registeredAt).toLocaleString() : "",
      guest.checkedInAt ? new Date(guest.checkedInAt).toLocaleString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell?.toString() || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Statistics
  const totalGuests = guests.length;
  const checkedInGuests = guests.filter((g) => g.checkedIn).length;
  const pendingGuests = totalGuests - checkedInGuests;
  const checkInRate =
    totalGuests > 0 ? ((checkedInGuests / totalGuests) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Only show for super_admin */}
      {userRole === "super_admin" && (
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
          <button
            onClick={() => setActiveTab("guests")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "guests"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Guest Management
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "users"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "logs"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Activity Logs
          </button>
        </div>
      )}

      {/* Conditional Content Based on Active Tab */}
      {activeTab === "users" && userRole === "super_admin" ? (
        <UserManagement />
      ) : activeTab === "logs" && userRole === "super_admin" ? (
        <ActivityLogs />
      ) : (
        <>
          {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registered</p>
              <p className="text-3xl font-bold text-gray-900">{totalGuests}</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Checked In</p>
              <p className="text-3xl font-bold text-green-600">
                {checkedInGuests}
              </p>
            </div>
            <UserCheck className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600">
                {pendingGuests}
              </p>
            </div>
            <Clock className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check-in Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {checkInRate}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, code, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Guest Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="Active Client">Active Client</option>
              <option value="Prospective Client">Prospective Client</option>
              <option value="Visitor">Visitor</option>
              <option value="Friend of the House">Friend of the House</option>
              <option value="Media/Press">Media/Press</option>
              <option value="Organizer">Organizer</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="checked-in">Checked In</option>
            <option value="pending">Pending</option>
          </select>

          {/* Download Button */}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Showing {filteredGuests.length} of {totalGuests} guests
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {guest.firstName} {guest.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{guest.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{guest.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {guest.organizationName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {guest.jobTitle}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {guest.guestType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-bold text-gray-900">
                      {guest.accessCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {guest.checkedIn ? (
                      <div>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Checked In
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {guest.checkedInAt
                            ? new Date(guest.checkedInAt).toLocaleString()
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {guest.registeredAt
                      ? new Date(guest.registeredAt).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredGuests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No guests found matching your filters</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
