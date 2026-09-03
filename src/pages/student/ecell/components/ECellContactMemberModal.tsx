/**
 * ECellContactMemberModal — Secure In-App Committee Contact Action
 *
 * Allows verified students to send inquiries to authorized committee members
 * without exposing personal phone numbers or private contact details.
 * Routes directly through Campus Connect's ticket/support system.
 */
import React, { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, CheckCircle2, ShieldCheck, UserRound } from "@/components/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CommitteeContactTarget {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  photo_url: string | null;
}

interface Props {
  member: CommitteeContactTarget | null;
  onClose: () => void;
}

export function ECellContactMemberModal({ member, onClose }: Props) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const defaultSubject = member
    ? `E-Cell Inquiry: ${member.name} (${member.designation || "Executive"})`
    : "E-Cell Committee Inquiry";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !user) {
      toast.error("Please log in to contact committee members.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message for the committee member.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get student's profile for college_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("name,email,college_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const studentName = profile?.name || user.email?.split("@")[0] || "Student";
      const studentEmail = profile?.email || user.email || "";

      // Create official support ticket routed to E-Cell
      const ticketSubject = subject.trim() || defaultSubject;
      const ticketBody = `Recipient: ${member.name} (${member.designation || "Committee Member"})\nDepartment: ${member.department || "E-Cell"}\nFrom: ${studentName} (${studentEmail})\n\nMessage:\n${message.trim()}`;

      const { error: ticketError } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        college_id: profile?.college_id ?? null,
        subject: ticketSubject,
        category: "ecell",
        description: ticketBody,
        status: "open",
        priority: "normal",
      } as any);

      if (ticketError) throw ticketError;

      setIsSubmitted(true);
      toast.success("Inquiry submitted to E-Cell Committee", {
        description: `Your message for ${member.name} has been routed to the E-Cell desk.`,
      });

      setTimeout(() => {
        setIsSubmitted(false);
        setSubject("");
        setMessage("");
        onClose();
      }, 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-[#E8D98A] dark:border-[#3D3523]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCE541] text-[#000000] border border-[#C08634]/50">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                Contact Committee Member
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Secure message routed directly through the official E-Cell desk.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {member && (
          <>
            {isSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h4 className="text-base font-bold text-foreground">Inquiry Sent!</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Your inquiry for <strong className="text-foreground">{member.name}</strong> has been received by the E-Cell executive committee.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 py-1">
                {/* Member Badge Card */}
                <div className="flex items-center gap-3 rounded-xl border border-[#E8D98A]/60 bg-[#FAF9F7] dark:bg-[#1D1B17] p-3">
                  <div className="h-11 w-11 rounded-full overflow-hidden border border-[#C08634]/50 bg-white dark:bg-[#23201B] shrink-0 flex items-center justify-center">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-6 w-6 text-[#C08634]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{member.name}</p>
                    <p className="text-xs font-semibold text-[#C08634] dark:text-[#FAD943] truncate">
                      {member.designation || "Core Committee"}
                    </p>
                    {member.department && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {member.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subject</Label>
                  <Input
                    placeholder={defaultSubject}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Your Message *</Label>
                  <Textarea
                    placeholder="Write your query, stall question, or collaboration request..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="text-xs resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>Your email will be included securely so the team can reply.</span>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className={cn(
                      "h-9 text-xs font-bold gap-1.5",
                      "bg-[#FCE541] hover:bg-[#FAD943] text-[#000000] border border-[#C08634]/50"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
