import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Plus,
  Minus,
  ClipboardCheck,
  Eye,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScannedStudent = {
  user_id: string;
  name: string;
  email: string;
  student_id: string | null;
  department: string | null;
  class_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  totalPoints: number;
  totalAttendance: number;
  programmes: string[];
};

type ActionType = "add_points" | "deduct_points" | "mark_attendance" | "view_profile" | null;

export default function AdminDigitalIdScanner() {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLock, setScanLock] = useState(false);

  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionPoints, setActionPoints] = useState("");
  const [actionReason, setActionReason] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanningRef.current = true;
      setScanError(null);
      setScannedStudent(null);
      startScanLoop();
    } catch {
      setScanError("Camera access denied. Please allow camera permission.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Use BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            handleScanResult(raw);
          }
        } catch {
          // Detector failed, continue
        }
      }
    }, 500);
  }, []);

  const handleScanResult = useCallback(
    async (raw: string) => {
      if (scanLock) return;
      setScanLock(true);
      scanningRef.current = false;

      try {
        const parsed = JSON.parse(raw);
        if (parsed.type !== "campus_connect_id" || !parsed.uid) {
          setScanError("Invalid QR code. Not a Campus Connect ID.");
          setScanLock(false);
          scanningRef.current = true;
          return;
        }

        // Fetch student profile
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("name,email,student_id,department,class_name,avatar_url,is_verified,user_id")
          .eq("user_id", parsed.uid)
          .maybeSingle();

        if (profileErr || !profile) {
          setScanError("Student not found in the system.");
          setScanLock(false);
          scanningRef.current = true;
          return;
        }

        // Fetch points
        const { data: pointsData } = await supabase
          .from("points_ledger")
          .select("points")
          .eq("user_id", parsed.uid);
        const totalPoints = (pointsData ?? []).reduce((s, r) => s + r.points, 0);

        // Fetch attendance count
        const { data: attData } = await supabase
          .from("attendance")
          .select("id")
          .eq("student_user_id", parsed.uid)
          .eq("status", "present");

        // Fetch programmes
        const { data: allotments } = await supabase
          .from("student_programme_allotments")
          .select("programmes(name)")
          .eq("student_user_id", parsed.uid);
        const progs = (allotments ?? []).map((a: any) => a.programmes?.name).filter(Boolean) as string[];

        stopCamera();
        setScannedStudent({
          user_id: parsed.uid,
          name: profile.name,
          email: profile.email,
          student_id: profile.student_id,
          department: profile.department,
          class_name: profile.class_name,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified,
          totalPoints,
          totalAttendance: attData?.length ?? 0,
          programmes: progs,
        });
        toast.success("Student ID scanned successfully");
      } catch {
        setScanError("Could not read QR code. Try again.");
        scanningRef.current = true;
      } finally {
        setScanLock(false);
      }
    },
    [scanLock, stopCamera],
  );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const pointsMutation = useMutation({
    mutationFn: async () => {
      if (!scannedStudent || !actionType) throw new Error("No student");
      const pts = parseInt(actionPoints);
      if (isNaN(pts) || pts <= 0) throw new Error("Enter a valid positive number");
      if (!actionReason.trim()) throw new Error("Reason is required");

      const finalPoints = actionType === "deduct_points" ? -pts : pts;

      const { error } = await supabase.functions.invoke("admin-adjust-points", {
        body: {
          studentUserId: scannedStudent.user_id,
          points: finalPoints,
          reason: actionReason.trim(),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(actionType === "deduct_points" ? "Points deducted" : "Points added");
      setActionType(null);
      setActionPoints("");
      setActionReason("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  const resetScanner = () => {
    setScannedStudent(null);
    setScanError(null);
    setScanLock(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Digital ID Scanner</h2>
        <p className="text-sm text-muted-foreground mt-1">Scan a student's Digital ID QR code to verify identity and take actions.</p>
      </div>

      {/* Scanner */}
      {!scannedStudent && (
        <Card className="border-border/50">
          <CardContent className="p-6">
            {scanning ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3] max-w-md mx-auto">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-primary/60 rounded-2xl" />
                  </div>
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                      <Camera className="h-3 w-3 mr-1" />
                      Scanning…
                    </Badge>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <Button onClick={stopCamera} variant="outline" className="w-full">
                  Stop Scanner
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                {scanError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <XCircle className="h-4 w-4" />
                    {scanError}
                  </div>
                )}
                <Button onClick={startCamera} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Start Scanner
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Point the camera at a student's Digital ID QR code. Ensure good lighting for best results.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Action Panel */}
      {scannedStudent && (
        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 rounded-xl border-2 border-primary/30">
                  <AvatarImage src={scannedStudent.avatar_url ?? undefined} alt={scannedStudent.name} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg">
                    {scannedStudent.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground">{scannedStudent.name}</h3>
                    {scannedStudent.is_verified && (
                      <Badge className="bg-primary/20 text-primary border border-primary/30 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {scannedStudent.student_id && (
                    <p className="text-sm font-mono text-muted-foreground">{scannedStudent.student_id}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{scannedStudent.email}</p>
                </div>
                <Badge className="bg-success/20 text-success border border-success/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Identified
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-lg border border-border/40 p-3 text-center">
                  <p className="text-xl font-bold text-primary">{scannedStudent.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3 text-center">
                  <p className="text-xl font-bold text-accent">{scannedStudent.totalAttendance}</p>
                  <p className="text-xs text-muted-foreground">Attended</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{scannedStudent.programmes.length}</p>
                  <p className="text-xs text-muted-foreground">Circles</p>
                </div>
              </div>

              {scannedStudent.programmes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {scannedStudent.programmes.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => setActionType("add_points")}
            >
              <Plus className="h-5 w-5 text-success" />
              <span className="text-xs">Add Points</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => setActionType("deduct_points")}
            >
              <Minus className="h-5 w-5 text-destructive" />
              <span className="text-xs">Deduct Points</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                toast.info("Use Attendance Control tab for manual attendance override.");
              }}
            >
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <span className="text-xs">Mark Attendance</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                toast.info(`Viewing profile for ${scannedStudent.name}`);
              }}
            >
              <Eye className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">View Profile</span>
            </Button>
          </div>

          <Button onClick={resetScanner} variant="secondary" className="w-full gap-2">
            <Camera className="h-4 w-4" />
            Scan Another Student
          </Button>
        </div>
      )}

      {/* Points Action Dialog */}
      <Dialog
        open={actionType === "add_points" || actionType === "deduct_points"}
        onOpenChange={(o) => !o && setActionType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "add_points" ? (
                <Plus className="h-5 w-5 text-success" />
              ) : (
                <Minus className="h-5 w-5 text-destructive" />
              )}
              {actionType === "add_points" ? "Add Points" : "Deduct Points"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "add_points" ? "Award" : "Deduct"} points for {scannedStudent?.name}. A reason is mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points</label>
              <Input
                type="number"
                min={1}
                placeholder="Enter amount"
                value={actionPoints}
                onChange={(e) => setActionPoints(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (mandatory)</label>
              <Textarea
                placeholder="Explain why…"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pointsMutation.mutate()}
              disabled={pointsMutation.isPending}
              className="gap-2"
            >
              {pointsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
