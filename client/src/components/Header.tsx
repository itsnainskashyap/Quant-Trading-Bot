import { Shield, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/image_1769090256764.png";

interface HeaderProps {
  isDataFeedHealthy: boolean;
}

export function Header({ isDataFeedHealthy }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="TradeX AI" 
              className="h-8 w-auto"
              data-testid="img-logo"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDataFeedHealthy ? 'bg-success animate-pulse-glow' : 'bg-destructive'}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isDataFeedHealthy ? 'Live Feed' : 'Feed Degraded'}
              </span>
            </div>
            
            <Badge 
              variant="outline" 
              className="gap-1 text-xs"
              data-testid="badge-phase"
            >
              <Shield className="w-3 h-3" />
              Phase 1
            </Badge>
            
            <Button size="icon" variant="ghost" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
