import * as React from "react";
import { AppIcon, type AppIconProps } from "./AppIcon";
import { LUCIDE_TO_HUGEICON_MAP } from "./icon-map";
import type { IconSvgElement } from "@hugeicons/react";

export * from "./AppIcon";
export * from "./icon-map";
export { HugeiconsIcon } from "@hugeicons/react";
export type { IconSvgElement } from "@hugeicons/react";

export type LucideIcon = React.ComponentType<AppIconProps>;
export type LucideProps = AppIconProps;

/**
 * Creates a standalone React component for a specific Hugeicon definition.
 * Inherits standard AppIcon sizing, stroke width, and accessibility properties.
 */
export function createHugeIcon(icon: IconSvgElement, displayName: string) {
  const Component = React.forwardRef<SVGSVGElement, Omit<AppIconProps, "icon" | "name">>(
    (props, ref) => React.createElement(AppIcon, { ref, icon, ...props })
  );
  Component.displayName = displayName;
  return Component;
}

// ── Drop-in Unified Icon Components (Powered by Hugeicons) ───────────

export const Home = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Home, "Home");
export const LayoutDashboard = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LayoutDashboard, "LayoutDashboard");
export const Calendar = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Calendar, "Calendar");
export const CalendarDays = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarDays, "CalendarDays");
export const CalendarCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarCheck, "CalendarCheck");
export const CalendarClock = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarClock, "CalendarClock");
export const CalendarPlus = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarPlus, "CalendarPlus");
export const CalendarHeart = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarHeart, "CalendarHeart");
export const CalendarRange = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CalendarRange, "CalendarRange");
export const Clock = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Clock, "Clock");
export const Clock3 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Clock3, "Clock3");
export const Timer = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Timer, "Timer");
export const AlarmClock = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.AlarmClock, "AlarmClock");
export const Menu = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Menu, "Menu");
export const PanelLeft = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.PanelLeft, "PanelLeft");

export const BookOpen = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BookOpen, "BookOpen");
export const BookOpenCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BookOpenCheck, "BookOpenCheck");
export const GraduationCap = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.GraduationCap, "GraduationCap");
export const School = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.School, "School");
export const Brain = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Brain, "Brain");
export const FlaskConical = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FlaskConical, "FlaskConical");

export const Users = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Users, "Users");
export const User = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.User, "User");
export const UserRound = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserRound, "UserRound");
export const UserCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserCheck, "UserCheck");
export const UserRoundCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserRoundCheck, "UserRoundCheck");
export const UserPlus = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserPlus, "UserPlus");
export const UserX = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserX, "UserX");
export const UserCog = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserCog, "UserCog");
export const UserCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserCircle, "UserCircle");
export const UserCircle2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserCircle2, "UserCircle2");
export const UserPen = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UserPen, "UserPen");
export const IdCard = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.IdCard, "IdCard");
export const Fingerprint = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Fingerprint, "Fingerprint");

export const Check = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Check, "Check");
export const CheckCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CheckCheck, "CheckCheck");
export const CheckCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CheckCircle, "CheckCircle");
export const CheckCircle2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CheckCircle2, "CheckCircle2");
export const CheckSquare = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CheckSquare, "CheckSquare");
export const BadgeCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BadgeCheck, "BadgeCheck");
export const AlertCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.AlertCircle, "AlertCircle");
export const AlertTriangle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.AlertTriangle, "AlertTriangle");
export const TriangleAlert = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.TriangleAlert, "TriangleAlert");
export const X = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.X, "X");
export const XCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.XCircle, "XCircle");
export const MinusCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MinusCircle, "MinusCircle");
export const PlusCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.PlusCircle, "PlusCircle");
export const ArrowUpCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowUpCircle, "ArrowUpCircle");
export const Minus = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Minus, "Minus");
export const Plus = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Plus, "Plus");
export const Circle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Circle, "Circle");
export const Dot = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Dot, "Dot");
export const StopCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.StopCircle, "StopCircle");
export const PauseCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.PauseCircle, "PauseCircle");

export const Search = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Search, "Search");
export const Filter = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Filter, "Filter");
export const SlidersHorizontal = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.SlidersHorizontal, "SlidersHorizontal");
export const Pencil = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Pencil, "Pencil");
export const FileEdit = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FileEdit, "FileEdit");
export const Trash2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Trash2, "Trash2");
export const Save = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Save, "Save");
export const Download = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Download, "Download");
export const Upload = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Upload, "Upload");
export const UploadCloud = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.UploadCloud, "UploadCloud");
export const RefreshCw = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.RefreshCw, "RefreshCw");
export const RotateCcw = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.RotateCcw, "RotateCcw");
export const Undo2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Undo2, "Undo2");
export const Copy = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Copy, "Copy");
export const Share = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Share, "Share");
export const Share2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Share2, "Share2");
export const Eye = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Eye, "Eye");
export const EyeOff = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.EyeOff, "EyeOff");
export const Printer = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Printer, "Printer");
export const Pin = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Pin, "Pin");
export const Tag = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Tag, "Tag");
export const GripVertical = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.GripVertical, "GripVertical");
export const MoreHorizontal = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MoreHorizontal, "MoreHorizontal");
export const MoreVertical = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MoreVertical, "MoreVertical");

export const ArrowRight = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowRight, "ArrowRight");
export const ArrowLeft = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowLeft, "ArrowLeft");
export const ArrowUp = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowUp, "ArrowUp");
export const ArrowDown = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowDown, "ArrowDown");
export const ArrowUpDown = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ArrowUpDown, "ArrowUpDown");
export const ChevronRight = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ChevronRight, "ChevronRight");
export const ChevronLeft = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ChevronLeft, "ChevronLeft");
export const ChevronDown = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ChevronDown, "ChevronDown");
export const ChevronUp = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ChevronUp, "ChevronUp");
export const ExternalLink = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ExternalLink, "ExternalLink");

export const FileText = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FileText, "FileText");
export const File = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.File, "File");
export const FileSpreadsheet = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FileSpreadsheet, "FileSpreadsheet");
export const FileCheck2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FileCheck2, "FileCheck2");
export const FileType2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.FileType2, "FileType2");
export const ClipboardCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ClipboardCheck, "ClipboardCheck");
export const ClipboardList = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ClipboardList, "ClipboardList");
export const Image = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Image, "Image");
export const Camera = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Camera, "Camera");
export const CameraOff = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CameraOff, "CameraOff");
export const Video = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Video, "Video");
export const Play = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Play, "Play");
export const PlayCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.PlayCircle, "PlayCircle");
export const Paperclip = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Paperclip, "Paperclip");
export const Archive = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Archive, "Archive");

export const Trophy = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Trophy, "Trophy");
export const Award = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Award, "Award");
export const Medal = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Medal, "Medal");
export const Coins = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Coins, "Coins");
export const Star = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Star, "Star");
export const Sparkles = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Sparkles, "Sparkles");
export const Wand2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Wand2, "Wand2");
export const Zap = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Zap, "Zap");
export const Flame = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Flame, "Flame");
export const Target = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Target, "Target");
export const PartyPopper = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.PartyPopper, "PartyPopper");
export const Rocket = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Rocket, "Rocket");

export const Bell = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Bell, "Bell");
export const BellOff = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BellOff, "BellOff");
export const Megaphone = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Megaphone, "Megaphone");
export const MessageSquare = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MessageSquare, "MessageSquare");
export const MessageSquarePlus = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MessageSquarePlus, "MessageSquarePlus");
export const MessageSquareHeart = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MessageSquareHeart, "MessageSquareHeart");
export const MessageCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MessageCircle, "MessageCircle");
export const Inbox = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Inbox, "Inbox");
export const Mail = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Mail, "Mail");
export const MailOpen = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MailOpen, "MailOpen");
export const Phone = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Phone, "Phone");

export const Shield = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Shield, "Shield");
export const ShieldCheck = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ShieldCheck, "ShieldCheck");
export const ShieldAlert = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ShieldAlert, "ShieldAlert");
export const ShieldX = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ShieldX, "ShieldX");
export const Lock = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Lock, "Lock");
export const Key = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Key, "Key");
export const KeyRound = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.KeyRound, "KeyRound");
export const Settings = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Settings, "Settings");
export const Settings2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Settings2, "Settings2");
export const LogOut = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LogOut, "LogOut");
export const LogIn = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LogIn, "LogIn");

export const TrendingUp = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.TrendingUp, "TrendingUp");
export const TrendingUpIcon = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.TrendingUpIcon, "TrendingUpIcon");
export const TrendingDown = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.TrendingDown, "TrendingDown");
export const BarChart2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BarChart2, "BarChart2");
export const BarChart3 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.BarChart3, "BarChart3");
export const ChartLine = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ChartLine, "ChartLine");
export const Activity = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Activity, "Activity");
export const Radar = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Radar, "Radar");

export const Building2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Building2, "Building2");
export const Landmark = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Landmark, "Landmark");
export const Store = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Store, "Store");
export const CreditCard = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.CreditCard, "CreditCard");
export const Briefcase = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Briefcase, "Briefcase");
export const MapPin = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MapPin, "MapPin");

export const Globe = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Globe, "Globe");
export const Database = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Database, "Database");
export const Server = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Server, "Server");
export const Network = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Network, "Network");
export const Wifi = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Wifi, "Wifi");
export const WifiOff = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.WifiOff, "WifiOff");
export const Smartphone = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Smartphone, "Smartphone");
export const Laptop = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Laptop, "Laptop");
export const MonitorSmartphone = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.MonitorSmartphone, "MonitorSmartphone");
export const LayoutGrid = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LayoutGrid, "LayoutGrid");
export const Grid3X3 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Grid3X3, "Grid3X3");
export const LayoutTemplate = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LayoutTemplate, "LayoutTemplate");
export const Layers = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Layers, "Layers");
export const List = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.List, "List");
export const Hash = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Hash, "Hash");
export const QrCode = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.QrCode, "QrCode");
export const Scan = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Scan, "Scan");
export const ScanLine = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.ScanLine, "ScanLine");
export const Sun = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Sun, "Sun");
export const Moon = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Moon, "Moon");
export const Lightbulb = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Lightbulb, "Lightbulb");
export const HelpCircle = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.HelpCircle, "HelpCircle");
export const LifeBuoy = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.LifeBuoy, "LifeBuoy");
export const Info = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Info, "Info");
export const Bug = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Bug, "Bug");
export const Palette = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Palette, "Palette");
export const History = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.History, "History");
export const Loader2 = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Loader2, "Loader2");
export const Radio = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Radio, "Radio");
export const Send = createHugeIcon(LUCIDE_TO_HUGEICON_MAP.Send, "Send");

// ── Affinity / sentiment ─────────────────────────────────────────────
// FavouriteIcon is the Hugeicons equivalent of a heart (outline stroke variant)
import { FavouriteIcon } from "@hugeicons/core-free-icons";
export const Heart = createHugeIcon(FavouriteIcon, "Heart");
