import { useState, useEffect } from "react";
import { TrendingUp, Award, Users, Target, Star, Trophy, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TrustAnalyticsProps {
  userId: string;
}

interface TrustHistory {
  id: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlocked_at: string;
}

interface UserStats {
  trust_score: number;
  total_help_given: number;
  total_help_received: number;
  achievement_points: number;
  last_active: string;
}

export const TrustAnalytics = ({ userId }: TrustAnalyticsProps) => {
  const { user } = useAuth();
  const [trustHistory, setTrustHistory] = useState<TrustHistory[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch trust score history
      const { data: history } = await supabase
        .from("trust_score_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch user achievements
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements(name, description, icon, category, points)
        `)
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false });

      // Fetch user stats
      const { data: stats } = await supabase
        .from("profiles")
        .select("trust_score, total_help_given, total_help_received, achievement_points, last_active")
        .eq("id", userId)
        .single();

      setTrustHistory(history || []);
      setAchievements(
        userAchievements?.map(ua => ({
          id: ua.id,
          name: ua.achievements.name,
          description: ua.achievements.description,
          icon: ua.achievements.icon,
          category: ua.achievements.category,
          points: ua.achievements.points,
          unlocked_at: ua.unlocked_at
        })) || []
      );
      setUserStats(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrustLevel = (score: number) => {
    if (score >= 800) return { level: "Legend", color: "text-purple-600", bg: "bg-purple-100" };
    if (score >= 600) return { level: "Expert", color: "text-blue-600", bg: "bg-blue-100" };
    if (score >= 400) return { level: "Pro", color: "text-green-600", bg: "bg-green-100" };
    if (score >= 200) return { level: "Trusted", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { level: "Newcomer", color: "text-gray-600", bg: "bg-gray-100" };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'helping': return <Users className="w-4 h-4" />;
      case 'trust': return <Star className="w-4 h-4" />;
      case 'skills': return <Target className="w-4 h-4" />;
      case 'community': return <Trophy className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!userStats) return null;

  const trustLevel = getTrustLevel(userStats.trust_score);
  const nextMilestone = Math.ceil(userStats.trust_score / 100) * 100;
  const progressToNext = ((userStats.trust_score % 100) / 100) * 100;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trust Score</p>
                <p className="text-2xl font-bold">{userStats.trust_score}</p>
                <Badge className={`mt-2 ${trustLevel.bg} ${trustLevel.color}`}>
                  {trustLevel.level}
                </Badge>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Help Given</p>
                <p className="text-2xl font-bold">{userStats.total_help_given}</p>
                <p className="text-xs text-muted-foreground">students helped</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Help Received</p>
                <p className="text-2xl font-bold">{userStats.total_help_received}</p>
                <p className="text-xs text-muted-foreground">times helped</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Achievement Points</p>
                <p className="text-2xl font-bold">{userStats.achievement_points}</p>
                <p className="text-xs text-muted-foreground">points earned</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Milestone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progress to Next Milestone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current: {userStats.trust_score}</span>
              <span>Next: {nextMilestone}</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {nextMilestone - userStats.trust_score} points to reach {nextMilestone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Trust History</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trust Score Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trustHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No trust score changes yet
                  </p>
                ) : (
                  trustHistory.map((change) => (
                    <div key={change.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          change.new_score > change.old_score ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{change.change_reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(change.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          change.new_score > change.old_score ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {change.new_score > change.old_score ? '+' : ''}
                          {change.new_score - change.old_score}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {change.old_score} → {change.new_score}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievements Unlocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 col-span-2">
                    No achievements unlocked yet
                  </p>
                ) : (
                  achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{achievement.name}</h3>
                          <Badge variant="secondary">{achievement.points} pts</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getCategoryIcon(achievement.category)}
                          <span className="text-xs text-muted-foreground capitalize">
                            {achievement.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
