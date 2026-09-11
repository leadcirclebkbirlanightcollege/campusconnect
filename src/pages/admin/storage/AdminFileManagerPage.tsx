import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  checkGoogleDriveStatus,
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  downloadFromGoogleDrive,
  reconcileGoogleDriveFiles,
  formatFileSize,
  StorageFileRecord,
  EntityType,
  AccessLevel,
  GoogleDriveConfigError,
} from "@/services/googleDriveStorage";
import {
  Search,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  ExternalLink,
  RefreshCw,
  Folder,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Shield,
  FileCode,
  Image as ImageIcon,
  FileArchive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

const ENTITY_CATEGORIES: Array<{ label: string; value: EntityType; folder: string }> = [
  { label: "Academics & Study Material", value: "document", folder: "Campus Connect/Academics" },
  { label: "Assignments", value: "assignment", folder: "Campus Connect/Assignments" },
  { label: "Events & Festivals", value: "event", folder: "Campus Connect/Events" },
  { label: "Announcements & Notices", value: "notice", folder: "Campus Connect/Notices" },
  { label: "Certificates & Verification", value: "certificate", folder: "Campus Connect/Certificates" },
  { label: "Student Documents & KYC", value: "student_id", folder: "Campus Connect/Student Documents" },
  { label: "Media & Assets", value: "media", folder: "Campus Connect/Media" },
  { label: "General Files", value: "general", folder: "Campus Connect/General" },
];

export default function AdminFileManagerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & State
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StorageFileRecord | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<EntityType>("document");
  const [uploadAccess, setUploadAccess] = useState<AccessLevel>("authenticated");
  const [isUploading, setIsUploading] = useState(false);

  // College ID query
  const { data: collegeId } = useQuery({
    queryKey: ["my_college_id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_college_id");
      return data as string | null;
    },
    staleTime: 120_000,
  });

  // Google Drive Backend Status
  const { data: driveStatus, refetch: refetchDriveStatus } = useQuery({
    queryKey: ["admin", "google_drive_status"],
    queryFn: checkGoogleDriveStatus,
    staleTime: 60_000,
  });

  // Files List Query
  const {
    data: files = [],
    isLoading: filesLoading,
  } = useQuery<StorageFileRecord[]>({
    queryKey: ["admin", "storage_files", collegeId, entityFilter, accessFilter],
    queryFn: async () => {
      let q = supabase
        .from("storage_files")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (collegeId) {
        q = q.or(`college_id.eq.${collegeId},college_id.is.null`);
      }

      if (entityFilter !== "all") {
        q = q.eq("entity_type", entityFilter);
      }

      if (accessFilter !== "all") {
        q = q.eq("access_level", accessFilter);
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: reconcileGoogleDriveFiles,
    onSuccess: (data) => {
      toast.success(`Consistency check finished. Scanned ${data.count} files.`);
      qc.invalidateQueries({ queryKey: ["admin", "storage_files"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reconcile Google Drive files");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (file: StorageFileRecord) => {
      await deleteFromGoogleDrive(file.id);
    },
    onSuccess: () => {
      toast.success("File deleted from Google Drive and records updated.");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin", "storage_files"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete file");
    },
  });

  // Upload Handler
  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadToGoogleDrive({
        file: uploadFile,
        entity_type: uploadCategory,
        access_level: uploadAccess,
        college_id: collegeId,
      });

      toast.success(`"${uploadFile.name}" uploaded successfully to Google Drive!`);
      setUploadDialogOpen(false);
      setUploadFile(null);
      qc.invalidateQueries({ queryKey: ["admin", "storage_files"] });
    } catch (err: any) {
      if (err instanceof GoogleDriveConfigError) {
        toast.error("Google Drive OAuth Not Configured", {
          description:
            "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN via Supabase secrets before uploading.",
        });
      } else {
        toast.error(err.message || "File upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered files by search
  const filteredFiles = files.filter((f) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      f.file_name.toLowerCase().includes(s) ||
      f.original_file_name.toLowerCase().includes(s) ||
      f.entity_type.toLowerCase().includes(s)
    );
  });

  // Calculate statistics
  const totalSizeBytes = files.reduce((acc, f) => acc + (Number(f.file_size) || 0), 0);
  const activeCount = files.length;

  const getFileIcon = (mime: string) => {
    if (mime.includes("pdf")) return <FileText className="h-5 w-5 text-rose-500" />;
    if (mime.includes("image")) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    if (mime.includes("zip") || mime.includes("tar") || mime.includes("compressed"))
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    if (mime.includes("text") || mime.includes("code") || mime.includes("json"))
      return <FileCode className="h-5 w-5 text-cyan-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            Google Drive Storage Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise file storage powered by Google Drive ($0/mo Personal Account or Shared Drive) with Supabase authentication & metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                reconcileMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Verify Drive Sync
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => setUploadDialogOpen(true)}
          >
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Google Drive Health / Status Alert */}
      {driveStatus?.configured && driveStatus?.oauth_valid ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Google Drive Storage Active ($0/mo Free Tier)</p>
              <p className="text-[11px] opacity-90">
                Connected via Google OAuth 2.0 ({driveStatus.provider_type === "personal" ? "Personal 15GB Drive" : "Shared Drive"}) • Root Folder ID: &ldquo;{driveStatus.root_folder}&rdquo;
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Connected
          </Badge>
        </div>
      ) : driveStatus?.configured && !driveStatus?.oauth_valid ? (
        <div className="flex items-start justify-between p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="text-xs font-semibold">Google OAuth Token Needs Refresh</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                All 3 configuration secrets are present in Supabase, but Google OAuth token exchange reported:
              </p>
              <div className="mt-1.5 p-2 rounded bg-amber-500/15 font-mono text-[11px] text-foreground/90">
                {driveStatus.oauth_error || "Google OAuth token refresh failed (401): unauthorized_client"}
              </div>
              <p className="text-[11px] opacity-80 mt-2">
                <strong>How to fix (1 minute):</strong> In Google OAuth Playground, click the ⚙️ gear icon in the top-right corner, check <em>&ldquo;Use your own OAuth credentials&rdquo;</em>, paste your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>, authorize <code>https://www.googleapis.com/auth/drive.file</code>, and copy the new refresh token.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shrink-0 ml-2"
            onClick={() => refetchDriveStatus()}
          >
            Check Status
          </Button>
        </div>
      ) : (
        <div className="flex items-start justify-between p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold">Google Drive OAuth Configuration Pending ($0/mo Setup)</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                The storage integration structure is ready. To enable live byte streaming to your free 15GB Google Account, set your Google OAuth 2.0 credentials via Supabase CLI:
              </p>
              <div className="mt-2 space-y-1">
                <code className="block px-2 py-1 rounded bg-amber-500/20 text-[10px] font-mono select-all">
                  npx supabase secrets set GOOGLE_CLIENT_ID=&quot;your-client-id&quot; GOOGLE_CLIENT_SECRET=&quot;your-client-secret&quot; GOOGLE_REFRESH_TOKEN=&quot;your-refresh-token&quot;
                </code>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shrink-0 ml-2"
            onClick={() => refetchDriveStatus()}
          >
            Check Status
          </Button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Files</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{activeCount}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Storage Used</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{formatFileSize(totalSizeBytes)}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <HardDrive className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Drive Categories</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{ENTITY_CATEGORIES.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Folder className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Storage Plan</p>
                <h3 className="text-sm font-semibold text-foreground mt-1">$0/mo Free Tier (15GB)</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by file name or module…"
                className="h-9 pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ENTITY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={accessFilter} onValueChange={setAccessFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="All Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Access</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="authenticated">Authenticated</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List Table */}
      <Card className="border-border/40">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-semibold">Managed Files Directory</CardTitle>
          <CardDescription className="text-xs">
            Files stored in Google Drive and referenced by Campus Connect database entities.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {filesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-14 text-center">
              <HardDrive className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No storage files found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload files using the button above or attach files across module pages.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 text-xs"
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload First File
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground">
                    <th className="pb-3 font-medium">File Name</th>
                    <th className="pb-3 font-medium">Module / Folder</th>
                    <th className="pb-3 font-medium">Access</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium">Upload Date</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            {getFileIcon(file.mime_type)}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-medium text-foreground truncate" title={file.original_file_name}>
                              {file.original_file_name || file.file_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">
                              Drive ID: {file.google_drive_file_id.slice(0, 14)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {file.entity_type}
                        </Badge>
                      </td>

                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            file.access_level === "public"
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : file.access_level === "authenticated"
                              ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                              : "border-purple-500/30 text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {file.access_level}
                        </Badge>
                      </td>

                      <td className="py-3 pr-4 font-mono text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {format(new Date(file.created_at), "dd MMM yyyy, HH:mm")}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {file.drive_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="View in Google Drive"
                              onClick={() => window.open(file.drive_url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Download File"
                            onClick={() => downloadFromGoogleDrive(file)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete File"
                            onClick={() => setDeleteTarget(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Upload to Google Drive
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a file and target destination folder. File bytes are streamed to Google Drive and metadata registered in Supabase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Target Category / Drive Subfolder</Label>
              <Select
                value={uploadCategory}
                onValueChange={(val) => setUploadCategory(val as EntityType)}
              >
                <SelectTrigger className="mt-1.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label} ({cat.folder})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Access Control Level</Label>
              <Select
                value={uploadAccess}
                onValueChange={(val) => setUploadAccess(val as AccessLevel)}
              >
                <SelectTrigger className="mt-1.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public" className="text-xs">
                    Public (Accessible by anyone with link)
                  </SelectItem>
                  <SelectItem value="authenticated" className="text-xs">
                    Authenticated (College staff and students only)
                  </SelectItem>
                  <SelectItem value="private" className="text-xs">
                    Private (College Administrators only)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                uploadFile
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 hover:border-primary/40 bg-muted/20"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              {uploadFile ? (
                <div>
                  <p className="text-xs font-semibold text-foreground truncate">{uploadFile.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatFileSize(uploadFile.size)} • Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-foreground">Click or drag file here to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Supports PDF, DOCX, PPTX, Images, ZIP up to 50MB
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setUploadFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFile(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Streaming to Drive…
                </>
              ) : (
                "Upload to Drive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete File?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action will remove &ldquo;{deleteTarget?.original_file_name}&rdquo; from Google Drive and
              mark the file reference deleted in Campus Connect. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting from Drive…" : "Delete File"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
