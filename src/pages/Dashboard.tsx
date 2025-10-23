import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Home, MessageSquare, User as UserIcon, LogOut, Bell, Trophy, BookOpen, BarChart3, Sparkles, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PostTaskModal } from "@/components/PostTaskModal";
import { TaskCard } from "@/components/TaskCard";
import { Badge as BadgeDisplay } from "@/components/BadgeDisplay";
import { TrustAnalytics } from "@/components/TrustAnalytics";
import { SmartMatching } from "@/components/SmartMatching";
import { NotificationSystem } from "@/components/NotificationSystem";
import { StudyGroups } from "@/components/StudyGroups";
import { GamificationSystem } from "@/components/GamificationSystem";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { SecurityDashboard } from "@/components/SecurityDashboard";
import { useToast } from "@/hooks/use-toast";
import { UserChats } from "@/components/UserChats";
import { EncryptionDemo } from "@/components/EncryptionDemo";
import { useAdmin } from "@/hooks/useAdmin";

type TaskType = "offer" | "request";
type TaskCategory = "notes_typing" | "ppt_design" | "tutoring" | "app_testing" | "writing_help";
type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  budget: number;
  category: TaskCategory;
  task_type: TaskType;
  status: TaskStatus;
  created_at: string;
  profiles: {
    full_name: string;
    college: string;
    trust_score: number;
    avatar_url: string;
  };
}

type DashboardProps = {
  initialTab?: string;
};

const Dashboard = ({ initialTab }: DashboardProps) => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "near-me" | "my-college" | "requests" | "offers">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userCollege, setUserCollege] = useState<string>("");
  const [activeTab, setActiveTab] = useState(initialTab || "tasks");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTasks();
    fetchUserProfile();
    fetchUnreadNotifications();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    filterTasks();
  }, [tasks, activeFilter, searchQuery, userCollege]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("college")
      .eq("id", user.id)
      .single();
    if (data) setUserCollege(data.college || "");
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles(full_name, college, trust_score, avatar_url)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);
      
      setUnreadNotifications(data?.length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Set to 0 if there's an error (table might not exist yet)
      setUnreadNotifications(0);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter
    switch (activeFilter) {
      case "my-college":
        filtered = filtered.filter((task) => task.profiles.college === userCollege);
        break;
      case "requests":
        filtered = filtered.filter((task) => task.task_type === "request");
        break;
      case "offers":
        filtered = filtered.filter((task) => task.task_type === "offer");
        break;
    }

    setFilteredTasks(filtered);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-16 sm:w-20 lg:w-64 glass-card border-r border-border flex flex-col items-center lg:items-start p-2 sm:p-4 space-y-4 sm:space-y-6 z-50">
        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent hidden lg:block">
          S.v.i.p
        </div>
        <div className="text-lg sm:text-xl font-bold lg:hidden">S</div>

        <nav className="flex-1 w-full space-y-1 sm:space-y-2">
          <Button 
            variant={activeTab === "tasks" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("tasks")}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Tasks</span>
          </Button>
          <Button 
            variant={activeTab === "smart-matching" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("smart-matching")}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Smart Match</span>
          </Button>
          <Button 
            variant={activeTab === "study-groups" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("study-groups")}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Study Groups</span>
          </Button>
          <Button 
            variant={activeTab === "notifications" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start relative h-10 sm:h-11" 
            onClick={() => setActiveTab("notifications")}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Notifications</span>
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs">
                {unreadNotifications}
              </Badge>
            )}
          </Button>
          <Button 
            variant={activeTab === "analytics" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Analytics</span>
          </Button>
          <Button 
            variant={activeTab === "gamification" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("gamification")}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Achievements</span>
          </Button>
          <Button 
            variant={activeTab === "chats" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("chats")}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Chats</span>
          </Button>
          
          <Button 
            variant={activeTab === "encryption" ? "secondary" : "ghost"} 
            className="w-full justify-center lg:justify-start h-10 sm:h-11" 
            onClick={() => setActiveTab("encryption")}
          >
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Encryption</span>
          </Button>

          {isAdmin && (
            <Button 
              variant={activeTab === "security" ? "secondary" : "ghost"} 
              className="w-full justify-center lg:justify-start h-10 sm:h-11" 
              onClick={() => setActiveTab("security")}
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden lg:inline ml-2">Security</span>
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-center lg:justify-start h-10 sm:h-11" onClick={() => navigate("/profile")}>
            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden lg:inline ml-2">Profile</span>
          </Button>
        </nav>

        <Button variant="ghost" className="w-full justify-center lg:justify-start text-destructive h-10 sm:h-11" onClick={signOut}>
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden lg:inline ml-2">Logout</span>
        </Button>
      </aside>

      {/* Main Content */}
      <main className="ml-16 sm:ml-20 lg:ml-64 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  SVIPit — S.V.I.P: Skill Value Interaction Platform
                </h1>
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {activeTab === "tasks" && "Task Feed"}
                  {activeTab === "chats" && "Your Chats"}
                  {activeTab === "encryption" && "Encryption Test"}
                  {activeTab === "smart-matching" && "Smart Matching"}
                  {activeTab === "study-groups" && "Study Groups"}
                  {activeTab === "notifications" && "Notifications"}
                  {activeTab === "analytics" && "Analytics"}
                  {activeTab === "gamification" && "Achievements"}
                  {activeTab === "security" && "Security Dashboard"}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {activeTab === "tasks" && "Got 10 minutes? Earn ₹50. Help a classmate. Build trust."}
                  {activeTab === "chats" && "Conversations for tasks you're part of"}
                  {activeTab === "smart-matching" && "AI-powered task recommendations based on your skills"}
                  {activeTab === "study-groups" && "Connect with fellow students for collaborative learning"}
                  {activeTab === "notifications" && "Stay updated with your community activities"}
                  {activeTab === "analytics" && "Track your trust score and helping statistics"}
                  {activeTab === "gamification" && "Earn achievements and climb the leaderboards"}
                  {activeTab === "security" && "Monitor security events and system health"}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <BadgeDisplay trustScore={user?.user_metadata?.trust_score || 0} />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="tasks" className="space-y-6">
          {/* Search and Filters */}
          <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { key: "all", label: "All Tasks" },
                { key: "my-college", label: "My College" },
                { key: "requests", label: "Requests" },
                { key: "offers", label: "Offers" },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={activeFilter === filter.key ? "default" : "outline"}
                  onClick={() => setActiveFilter(filter.key as any)}
                  className="whitespace-nowrap h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tasks Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 glass-card rounded-3xl"
            >
              <p className="text-xl mb-2">No tasks yet</p>
              <p className="text-muted-foreground">Be the first to post a task!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-3 sm:gap-4">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TaskCard task={task} onConnect={() => navigate(`/chat?task=${task.id}`)} />
                </motion.div>
              ))}
            </div>
          )}
            </TabsContent>

              <TabsContent value="chats">
                <UserChats />
              </TabsContent>

              <TabsContent value="encryption">
                <EncryptionDemo />
              </TabsContent>

            <TabsContent value="smart-matching">
              <SmartMatching />
            </TabsContent>

            <TabsContent value="study-groups">
              <StudyGroups />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationSystem />
            </TabsContent>

            <TabsContent value="analytics">
              <TrustAnalytics userId={user?.id || ""} />
            </TabsContent>

            <TabsContent value="gamification">
              <GamificationSystem />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="security">
                <SecurityDashboard />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      {/* Floating Action Button */}
      {activeTab === "tasks" && (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsPostModalOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-primary to-primary-glow shadow-2xl flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
      </motion.button>
      )}

      <PostTaskModal open={isPostModalOpen} onOpenChange={setIsPostModalOpen} onTaskCreated={fetchTasks} />
    </div>
  );
};

export default Dashboard;