import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Presence = { user_id: string; nome: string; email: string; route: string; online_at: string };
type ChatMsg = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read: boolean; sender_nome?: string | null };

const CHANNEL = "global-presence";

export function OnlineUsersWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [online, setOnline] = useState<Presence[]>([]);
  const [chatWith, setChatWith] = useState<Presence | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myName = useMemo(() => (user?.user_metadata?.nome as string) || user?.email?.split("@")[0] || "Usuário", [user]);

  // Presence tracking
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(CHANNEL, { config: { presence: { key: user.id } } });
    channelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Presence[]>;
      const list: Presence[] = [];
      Object.values(state).forEach((arr) => arr[0] && list.push(arr[0]));
      setOnline(list);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          user_id: user.id,
          nome: myName,
          email: user.email,
          route: location.pathname,
          online_at: new Date().toISOString(),
        });
      }
    });
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [user, myName]);

  // Update route on navigation
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !user) return;
    ch.track({
      user_id: user.id,
      nome: myName,
      email: user.email,
      route: location.pathname,
      online_at: new Date().toISOString(),
    });
  }, [location.pathname, user, myName]);

  // Listen incoming messages globally for unread + open chat
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("chat-incoming-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as ChatMsg;
          if (chatWith && m.sender_id === chatWith.user_id) {
            setMessages((prev) => [...prev, m]);
            supabase.from("chat_messages").update({ read: true }).eq("id", m.id).then();
          } else {
            setUnread((u) => ({ ...u, [m.sender_id]: (u[m.sender_id] || 0) + 1 }));
          }
        }
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [user, chatWith]);

  // Load history when opening chat
  useEffect(() => {
    if (!chatWith || !user) return;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${chatWith.user_id}),and(sender_id.eq.${chatWith.user_id},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as ChatMsg[]) || []);
      setUnread((u) => ({ ...u, [chatWith.user_id]: 0 }));
      // mark read
      await supabase
        .from("chat_messages")
        .update({ read: true })
        .eq("recipient_id", user.id)
        .eq("sender_id", chatWith.user_id);
    })();
  }, [chatWith, user]);

  if (!user) return null;

  const others = online.filter((p) => p.user_id !== user.id);
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const send = async () => {
    if (!text.trim() || !chatWith) return;
    const content = text.trim();
    setText("");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        sender_id: user.id,
        sender_nome: myName,
        recipient_id: chatWith.user_id,
        content,
      })
      .select()
      .single();
    if (!error && data) setMessages((p) => [...p, data as ChatMsg]);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 relative">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <Users className="h-4 w-4" />
            {online.length} online
            {totalUnread > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-4 px-1">
                {totalUnread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="p-3 border-b">
            <p className="text-sm font-semibold">Usuários online</p>
            <p className="text-xs text-muted-foreground">{online.length} conectado(s)</p>
          </div>
          <ScrollArea className="max-h-80">
            <div className="p-2 space-y-1">
              {others.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                  Nenhum outro usuário online
                </p>
              )}
              {others.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => setChatWith(p)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left"
                >
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {p.nome?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">📍 {p.route}</p>
                  </div>
                  {unread[p.user_id] ? (
                    <span className="rounded-full bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 flex items-center justify-center">
                      {unread[p.user_id]}
                    </span>
                  ) : null}
                </button>
              ))}
              <div className="border-t mt-2 pt-2 px-2">
                <p className="text-xs text-muted-foreground">Você ({myName}) — {location.pathname}</p>
              </div>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog open={!!chatWith} onOpenChange={(o) => !o && setChatWith(null)}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {chatWith?.nome}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                em {chatWith?.route}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-80 p-4">
            <div className="space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Comece a conversa 👋
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {m.content}
                      <div className={cn("text-[10px] mt-1 opacity-70")}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-3 border-t flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escreva uma mensagem..."
            />
            <Button onClick={send} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
