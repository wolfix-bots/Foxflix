import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  open: boolean;
  onClose: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const AiChat = ({ open, onClose }: AiChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! I'm **FoxyAI** 🎬 — your cyberpunk movie guide. Ask me anything: recommendations, plot summaries, cast info, hidden gems... I've got the whole grid covered. What are we watching?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/movie-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || "Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: rdDone, value } = await reader.read();
        if (rdDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + chunk,
                };
                return updated;
              });
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)] flex flex-col rounded-sm border border-neon-cyan/30 shadow-neon-subtle bg-dark-surface transition-all duration-300 origin-bottom-right",
        open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      )}
      style={{ height: "480px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-dark-elevated rounded-t-sm flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-neon-cyan/40 flex items-center justify-center">
          <Bot className="w-4 h-4 text-neon-cyan" />
        </div>
        <div>
          <p className="font-display text-xs font-bold text-neon-cyan tracking-wider">FOXY AI</p>
          <p className="text-xs text-muted-foreground font-body">Movie & TV Expert</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-display">ONLINE</span>
          <button onClick={onClose} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2 text-sm font-body leading-relaxed", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border mt-0.5",
              msg.role === "assistant" ? "bg-primary/20 border-neon-cyan/30" : "bg-neon-magenta/20 border-neon-magenta/30")}>
              {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-neon-cyan" /> : <User className="w-3.5 h-3.5 text-neon-magenta" />}
            </div>
            <div className={cn("px-3 py-2 rounded-sm max-w-[80%] text-xs leading-relaxed",
              msg.role === "assistant" ? "bg-dark-elevated border border-border text-foreground" : "bg-primary/20 border border-neon-magenta/30 text-foreground")}>
              {msg.content ? renderContent(msg.content) : <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isStreaming}
          placeholder="Ask about any movie or show..."
          className="flex-1 bg-dark-elevated border border-border rounded-sm px-3 py-2 text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/60 transition-colors disabled:opacity-50"
        />
        <button onClick={sendMessage} disabled={!input.trim() || isStreaming}
          className="w-8 h-8 flex items-center justify-center rounded-sm bg-primary text-primary-foreground hover:shadow-neon-cyan transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
          {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default AiChat;
