# Campus Connect - Admin Setup Guide

## 🎓 Welcome to Campus Connect!

Your complete college lecture, attendance, and admin management system is now live.

---

## 🔐 Initial Admin Account Setup

An admin account has been configured using the credentials you provided:
- **Email**: Check your ADMIN_EMAIL secret
- **Password**: Check your ADMIN_PASSWORD secret

### First Login Steps:
1. Navigate to `/auth`
2. Use the admin credentials to log in
3. You'll be automatically redirected to the admin dashboard

---

## 📊 System Architecture

### **Database Tables**
- `profiles` - User profiles with personal information
- `user_roles` - Role assignments (admin/student)
- `lectures` - Lecture schedules and details
- `attendance_tokens` - OTP/QR codes for attendance (10-min expiry)
- `attendance` - Attendance records
- `points_ledger` - Points tracking system
- `notifications` - System notifications
- `notification_recipients` - Notification delivery tracking

### **Edge Functions**
- `ensure-admin-account` - Creates admin account on deployment
- `admin-generate-attendance` - Generates OTP/QR codes for lectures
- `mark-attendance` - Students mark attendance
- `finalize-attendance` - Marks absent students after token expiry

### **Storage**
- `lecture-flyers` bucket - Public storage for lecture flyers

---

## 🚀 Key Features

### For Students:
- ✅ Mark attendance via QR code or 6-digit OTP
- 📚 View upcoming lectures
- 🏆 Track points earned
- 🔔 Receive notifications
- 📊 View attendance history

### For Admins:
- 👥 Manage student profiles
- 📅 Create and manage lectures
- 🎯 Generate attendance tokens (OTP/QR)
- ✅ Finalize attendance
- 📢 Send notifications
- 📈 View analytics

---

## 🔒 Security Features

- **Row-Level Security (RLS)** enabled on all tables
- **Role-based access control** (admin/student)
- **Soft delete** for user accounts
- **OTP hashing** - Never stores plaintext OTPs
- **Token expiry** - 10-minute attendance window
- **One attendance per lecture** - Prevents duplicate entries

---

## 📝 Usage Guide

### Creating Lectures (Admin):
1. Go to Admin Dashboard → Lectures tab
2. Add lecture details (topic, date, time, venue)
3. Optional: Upload flyer image

### Generating Attendance Tokens (Admin):
1. Select a lecture
2. Click "Generate Attendance"
3. System shows OTP and QR code (valid 10 minutes)
4. Share with students

### Marking Attendance (Student):
1. Go to attendance page
2. Enter 6-digit OTP OR scan QR code
3. Attendance marked + points awarded

### Finalizing Attendance (Admin):
- Automatically marks absent students
- Can be triggered manually or after token expiry

---

## 🎨 Design System

**Colors:**
- Primary: Academic Navy (#2563EB)
- Accent: Knowledge Teal (#14B8A6)
- Success: Achievement Green (#059669)

**Features:**
- Smooth page transitions
- Hover micro-interactions
- Gradient mesh backgrounds
- Premium card shadows
- Mobile-responsive design

---

## 🌐 Deployment URLs

**Production Web App**: https://campusconnect.indevs.in

---

## 📞 Support & Diagnostics

For technical issues:
1. Check Supabase Dashboard / Edge Function logs
2. Review Vercel deployment logs
3. Verify RLS policies
4. Check attendance token expiry

---

## ✅ Next Steps

1. ✅ Database schema created
2. ✅ Admin account configured
3. ✅ Edge functions deployed
4. ✅ Authentication enabled
5. 🔄 Test the system:
   - Create test student accounts
   - Create a lecture
   - Generate attendance token
   - Mark attendance
   - Finalize attendance