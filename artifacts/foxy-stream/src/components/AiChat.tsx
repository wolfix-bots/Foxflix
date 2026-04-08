import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  open: boolean;
  onClose: () => void;
}

const AI_API = "https://apis.xwolf.space/api/ai/claude";

const SYSTEM_CONTEXT = `You are FoxyAI, a cyberpunk movie and TV show expert assistant on FoxyStream — a neon-lit streaming platform. You help users discover movies and shows, give recommendations, summarize plots, share cast info, and find hidden gems. Keep responses concise, engaging, and cinematic. Use a slightly cool/futuristic tone — you're from the grid. Never break character. Always stay on topic: movies, TV shows, streaming, entertainment.`;

const buildQuery = (messages: Message[], userText: string): string => {
  const history = messages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "FoxyAI"}: ${m.content}`)
    .join("\n");

  return `${SYSTEM_CONTEXT}\n\nConversation history:\n${history}\n\nUser: ${userText}\nFoxyAI:`;
};

const useTypewriter = (
  target: string,
  active: boolean,
  onDone: () => void
): string => {
  const [displayed, setDisplayed] = useState("");
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setDisplayed(target);
      return;
    }
    setDisplayed("");
    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i < target.length) {
        frameRef.current = setTimeout(tick, 12);
      } else {
        onDone();
      }
    };
    frameRef.current = setTimeout(tick, 12);
    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active]);

  return displayed;
};

const AssistantBubble = ({
  content,
  animate,
  onAnimDone,
}: {
  content: string;
  animate: boolean;
  onAnimDone: () => void;
}) => {
  const text = useTypewriter(content, animate, onAnimDone);

  const renderContent = (raw: string) => {
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
  };

  return (
    <div className="px-3 py-2 rounded-sm max-w-[82%] text-xs leading-relaxed bg-dark-elevated border border-border text-foreground">
      {renderContent(text)}
      {animate && text.length < content.length && (
        <span className="inline-block w-1 h-3 ml-0.5 bg-neon-cyan animate-pulse align-middle" />
      )}
    </div>
  );
};

const AiChat = ({ open, onClose }: AiChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm **FoxyAI** — your cyberpunk movie guide. Ask me anything: recommendations, plot summaries, cast info, hidden gems... I've got the whole grid covered. What are we watching?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, animatingIdx]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const historyForQuery = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const query = buildQuery(historyForQuery, text);
      const res = await fetch(
        `${AI_API}?q=${encodeURIComponent(query)}`
      );

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();

      if (!data.status || !data.result) {
        throw new Error("Empty response from AI");
      }

      const replyText = String(data.result).trim();
      const newIdx = messages.length + 2;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: replyText },
      ]);
      setAnimatingIdx(newIdx - 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `System error: ${msg}. Try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] w-[340px] max-w-[calc(100vw-2rem)] flex flex-col rounded-sm border border-neon-cyan/30 bg-dark-surface transition-all duration-300 origin-bottom-right",
        "shadow-[0_0_30px_hsl(183_100%_50%/0.15),0_8px_32px_hsl(230_20%_2%/0.8)]",
        open
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-95 pointer-events-none"
      )}
      style={{ height: 500 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-dark-elevated rounded-t-sm flex-shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-neon-cyan/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-neon-cyan" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-dark-elevated" />
        </div>
        <div>
          <p className="font-display text-xs font-bold text-neon-cyan tracking-wider flex items-center gap-1">
            FOXY AI
            <Sparkles className="w-2.5 h-2.5" />
          </p>
          <p className="text-[10px] text-muted-foreground font-body">Movie &amp; TV Expert · Powered by Claude</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 text-sm font-body leading-relaxed",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border mt-0.5",
                msg.role === "assistant"
                  ? "bg-primary/20 border-neon-cyan/30"
                  : "bg-neon-magenta/20 border-neon-magenta/30"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-3 h-3 text-neon-cyan" />
              ) : (
                <User className="w-3 h-3 text-neon-magenta" />
              )}
            </div>

            {msg.role === "assistant" ? (
              <AssistantBubble
                content={msg.content}
                animate={animatingIdx === i}
                onAnimDone={() => setAnimatingIdx(null)}
              />
            ) : (
              <div className="px-3 py-2 rounded-sm max-w-[82%] text-xs leading-relaxed bg-primary/10 border border-neon-magenta/20 text-foreground">
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border bg-primary/20 border-neon-cyan/30 mt-0.5">
              <Bot className="w-3 h-3 text-neon-cyan" />
            </div>
            <div className="px-3 py-2 rounded-sm bg-dark-elevated border border-border flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isLoading}
          placeholder="Ask about any movie or show..."
          className="flex-1 bg-dark-elevated border border-border rounded-sm px-3 py-2 text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 flex items-center justify-center rounded-sm bg-primary text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 hover:shadow-neon-cyan"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AiChat;
