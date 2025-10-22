import { useState, useEffect } from "react";
import { Trophy, Star, Target, Users, Award, Calendar, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlocked_at: string;
  requirements: any;
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  college: string;
  trust_score: number;
  achievement_points: number;
  total_help_given: number;
  avatar_url: string;
  rank: number;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  target: number;
  current: number;
  reward: number;
  deadline: string;
  is_completed: boolean;
}

export const GamificationSystem = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGamificationData();
    }
  }, [user]);

  const fetchGamificationData = async () => {
    try {
      // Fetch user achievements
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements!inner(name, description, icon, category, points, requirements)
        `)
        .eq("user_id", user?.id)
        .order("unlocked_at", { ascending: false });

      // Fetch leaderboard
      const { data: leaderboardData } = await supabase
        .from("profiles")
        .select("id, full_name, college, trust_score, achievement_points, total_help_given, avatar_url")
        .order("achievement_points", { ascending: false })
        .limit(20);

      // Fetch user stats
      const { data: stats } = await supabase
        .from("profiles")
        .select("trust_score, achievement_points, total_help_given, total_help_received")
        .eq("id", user?.id)
        .single();

      // Create mock challenges (in a real app, these would come from the database)
      const mockChallenges: Challenge[] = [
        {
          id: "1",
          name: "Helping Hand",
          description: "Help 5 students this week",
          type: "weekly",
          target: 5,
          current: stats?.total_help_given || 0,
          reward: 50,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_completed: false
        },
        {
          id: "2",
          name: "Trust Builder",
          description: "Reach 100 trust score",
          type: "milestone",
          target: 100,
          current: stats?.trust_score || 0,
          reward: 100,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_completed: false
        },
        {
          id: "3",
          name: "Study Group Champion",
          description: "Join 3 study groups",
          type: "social",
          target: 3,
          current: 0,
          reward: 75,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_completed: false
        }
      ];

      setAchievements(
        userAchievements?.map(ua => ({
          id: ua.id,
          name: (ua.achievements as any)?.name || '',
          description: (ua.achievements as any)?.description || '',
          icon: (ua.achievements as any)?.icon || '',
          category: (ua.achievements as any)?.category || '',
          points: (ua.achievements as any)?.points || 0,
          unlocked_at: ua.unlocked_at,
          requirements: (ua.achievements as any)?.requirements || {}
        })) || []
      );

      const leaderboardWithRank = leaderboardData?.map((entry, index) => ({
        ...entry,
        rank: index + 1
      })) || [];

      setLeaderboard(leaderboardWithRank);
      setChallenges(mockChallenges);
      setUserStats(stats);
    } catch (error) {
      console.error("Error fetching gamification data:", error);
    } finally {
      setLoading(false);
    }
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getChallengeProgress = (challenge: Challenge) => {
    return Math.min((challenge.current / challenge.target) * 100, 100);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Gamification Hub</h2>
          <p className="text-muted-foreground">
            Track your progress, earn achievements, and climb the leaderboards!
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Achievement Points</p>
                <p className="text-2xl font-bold">{userStats?.achievement_points || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Trust Score</p>
                <p className="text-2xl font-bold">{userStats?.trust_score || 0}</p>
              </div>
              <Star className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Help Given</p>
                <p className="text-2xl font-bold">{userStats?.total_help_given || 0}</p>
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
                <p className="text-2xl font-bold">{userStats?.total_help_received || 0}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements">
            Achievements ({achievements.length})
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="challenges">
            Challenges ({challenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                    <p className="text-muted-foreground">
                      Start helping others to unlock your first achievement!
                    </p>
                  </div>
                ) : (
                  achievements.map((achievement) => (
                    <Card key={achievement.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{achievement.name}</h3>
                              <Badge variant="secondary">{achievement.points} pts</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {achievement.description}
                            </p>
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(achievement.category)}
                              <span className="text-xs text-muted-foreground capitalize">
                                {achievement.category}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="flex items-center gap-3">
                        <img
                          src={entry.avatar_url || "/placeholder.svg"}
                          alt={entry.full_name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold">{entry.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{entry.college}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Points</p>
                          <p className="font-bold text-yellow-600">{entry.achievement_points}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Trust</p>
                          <p className="font-bold text-blue-600">{entry.trust_score}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Helped</p>
                          <p className="font-bold text-green-600">{entry.total_help_given}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {challenges.map((challenge) => (
                  <Card key={challenge.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{challenge.name}</h3>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {challenge.reward} pts
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.current}/{challenge.target}</span>
                        </div>
                        <Progress value={getChallengeProgress(challenge)} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(challenge.deadline).toLocaleDateString()}
                        </div>
                        {challenge.is_completed && (
                          <Badge className="bg-green-100 text-green-800">
                            Completed!
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};