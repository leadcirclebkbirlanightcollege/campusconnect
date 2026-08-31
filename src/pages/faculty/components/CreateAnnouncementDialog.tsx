import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Megaphone } from "@/components/icons";

const schema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().trim().min(5, "Announcement body must be at least 5 characters"),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateAnnouncementDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!user) throw new Error("You must be logged in to post an announcement");

      const { error } = await supabase.from("announcements").insert({
        title: values.title.trim(),
        description: values.description.trim(),
        created_by: user.id,
        target: "all",
        priority: "normal",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement posted successfully!");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      form.reset({
        title: "",
        description: "",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post announcement");
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
            <Megaphone className="h-5 w-5 text-primary" aria-hidden />
            New Announcement
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Broadcast an announcement to all students enrolled in your courses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Extra Lab Session on Saturday"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Message *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your announcement details…"
                      rows={4}
                      className="text-xs resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

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
                className="text-xs h-8 font-semibold"
              >
                {createMutation.isPending ? "Posting…" : "Post Announcement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
