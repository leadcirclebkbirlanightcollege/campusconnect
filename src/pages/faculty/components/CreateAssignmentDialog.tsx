import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useTenant } from "@/providers/TenantProvider";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

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
import { FileText } from "@/components/icons";

const schema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().trim().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  max_marks: z.coerce.number().min(1, "Max marks must be at least 1").max(1000),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateAssignmentDialog({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { collegeId } = useTenant();
  const qc = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      max_marks: 100,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!user) throw new Error("You must be logged in to create an assignment");

      let resolvedCollegeId = collegeId;
      if (!resolvedCollegeId) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("college_id")
          .eq("user_id", user.id)
          .maybeSingle();
        resolvedCollegeId = role?.college_id ?? null;
      }

      const { error } = await supabase.from("assignments" as any).insert({
        title: values.title.trim(),
        description: values.description?.trim() || null,
        due_date: values.due_date,
        max_marks: values.max_marks,
        created_by: user.id,
        college_id: resolvedCollegeId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment created successfully!");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      form.reset({
        title: "",
        description: "",
        due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        max_marks: 100,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create assignment");
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
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            Create Assignment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Publish a new assignment with deadline and maximum marks for your students.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Assignment Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Unit II: Query Optimization & Indexing"
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
                  <FormLabel className="text-xs font-semibold">Instructions (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Specify requirements, submission format, or notes…"
                      rows={3}
                      className="text-xs resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Max Marks *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={1000} className="text-xs h-9" {...field} />
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
                className="text-xs h-8 font-semibold"
              >
                {createMutation.isPending ? "Creating…" : "Create Assignment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
