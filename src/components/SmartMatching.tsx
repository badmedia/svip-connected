import { useState, useEffect } from "react";
import { Sparkles, MapPin, Users, Star, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskCard } from "@/components/TaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SmartMatch {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  task_type: string;
  status: string;
  created_at: string;
  match_score: number;
  match_reasons: string[];
  profiles: {
    full_name: string;
    college: string;
    trust_score: number;
    avatar_url: string;
  };
}

interface MatchingFilters {
  skills: string[];
  location: string;
  college: string;
  maxDistance: number;
  trustScoreMin: number;
  timeAvailable: number;
  difficulty: string;
}

export const SmartMatching = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<SmartMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MatchingFilters>({
    skills: [],
    location: "",
    college: "",
    maxDistance: 10,
    trustScoreMin: 0,
    timeAvailable: 60,
    difficulty: "any"
  });
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchSmartMatches();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("skills, college, location, interests")
        .eq("id", user?.id)
        .single();
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchSmartMatches = async () => {
    try {
      setLoading(true);
      
      // Get user's skills and preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("skills, college, location, interests")
        .eq("id", user?.id)
        .single();

      if (!profile) return;

      // Fetch all open tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles(full_name, college, trust_score, avatar_url)
        `)
        .eq("status", "open")
        .neq("user_id", user?.id);

      if (!tasks) return;

      // Calculate match scores
      const matches = tasks.map(task => {
        const matchScore = calculateMatchScore(task, profile);
        return {
          ...task,
          match_score: matchScore.score,
          match_reasons: matchScore.reasons
        };
      });

      // Sort by match score and filter
      const sortedMatches = matches
        .filter(match => match.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10);

      setMatches(sortedMatches);
    } catch (error) {
      console.error("Error fetching smart matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = (task: any, userProfile: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Skill matching (40% weight)
    if (userProfile.skills && task.category) {
      const skillMatch = userProfile.skills.some((skill: string) => 
        skill.toLowerCase().includes(task.category.toLowerCase()) ||
        task.category.toLowerCase().includes(skill.toLowerCase())
      );
      if (skillMatch) {
        score += 40;
        reasons.push("Matches your skills");
      }
    }

    // College matching (20% weight)
    if (userProfile.college && task.profiles.college === userProfile.college) {
      score += 20;
      reasons.push("Same college");
    }

    // Trust score (20% weight)
    if (task.profiles.trust_score >= 50) {
      score += 20;
      reasons.push("High trust score");
    } else if (task.profiles.trust_score >= 25) {
      score += 10;
      reasons.push("Good trust score");
    }

    // Interest matching (10% weight)
    if (userProfile.interests && task.tags) {
      const interestMatch = userProfile.interests.some((interest: string) =>
        task.tags.includes(interest)
      );
      if (interestMatch) {
        score += 10;
        reasons.push("Matches your interests");
      }
    }

    // Location proximity (10% weight)
    if (userProfile.location && task.location) {
      // Simplified location matching
      if (userProfile.location.toLowerCase() === task.location.toLowerCase()) {
        score += 10;
        reasons.push("Same location");
      }
    }

    return { score, reasons };
  };

  const applyFilters = () => {
    fetchSmartMatches();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Smart Matches
          </h2>
          <p className="text-muted-foreground">
            AI-powered task recommendations based on your skills and preferences
          </p>
        </div>
        <Button onClick={fetchSmartMatches} variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          Refresh Matches
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Smart Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Trust Score</label>
              <Select
                value={filters.trustScoreMin.toString()}
                onValueChange={(value) => setFilters({...filters, trustScoreMin: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any</SelectItem>
                  <SelectItem value="25">25+</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="75">75+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Available (minutes)</label>
              <Select
                value={filters.timeAvailable.toString()}
                onValueChange={(value) => setFilters({...filters, timeAvailable: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select
                value={filters.difficulty}
                onValueChange={(value) => setFilters({...filters, difficulty: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button 
              onClick={() => setFilters({
                skills: [],
                location: "",
                college: "",
                maxDistance: 10,
                trustScoreMin: 0,
                timeAvailable: 60,
                difficulty: "any"
              })}
              variant="outline"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matches */}
      <div className="space-y-4">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Smart Matches Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later for new tasks that match your skills.
              </p>
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.id} className="relative">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-primary-foreground">
                  {match.match_score}% match
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{match.title}</h3>
                      <p className="text-muted-foreground">{match.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₹{match.budget}</p>
                      <p className="text-sm text-muted-foreground">{match.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {match.profiles.full_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {match.profiles.college}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {match.profiles.trust_score} trust
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(match.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Why this matches you:</p>
                    <div className="flex flex-wrap gap-2">
                      {match.match_reasons.map((reason, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline">
                      Save for Later
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
