import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Star, Clock, Tag, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TaskCard } from "@/components/TaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { safeIlikeQueryTerm } from "@/lib/sanitize";
import { checkRateLimit, searchRateLimiter } from "@/lib/rateLimiter";
import { logSecurityEvent, sanitizeError } from "@/lib/security";

interface SearchFilters {
  query: string;
  category: string;
  task_type: string;
  budget_min: number;
  budget_max: number;
  trust_score_min: number;
  college: string;
  location: string;
  difficulty: string;
  time_available: number;
  tags: string[];
  sort_by: string;
  sort_order: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  task_type: string;
  status: string;
  created_at: string;
  location: string;
  difficulty_level: string;
  tags: string[];
  profiles: {
    full_name: string;
    college: string;
    trust_score: number;
    avatar_url: string;
  };
}

export const AdvancedSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "all",
    task_type: "all",
    budget_min: 0,
    budget_max: 200,
    trust_score_min: 0,
    college: "all",
    location: "",
    difficulty: "all",
    time_available: 0,
    tags: [],
    sort_by: "created_at",
    sort_order: "desc"
  });

  const categories = [
    "notes_typing", "ppt_design", "tutoring", "app_testing", "writing_help"
  ];

  const difficulties = ["beginner", "intermediate", "advanced"];
  const sortOptions = [
    { value: "created_at", label: "Date Created" },
    { value: "budget", label: "Budget" },
    { value: "trust_score", label: "Trust Score" },
    { value: "title", label: "Title" }
  ];

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    try {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      const normalized: SavedSearch[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        filters: (row.search_filters as SearchFilters) ?? filters,
        created_at: row.created_at,
      }));
      setSavedSearches(normalized);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
    }
  };

  const performSearch = async () => {
    if (!user) return;
    
    // Check rate limit for search
    const rateLimitCheck = checkRateLimit(searchRateLimiter, user.id);
    if (!rateLimitCheck.allowed) {
      toast({
        title: "Rate Limit Exceeded",
        description: `Please wait ${rateLimitCheck.retryAfter} seconds before searching again.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      let query: any = supabase
        .from("tasks" as any)
        .select(`
          id, title, description, budget, category, task_type, status, created_at, location, difficulty_level, tags,
          profiles(full_name, college, trust_score, avatar_url)
        `)
        .eq("status", "open")
        .limit(50);

      // Apply filters
      if (filters.query) {
        const term = safeIlikeQueryTerm(filters.query);
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      if (filters.category !== "all") {
        query = query.eq("category", filters.category as any);
      }

      if (filters.task_type !== "all") {
        query = query.eq("task_type", filters.task_type as any);
      }

      if (filters.budget_min > 0) {
        query = query.gte("budget", filters.budget_min);
      }

      if (filters.budget_max < 200) {
        query = query.lte("budget", filters.budget_max);
      }

      if (filters.difficulty !== "all") {
        query = query.eq("difficulty_level", filters.difficulty);
      }

      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }

      if (filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      // Apply sorting
      query = query.order(filters.sort_by, { ascending: filters.sort_order === "asc" });

      const { data, error } = await query;

      if (error) throw error;

      // Filter by trust score on the client side
      let filteredResults = (data || []) as any[];
      if (filters.trust_score_min > 0) {
        filteredResults = filteredResults.filter(task => 
          task.profiles.trust_score >= filters.trust_score_min
        );
      }

      // Coerce to SearchResult by filling optional fields if missing
      const normalizedResults: SearchResult[] = filteredResults.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        budget: t.budget,
        category: t.category,
        task_type: t.task_type,
        status: t.status,
        created_at: t.created_at,
        location: t.location ?? "",
        difficulty_level: t.difficulty_level ?? "",
        tags: t.tags ?? [],
        profiles: t.profiles,
      }));
      setResults(normalizedResults);
      
      // Log successful search
      await logSecurityEvent('search_performed', {
        query: filters.query,
        filters: filters,
        result_count: normalizedResults.length
      }, user.id);
    } catch (error: any) {
      // Log search error
      await logSecurityEvent('search_failed', {
        error: error.message,
        filters: filters
      }, user.id);
      
      toast({
        title: "Search Error",
        description: sanitizeError(error) || "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your search",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: user?.id,
          name: searchName,
          search_filters: filters
        });

      if (error) throw error;

      toast({
        title: "Search Saved!",
        description: "Your search has been saved successfully.",
      });

      setShowSaveDialog(false);
      setSearchName("");
      fetchSavedSearches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save search",
        variant: "destructive",
      });
    }
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    setShowFilters(true);
  };

  const deleteSavedSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", searchId);

      if (error) throw error;

      toast({
        title: "Search Deleted",
        description: "Your saved search has been deleted.",
      });

      fetchSavedSearches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete search",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      query: "",
      category: "all",
      task_type: "all",
      budget_min: 0,
      budget_max: 200,
      trust_score_min: 0,
      college: "all",
      location: "",
      difficulty: "all",
      time_available: 0,
      tags: [],
      sort_by: "created_at",
      sort_order: "desc"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Advanced Search
          </h2>
          <p className="text-muted-foreground">
            Find the perfect tasks with powerful search and filtering
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={performSearch} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Searching..." : "Search"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
      </div>

      {/* Quick Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, skills, or keywords..."
                  value={filters.query}
                  onChange={(e) => setFilters({...filters, query: e.target.value})}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                />
              </div>
            </div>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({...filters, category: value})}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Task Type */}
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select
                  value={filters.task_type}
                  onValueChange={(value) => setFilters({...filters, task_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="request">Requests</SelectItem>
                    <SelectItem value="offer">Offers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <Label>Budget Range: ₹{filters.budget_min} - ₹{filters.budget_max}</Label>
                <div className="space-y-2">
                  <Slider
                    value={[filters.budget_min, filters.budget_max]}
                    onValueChange={(value) => setFilters({
                      ...filters,
                      budget_min: value[0],
                      budget_max: value[1]
                    })}
                    max={200}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹0</span>
                    <span>₹200</span>
                  </div>
                </div>
              </div>

              {/* Trust Score */}
              <div className="space-y-2">
                <Label>Minimum Trust Score</Label>
                <Select
                  value={filters.trust_score_min.toString()}
                  onValueChange={(value) => setFilters({...filters, trust_score_min: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="25">25+</SelectItem>
                    <SelectItem value="50">50+</SelectItem>
                    <SelectItem value="75">75+</SelectItem>
                    <SelectItem value="100">100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select
                  value={filters.difficulty}
                  onValueChange={(value) => setFilters({...filters, difficulty: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {difficulties.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                />
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sort_by}
                    onValueChange={(value) => setFilters({...filters, sort_by: value})}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sort_order}
                    onValueChange={(value) => setFilters({...filters, sort_order: value})}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">↑</SelectItem>
                      <SelectItem value="desc">↓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={performSearch} className="flex-1">
                Apply Filters
              </Button>
              <Button onClick={resetFilters} variant="outline">
                Reset
              </Button>
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Save Search
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="searchName">Search Name</Label>
                      <Input
                        id="searchName"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="e.g., My CS Tasks"
                      />
                    </div>
                    <Button onClick={saveSearch} className="w-full">
                      Save Search
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((search) => (
                <div key={search.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadSavedSearch(search)}
                  >
                    {search.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSavedSearch(search.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Search Results ({results.length})
          </h3>
          {results.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((task) => (
              <TaskCard key={task.id} task={task} onConnect={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
