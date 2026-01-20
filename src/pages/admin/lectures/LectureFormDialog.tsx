import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import type { LectureRow } from "./LectureManagementTab";

const schema = z.object({
  topic: z.string().trim().min(3).max(200),
  lecture_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM"),
  venue: z.string().trim().min(2).max(200),
});

type Values = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecture: LectureRow | null;
  onSaved: () => Promise<void> | void;
};

export default function LectureFormDialog({ open, onOpenChange, lecture, onSaved }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: "",
      lecture_date: new Date().toISOString().slice(0, 10),
      start_time: "09:00",
      end_time: "10:00",
      venue: "",
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
      });
    } else {
      form.reset({
        topic: "",
        lecture_date: new Date().toISOString().slice(0, 10),
        start_time: "09:00",
        end_time: "10:00",
        venue: "",
      });
    }
  }, [open, lecture, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: Values) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Not authenticated");

      if (lecture) {
        const { error } = await supabase
          .from("lectures")
          .update({
            topic: values.topic.trim(),
            lecture_date: values.lecture_date,
            start_time: values.start_time,
            end_time: values.end_time,
            venue: values.venue.trim(),
          })
          .eq("id", lecture.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lectures").insert([
          {
            topic: values.topic.trim(),
            lecture_date: values.lecture_date,
            start_time: values.start_time,
            end_time: values.end_time,
            venue: values.venue.trim(),
            created_by: userData.user.id,
          },
        ]);
        if (error) throw error;
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
          <DialogDescription>Schedule details and venue information.</DialogDescription>
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
