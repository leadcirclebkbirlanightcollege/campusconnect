import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { toast } from "sonner";
import { format } from "date-fns";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, BookOpen, Clock, MapPin, Calendar } from "@/components/icons";

const schema = z.object({
  topic: z.string().trim().min(3, "Subject / topic must be at least 3 characters").max(200),
  lecture_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM format"),
  end_time: z.string().regex(/^\d{2}:\d{2}/, "Use HH:MM format"),
  venue: z.string().trim().min(2, "Venue must be at least 2 characters").max(200),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ScheduleLectureDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { collegeId } = useTenant();
  const qc = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: "",
      lecture_date: format(new Date(), "yyyy-MM-dd"),
      start_time: "10:00",
      end_time: "11:00",
      venue: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!user) throw new Error("You must be logged in to schedule a lecture");

      // Resolve college_id if not present in tenant
      let resolvedCollegeId = collegeId;
      if (!resolvedCollegeId) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("college_id")
          .eq("user_id", user.id)
          .maybeSingle();
        resolvedCollegeId = role?.college_id ?? null;
      }

      const payload: Record<string, unknown> = {
        topic: values.topic.trim(),
        lecture_date: values.lecture_date,
        start_time: values.start_time.slice(0, 5),
        end_time: values.end_time.slice(0, 5),
        venue: values.venue.trim(),
        created_by: user.id,
        status: "scheduled",
      };

      if (resolvedCollegeId) {
        payload.college_id = resolvedCollegeId;
      }

      const { data, error } = await supabase
        .from("lectures")
        .insert([payload as any])
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lecture scheduled successfully!");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      qc.invalidateQueries({ queryKey: ["student"] });
      form.reset({
        topic: "",
        lecture_date: format(new Date(), "yyyy-MM-dd"),
        start_time: "10:00",
        end_time: "11:00",
        venue: "",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule lecture");
    },
  });

  const onSubmit = (values: Values) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            Schedule New Lecture
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new lecture session to your schedule and students' timetable.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Subject / Topic *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Data Structures — Binary Trees"
                      className="text-xs h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Venue / Classroom *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Room 304, CS Lab 2"
                      className="text-xs h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lecture_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Date *</FormLabel>
                  <FormControl>
                    <Input type="date" className="text-xs h-9" {...field} />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Start Time *</FormLabel>
                    <FormControl>
                      <Input type="time" className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">End Time *</FormLabel>
                    <FormControl>
                      <Input type="time" className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="text-xs h-8 gap-1.5 font-semibold"
              >
                {createMutation.isPending ? "Scheduling…" : "Schedule Lecture"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
