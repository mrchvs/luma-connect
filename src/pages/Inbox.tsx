import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MainNav } from "@/components/MainNav";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MentorBadge } from "@/components/MentorBadge";
import { useIsMentor } from "@/hooks/use-mentor";
import {
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useCreateConversation,
} from "@/hooks/use-messaging";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  User,
  Clock,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { data: conversations, isLoading: conversationsLoading } =
    useConversations();
  const { data: activeConversation } = useConversation(conversationId);
  const { data: messages, isLoading: messagesLoading } =
    useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Check if other user is mentor
  const { data: isOtherUserMentor } = useIsMentor(
    activeConversation?.other_user?.user_id
  );

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    if (!authLoading && user && !profile?.completed) {
      navigate("/onboarding");
    }
  }, [user, profile, authLoading, navigate]);

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId && messages && messages.length > 0) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, messages?.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidate queries handled by hook
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConversation || !user) return;

    const recipientId =
      activeConversation.participant_one === user.id
        ? activeConversation.participant_two
        : activeConversation.participant_one;

    await sendMessage.mutateAsync({
      conversationId: activeConversation.id,
      recipientId,
      content: messageInput.trim(),
    });

    setMessageInput("");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const showConversationList = !conversationId;

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <main className="container py-8 px-4 max-w-4xl">
        {showConversationList ? (
          // Conversation list view
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-display text-2xl font-semibold">Inbox</h1>
              </div>
              <p className="text-muted-foreground">
                Your private conversations with other members
              </p>
            </div>

            {conversationsLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner size="lg" text="Loading conversations..." />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h2 className="font-display text-xl mb-2">No messages yet</h2>
                  <p className="text-muted-foreground mb-4">
                    Start a conversation by connecting with other members
                  </p>
                  <Button asChild>
                    <Link to="/members">Browse Members</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors cursor-pointer",
                      conversation.unread_count > 0 && "border-primary/30"
                    )}
                    onClick={() => navigate(`/inbox/${conversation.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border border-border">
                          <AvatarImage
                            src={conversation.other_user?.avatar_url || undefined}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(conversation.other_user?.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">
                              {conversation.other_user?.full_name || "Member"}
                            </h3>
                            {conversation.unread_count > 0 && (
                              <Badge variant="default" className="text-xs px-1.5 py-0">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>

                          {conversation.last_message && (
                            <p
                              className={cn(
                                "text-sm truncate",
                                conversation.unread_count > 0
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              {conversation.last_message.sender_id === user?.id && (
                                <span className="text-muted-foreground">You: </span>
                              )}
                              {conversation.last_message.content}
                            </p>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-col items-end gap-1">
                          <span>
                            {formatDistanceToNow(
                              new Date(conversation.last_message_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          // Conversation detail view
          <div className="flex flex-col h-[calc(100vh-12rem)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/inbox")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              {activeConversation?.other_user && (
                <Link
                  to={`/profile/${activeConversation.other_user.user_id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage
                      src={activeConversation.other_user.avatar_url || undefined}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(activeConversation.other_user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">
                        {activeConversation.other_user.full_name || "Member"}
                      </h2>
                      {isOtherUserMentor && <MentorBadge size="sm" />}
                    </div>
                    {activeConversation.other_user.job_title && (
                      <p className="text-xs text-muted-foreground">
                        {activeConversation.other_user.job_title}
                        {activeConversation.other_user.company_name &&
                          ` at ${activeConversation.other_user.company_name}`}
                      </p>
                    )}
                  </div>
                </Link>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <div
                            className={cn(
                              "flex items-center gap-1 mt-1 text-xs",
                              isOwn
                                ? "text-primary-foreground/70 justify-end"
                                : "text-muted-foreground"
                            )}
                          >
                            <span>
                              {formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            {isOwn && (
                              message.read_at ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 pt-4 border-t border-border mt-4"
            >
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!messageInput.trim() || sendMessage.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
