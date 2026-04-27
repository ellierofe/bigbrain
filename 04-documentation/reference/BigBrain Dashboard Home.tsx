import { 
  ArrowUpRight, 
  Clock, 
  FileText, 
  Plus, 
  Sparkles, 
  Zap,
  ChevronRight,
  Target,
  Layers,
  Users,
  Send,
  Upload,
  Lightbulb,
  Link as LinkIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "motion/react";

const sparkFeed = [
  { 
    id: 1, 
    type: "Connection", 
    title: "Semantic Bridge Detected", 
    desc: "Your notes on 'EU AI Act' overlap 80% with 'Robotics Ethics' research from last month.",
    icon: LinkIcon
  },
  { 
    id: 2, 
    type: "Insight", 
    title: "Emerging Content Pillar", 
    desc: "High density of mentions around 'AI Governance' across 3 recent transcripts suggests a new strategic angle.",
    icon: Lightbulb
  },
  { 
    id: 3, 
    type: "Memory", 
    title: "Resurfaced from 6 months ago", 
    desc: "You noted: 'The bottleneck in AI adoption isn't tech, it's trust.' This aligns with your current Robotics project.",
    icon: Sparkles
  },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Welcome back, Ellie</h2>
          <p className="text-muted-foreground mt-1">Your second brain has synthesized 3 new sparks today.</p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Zap className="w-4 h-4" />
            Generate Strategy
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Knowledge Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">1,284</div>
            <p className="text-xs text-primary mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3 h-3" /> +12 this week
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Content Pieces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">42</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">8 in draft, 34 published</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Input Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">7</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> 3 need review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="space-y-8">
          {/* Active Mission */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Mission</h3>
            <Card className="bg-white border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <Target className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Current Project</span>
                      </div>
                      <h4 className="text-2xl font-display font-bold group-hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                        Robotics Policy Strategy 2025
                        <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all -translate-y-1 translate-x-1" />
                      </h4>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">In Progress</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Key Segment</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between group/item cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                        <span className="text-sm font-semibold">Microagency Marketers</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Content Pillars</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["AI Ethics", "Automation ROI", "Future of Work"].map(pillar => (
                          <Badge key={pillar} variant="secondary" className="bg-white border border-border/50 text-xs font-medium px-3 py-1">
                            {pillar}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 px-8 py-4 border-t border-border/50 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground italic">"The bottleneck in AI adoption isn't tech, it's trust."</p>
                  <Button variant="link" className="text-primary text-xs font-bold h-auto p-0">View Project Details</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Capture Portal */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Capture Portal</h3>
            <div className="relative group">
              <Textarea 
                placeholder="Drop a thought, link, or paste a transcript..."
                className="min-h-[160px] bg-white border-border/50 rounded-2xl p-6 text-lg font-medium placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                  <Upload className="w-4 h-4" />
                </Button>
                <Button className="rounded-full gap-2 px-6 shadow-lg shadow-primary/20">
                  <Send className="w-4 h-4" />
                  Capture
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Spark Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Spark Feed</h3>
            <Button variant="ghost" size="sm" className="text-[10px] uppercase tracking-widest font-bold text-primary hover:bg-primary/5">Refresh</Button>
          </div>
          <div className="space-y-4">
            {sparkFeed.map((spark, i) => (
              <motion.div
                key={spark.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-white border-border/50 hover:border-primary/30 transition-all cursor-pointer group shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <spark.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{spark.type}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/40 font-medium">Just now</span>
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm group-hover:text-primary transition-colors">{spark.title}</h5>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {spark.desc}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest px-0 hover:bg-transparent hover:text-primary">
                        Explore Connection
                      </Button>
                      <ChevronRight className="w-3 h-3 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Card className="border-dashed border-2 bg-transparent border-border/50 group hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <Sparkles className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h4 className="font-bold text-sm">Deep Synthesis</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Run a deep scan across your entire knowledge base for hidden patterns.
                </p>
                <Button variant="outline" className="mt-4 h-8 text-[10px] font-bold uppercase tracking-widest border-border/50 group-hover:border-primary group-hover:text-primary transition-all">
                  Start Synthesis
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
