import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Clock, CheckCircle } from "lucide-react";

interface Stats {
  totalBooks: number;
  availableBooks: number;
  pendingRequests: number;
  activeLoans: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    availableBooks: 0,
    pendingRequests: 0,
    activeLoans: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);

    const [booksResult, availableResult, pendingResult, activeResult] = await Promise.all([
      supabase.from("books").select("id", { count: "exact", head: true }),
      supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("loan_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("loan_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);

    setStats({
      totalBooks: booksResult.count || 0,
      availableBooks: availableResult.count || 0,
      pendingRequests: pendingResult.count || 0,
      activeLoans: activeResult.count || 0,
    });

    setIsLoading(false);
  };

  const statCards = [
    {
      title: "Total de Livros",
      value: stats.totalBooks,
      icon: BookOpen,
      color: "text-[#8b1da2]",
      bgColor: "bg-[#8b1da2]/10",
    },
    {
      title: "Disponíveis",
      value: stats.availableBooks,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Solicitações Pendentes",
      value: stats.pendingRequests,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Empréstimos Ativos",
      value: stats.activeLoans,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral da biblioteca corporativa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoading ? "-" : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;