import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { LectureRow } from "./LectureManagementTab";

const schema = z.object({
  topic: z.string().trim().min(3).max(200),
  lecture_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM"),
  venue: z.string().trim().min(2).max(200),
  programme_id: z.string().optional(),
});

type Values = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecture: LectureRow | null;
  onSaved: () => Promise<void> | void;
};

export default function LectureFormDialog({ open, onOpenChange, lecture, onSaved }: Props) {
  // Fetch active programmes for the dropdown
  const programmesQuery = useQuery({
    queryKey: ["admin", "programmes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, color")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Fetch existing programme tag for editing
  const existingTagQuery = useQuery({
    queryKey: ["admin", "lecture-programme-tag", lecture?.id],
    queryFn: async () => {
      if (!lecture) return null;
      const { data, error } = await supabase
        .from("lecture_programme_tags")
        .select("programme_id")
        .eq("lecture_id", lecture.id)
        .maybeSingle();
      if (error) throw error;
      return data?.programme_id ?? null;
    },
    enabled: open && !!lecture,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: "",
      lecture_date: new Date().toISOString().slice(0, 10),
      start_time: "09:00",
      end_time: "10:00",
      venue: "",
      programme_id: undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (lecture) {
      form.reset({
        topic: lecture.topic,
        lecture_date: lecture.lecture_date,
        start_time: lecture.start_time,
        end_time: lecture.end_time,
        venue: lecture.venue,
        programme_id: existingTagQuery.data ?? undefined,
      });
    } else {
      form.reset({
        topic: "",
        lecture_date: new Date().toISOString().slice(0, 10),
        start_time: "09:00",
        end_time: "10:00",
        venue: "",
        programme_id: undefined,
      });
    }
  }, [open, lecture, form, existingTagQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: Values) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Not authenticated");

      const start_at = new Date(`${values.lecture_date}T${values.start_time}:00Z`).toISOString();
      const end_at = new Date(`${values.lecture_date}T${values.end_time}:00Z`).toISOString();

      let lectureId: string;

      if (lecture) {
        const { error } = await supabase
          .from("lectures")
          .update({
            topic: values.topic.trim(),
            lecture_date: values.lecture_date,
            start_time: values.start_time,
            end_time: values.end_time,
            start_at,
            end_at,
            venue: values.venue.trim(),
          })
          .eq("id", lecture.id);
        if (error) throw error;
        lectureId = lecture.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("lectures")
          .insert([
            {
              topic: values.topic.trim(),
              lecture_date: values.lecture_date,
              start_time: values.start_time,
              end_time: values.end_time,
              start_at,
              end_at,
              venue: values.venue.trim(),
              created_by: userData.user.id,
            },
          ])
          .select("id")
          .single();
        if (error) throw error;
        lectureId = inserted.id;
      }

      // Handle programme tag
      // First, remove existing tag(s) for this lecture
      await supabase
        .from("lecture_programme_tags")
        .delete()
        .eq("lecture_id", lectureId);

      // Insert new tag if a programme was selected
      if (values.programme_id) {
        const { error: tagError } = await supabase
          .from("lecture_programme_tags")
          .insert({
            lecture_id: lectureId,
            programme_id: values.programme_id,
            tagged_by: userData.user.id,
          });
        if (tagError) throw tagError;
      }
    },
    onSuccess: async () => {
      toast.success(lecture ? "Lecture updated" : "Lecture created");
      await onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save lecture"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lecture ? "Edit lecture" : "New lecture"}</DialogTitle>
          <DialogDescription>Schedule details, venue, and programme assignment.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Data Structures – Trees" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="lecture_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hall B, Room 204" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="programme_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programme (Learning Circle)</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a programme (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No programme (visible to all)</SelectItem>
                      {(programmesQuery.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || "hsl(var(--primary))" }}
                            />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only students allotted to this programme will see this lecture.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {lecture ? "Save changes" : "Create lecture"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
