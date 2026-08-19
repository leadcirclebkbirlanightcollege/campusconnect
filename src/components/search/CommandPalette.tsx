/**
 * Global Command Palette — Ctrl+K / ⌘K search across the platform.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, BookOpen, GraduationCap, MessageSquare, CalendarDays,
  Search, ArrowRight,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounce(query, 250);
  const navigate = useNavigate();

  // Keyboard shortcut + global open event (top bar search button)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openEvent = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("campus:open-search", openEvent);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("campus:open-search", openEvent);
    };
  }, []);

  const { data: results = [] } = useQuery<SearchResult[]>({
    queryKey: ["global_search", debouncedQ],
    enabled: debouncedQ.length >= 2,
    queryFn: async () => {
      const q = debouncedQ.trim();
      const items: SearchResult[] = [];

      // Search students
      const { data: students } = await supabase
        .from("profiles")
        .select("user_id, name, email, student_id, department")
        .ilike("name", `%${q}%`)
        .eq("is_deleted", false)
        .limit(5);

      students?.forEach((s) => {
        items.push({
          id: `student-${s.user_id}`,
          label: s.name,
          description: [s.student_id, s.department].filter(Boolean).join(" · "),
          icon: <Users className="h-4 w-4 text-primary" />,
          href: `/platform/admin/students`,
          category: "Students",
        });
      });

      // Search lectures
      const { data: lectures } = await supabase
        .from("lectures")
        .select("id, topic, venue, lecture_date")
        .ilike("topic", `%${q}%`)
        .order("lecture_date", { ascending: false })
        .limit(5);

      lectures?.forEach((l) => {
        items.push({
          id: `lecture-${l.id}`,
          label: l.topic,
          description: `${l.venue} · ${l.lecture_date}`,
          icon: <BookOpen className="h-4 w-4 text-accent-foreground" />,
          href: `/app/lectures/${l.id}`,
          category: "Lectures",
        });
      });


      return items;
    },
    staleTime: 10_000,
  });

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      navigate(href);
    },
    [navigate],
  );

  // Static quick links
  const quickLinks: SearchResult[] = [
    { id: "ql-dashboard", label: "Dashboard", icon: <CalendarDays className="h-4 w-4" />, href: "/app/dashboard", category: "Quick Links" },
    { id: "ql-lectures", label: "Lectures", icon: <BookOpen className="h-4 w-4" />, href: "/app/lectures", category: "Quick Links" },
    { id: "ql-leaderboard", label: "Leaderboard", icon: <GraduationCap className="h-4 w-4" />, href: "/app/leaderboard", category: "Quick Links" },
    { id: "ql-messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, href: "/app/messages", category: "Quick Links" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search students, lectures, channels..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {debouncedQ.length < 2 && (
          <CommandGroup heading="Quick Links">
            {quickLinks.map((ql) => (
              <CommandItem
                key={ql.id}
                onSelect={() => handleSelect(ql.href)}
                className="flex items-center gap-2"
              >
                {ql.icon}
                <span>{ql.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-2"
              >
                {item.icon}
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm">{item.label}</span>
                  {item.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </div>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
