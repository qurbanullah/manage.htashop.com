import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layouts/TopBar";
import { Sidebar } from "@/components/layouts/Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
