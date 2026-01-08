import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { useUnreadCount } from "@/hooks/use-messaging";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  Shield,
  User,
  HandHeart,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/community-asks", label: "Asks", icon: HandHeart },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: Shield };

export function MainNav() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const { data: unreadCount = 0 } = useUnreadCount();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard">
            <Logo size="sm" />
          </Link>
          
          {profile?.status === "approved" && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                const showBadge = item.href === "/inbox" && unreadCount > 0;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {showBadge && (
                      <Badge variant="default" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to={adminNavItem.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === adminNavItem.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <adminNavItem.icon className="w-4 h-4" />
                  {adminNavItem.label}
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile?.full_name || "Member"}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {profile?.job_title && profile?.company_name 
                      ? `${profile.job_title} at ${profile.company_name}`
                      : profile?.short_bio?.slice(0, 40) || ""}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/profile/${user?.id}`} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile nav */}
      {profile?.status === "approved" && (
        <nav className="md:hidden flex items-center justify-around border-t border-border/50 py-2 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            const showBadge = item.href === "/inbox" && unreadCount > 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 rounded-md text-xs font-medium transition-colors relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to={adminNavItem.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1 rounded-md text-xs font-medium transition-colors",
                location.pathname === adminNavItem.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <adminNavItem.icon className="w-5 h-5" />
              {adminNavItem.label}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
