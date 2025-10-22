import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, MapPin, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge as BadgeDisplay } from "@/components/BadgeDisplay";
import { TrustBadge } from "@/components/TrustBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeText, sanitizeCSVList } from "@/lib/sanitize";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  full_name: string;
  email: string;
  college: string;
  bio: string;
  skills: string[];
  trust_score: number;
  avatar_url: string;
}

const COLLEGE_OPTIONS = [
  "SAI VIDYA INSTITUTE OF TECHNOLOGY",
  "RASHTREEYA VIDYALAYA COLLEGE OF ENGINEERING (RVCE)",
  "SRI SIDDHARTHA COLLEGE OF ENGINEERING (SSCE)",
  "BMS INSTITUTE OF TECHNOLOGY (BMSIT)",
  "BANGALORE INSTITUTE OF TECHNOLOGY (BIT)",
  "PES UNIVERSITY",
  "CHRIST UNIVERSITY",
  "JAIN UNIVERSITY",
  "MANIPAL INSTITUTE OF TECHNOLOGY",
  "NIT KARNATAKA",
  "IISc BANGALORE",
  "OTHER"
];

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ bio: "", skills: "", college: "" });
  const [customCollege, setCustomCollege] = useState("");
  const [loading, setLoading] = useState(true);
  const [myTasks, setMyTasks] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    fetchMyTasks();
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        bio: data.bio || "",
        skills: data.skills?.join(", ") || "",
        college: data.college || "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    setMyTasks(data || []);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collegeValue = editForm.college === "OTHER" ? customCollege : editForm.college;
      const safeBio = sanitizeText(editForm.bio, { maxLen: 2000 });
      const safeSkills = sanitizeCSVList(editForm.skills);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          bio: safeBio,
          skills: safeSkills,
          college: sanitizeText(collegeValue, { maxLen: 100 }),
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your changes have been saved.",
      });
      setEditModalOpen(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <img
                src={profile?.avatar_url || "/placeholder.svg"}
                alt={profile?.full_name}
                className="w-24 h-24 rounded-full object-cover"
              />
              <div>
                <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  {profile?.college}
                </div>
                <p className="text-muted-foreground mt-1">{profile?.email}</p>
              </div>
            </div>
            <Button onClick={() => setEditModalOpen(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Trust Score & Badge */}
          <div className="flex items-center gap-6">
            <TrustBadge score={profile?.trust_score || 0} size="lg" />
            <BadgeDisplay trustScore={profile?.trust_score || 0} />
          </div>

          {/* Bio */}
          {profile?.bio && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile?.skills && profile.skills.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks */}
          <div>
            <h3 className="font-semibold mb-4">My Tasks ({myTasks.length})</h3>
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground">No tasks posted yet.</p>
            ) : (
              <div className="space-y-2">
                {myTasks.slice(0, 5).map((task: any) => (
                  <div key={task.id} className="p-4 rounded-xl bg-background/50 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.status}</p>
                      </div>
                      <span className="font-bold text-primary">₹{task.budget}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Select
                  value={editForm.college}
                  onValueChange={(value) => {
                    setEditForm({ ...editForm, college: value });
                    if (value !== "OTHER") {
                      setCustomCollege("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_OPTIONS.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editForm.college === "OTHER" && (
                  <Input
                    placeholder="Enter your college name"
                    value={customCollege}
                    onChange={(e) => setCustomCollege(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell others about yourself..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={editForm.skills}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                  placeholder="e.g., Graphic Design, Python, Writing"
                />
              </div>
              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Profile;
