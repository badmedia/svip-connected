import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Users, FileText, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SecurityStats {
  totalEvents: number;
  failedLogins: number;
  rateLimitHits: number;
  suspiciousActivities: number;
  fileUploads: number;
  activeSessions: number;
}

interface SecurityEvent {
  id: string;
  event: string;
  details: any;
  user_id: string | null;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    failedLogins: 0,
    rateLimitHits: 0,
    suspiciousActivities: 0,
    fileUploads: 0,
    activeSessions: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSecurityData();
    }
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch security statistics
      const { data: eventsData } = await supabase
        .from('security_logs')
        .select('event, timestamp')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: fileData } = await supabase
        .from('file_uploads')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('is_active', true);

      // Calculate statistics
      const totalEvents = eventsData?.length || 0;
      const failedLogins = eventsData?.filter(e => e.event === 'login_failed').length || 0;
      const rateLimitHits = eventsData?.filter(e => e.event.includes('rate_limit')).length || 0;
      const suspiciousActivities = eventsData?.filter(e => 
        e.event.includes('suspicious') || e.event.includes('flagged')
      ).length || 0;

      setStats({
        totalEvents,
        failedLogins,
        rateLimitHits,
        suspiciousActivities,
        fileUploads: fileData?.length || 0,
        activeSessions: sessionData?.length || 0
      });

      // Fetch recent events
      const { data: recentEventsData } = await supabase
        .from('security_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      const eventsWithSeverity: SecurityEvent[] = (recentEventsData || []).map(event => ({
        ...event,
        severity: getEventSeverity(event.event)
      }));

      setRecentEvents(eventsWithSeverity);

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventSeverity = (event: string): 'low' | 'medium' | 'high' | 'critical' => {
    if (event.includes('login_failed') || event.includes('rate_limit')) return 'medium';
    if (event.includes('suspicious') || event.includes('flagged')) return 'high';
    if (event.includes('security_breach') || event.includes('unauthorized')) return 'critical';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <Button onClick={fetchSecurityData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events (24h)</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedLogins}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rate Limit Hits</p>
                <p className="text-2xl font-bold text-orange-600">{stats.rateLimitHits}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspicious Activities</p>
                <p className="text-2xl font-bold text-red-600">{stats.suspiciousActivities}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">File Uploads (24h)</p>
                <p className="text-2xl font-bold">{stats.fileUploads}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeSessions}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Events</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No recent security events
                  </p>
                ) : (
                  recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={getSeverityColor(event.severity) as any}>
                          {event.severity}
                        </Badge>
                        <div>
                          <p className="font-medium">{event.event}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {event.severity === 'critical' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                        {event.severity === 'high' && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                        {event.severity === 'medium' && <Clock className="w-5 h-5 text-yellow-500" />}
                        {event.severity === 'low' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.failedLogins > 5 && (
                  <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-800">High Failed Login Attempts</p>
                      <p className="text-sm text-red-600">
                        {stats.failedLogins} failed login attempts in the last 24 hours
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.rateLimitHits > 10 && (
                  <div className="flex items-center gap-3 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-orange-800">Rate Limiting Active</p>
                      <p className="text-sm text-orange-600">
                        {stats.rateLimitHits} rate limit hits detected
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.suspiciousActivities > 0 && (
                  <div className="flex items-center gap-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-800">Suspicious Activities Detected</p>
                      <p className="text-sm text-red-600">
                        {stats.suspiciousActivities} suspicious activities flagged
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.failedLogins <= 5 && stats.rateLimitHits <= 10 && stats.suspiciousActivities === 0 && (
                  <div className="flex items-center gap-3 p-4 border border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-800">All Systems Secure</p>
                      <p className="text-sm text-green-600">
                        No security alerts at this time
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
