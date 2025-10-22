import { useState, useEffect } from "react";
import { Plus, Users, Calendar, BookOpen, MapPin, Clock, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  college: string;
  created_by: string;
  max_members: number;
  is_public: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  member_count: number;
}

interface StudySession {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  is_online: boolean;
  meeting_link: string;
  group_id: string;
  created_by: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  attendee_count: number;
}

export const StudyGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    subject: "",
    max_members: 10,
    is_public: true
  });
  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 60,
    location: "",
    is_online: false,
    meeting_link: "",
    group_id: ""
  });

  const subjects = [
    "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology",
    "Engineering", "Business", "Economics", "Psychology", "Literature",
    "History", "Art", "Music", "Languages", "Other"
  ];

  useEffect(() => {
    if (user) {
      fetchStudyGroups();
      fetchStudySessions();
    }
  }, [user]);

  const fetchStudyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("study_groups")
        .select(`
          *,
          profiles(full_name, avatar_url),
          study_group_members(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const groupsWithCount = data?.map(group => ({
        ...group,
        member_count: group.study_group_members?.[0]?.count || 0
      })) || [];

      setGroups(groupsWithCount);
    } catch (error) {
      console.error("Error fetching study groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudySessions = async () => {
    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(`
          *,
          profiles(full_name, avatar_url),
          study_session_attendees(count)
        `)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      const sessionsWithCount = data?.map(session => ({
        ...session,
        attendee_count: session.study_session_attendees?.[0]?.count || 0
      })) || [];

      setSessions(sessionsWithCount);
    } catch (error) {
      console.error("Error fetching study sessions:", error);
    }
  };

  const createStudyGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("study_groups")
        .insert({
          ...newGroup,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Study Group Created!",
        description: "Your study group has been created successfully.",
      });

      setShowCreateGroup(false);
      setNewGroup({
        name: "",
        description: "",
        subject: "",
        max_members: 10,
        is_public: true
      });
      fetchStudyGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create study group",
        variant: "destructive",
      });
    }
  };

  const createStudySession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("study_sessions")
        .insert({
          ...newSession,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Study Session Created!",
        description: "Your study session has been scheduled successfully.",
      });

      setShowCreateSession(false);
      setNewSession({
        title: "",
        description: "",
        scheduled_at: "",
        duration_minutes: 60,
        location: "",
        is_online: false,
        meeting_link: "",
        group_id: ""
      });
      fetchStudySessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create study session",
        variant: "destructive",
      });
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from("study_group_members")
        .insert({
          group_id: groupId,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: "Joined Group!",
        description: "You've successfully joined the study group.",
      });

      fetchStudyGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to join study group",
        variant: "destructive",
      });
    }
  };

  const joinSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("study_session_attendees")
        .insert({
          session_id: sessionId,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: "Joined Session!",
        description: "You've successfully joined the study session.",
      });

      fetchStudySessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to join study session",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || group.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  if (loading) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Study Groups & Sessions
          </h2>
          <p className="text-muted-foreground">
            Connect with fellow students for collaborative learning
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={createStudyGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                    placeholder="e.g., CS101 Study Group"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                    placeholder="Describe what this group is about..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={newGroup.subject}
                    onValueChange={(value) => setNewGroup({...newGroup, subject: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_members">Max Members</Label>
                  <Input
                    id="max_members"
                    type="number"
                    value={newGroup.max_members}
                    onChange={(e) => setNewGroup({...newGroup, max_members: parseInt(e.target.value)})}
                    min="2"
                    max="50"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Study Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={createStudySession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    value={newSession.title}
                    onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                    placeholder="e.g., Calculus Review Session"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newSession.description}
                    onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                    placeholder="What will you cover in this session?"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Date & Time</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={newSession.scheduled_at}
                      onChange={(e) => setNewSession({...newSession, scheduled_at: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newSession.duration_minutes}
                      onChange={(e) => setNewSession({...newSession, duration_minutes: parseInt(e.target.value)})}
                      min="15"
                      max="480"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newSession.location}
                    onChange={(e) => setNewSession({...newSession, location: e.target.value})}
                    placeholder="Library, Coffee Shop, Online..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  Schedule Session
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups and sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Groups and Sessions */}
      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">
            Study Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Upcoming Sessions ({sessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.subject}</p>
                    </div>
                    <Badge variant="secondary">
                      {group.member_count}/{group.max_members}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {group.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.member_count} members
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {group.college}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => joinGroup(group.id)}
                    >
                      Join Group
                    </Button>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{session.title}</h3>
                      <p className="text-muted-foreground mb-2">{session.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(session.scheduled_at).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {session.duration_minutes} min
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {session.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.attendee_count} attending
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => joinSession(session.id)}
                      >
                        Join Session
                      </Button>
                      {session.is_online && session.meeting_link && (
                        <Button size="sm" variant="outline">
                          Join Online
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
