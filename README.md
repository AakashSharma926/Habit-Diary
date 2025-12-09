# 🎯 Habit Diary

A beautiful, modern habit tracking application built with React, TypeScript, and Firebase. Track your daily habits, monitor streaks, visualize progress with GitHub-style activity charts, and share reports with friends.

![Habit Diary Screenshot](https://via.placeholder.com/800x400/1e1b4b/8b5cf6?text=Habit+Diary)

## ✨ Features

### 📅 Habit Tracking
- **Weekly Goal System** - Set custom weekly targets for each habit
- **Binary & Numeric Habits** - Track yes/no habits or quantitative goals (e.g., "3 liters of water")
- **Visual Progress Indicators** - Color-coded status: On Track (green), Catch Up (yellow), Behind (red)
- **Future Date Protection** - Can only log habits for today and past dates

### 🔥 Streak System
- **Daily Streak Tracking** - Track consecutive days of habit completion
- **Per-Habit Streaks** - Individual streak tracking for each habit
- **Overall Streak** - Combined streak when all habits are completed
- **Streak Levels & Emojis**:
  - 💤 0 days (Sleeping)
  - 🌱 1+ days (Seedling)
  - ✨ 3+ days (Bronze)
  - 💫 7+ days (Silver)
  - ⭐ 14+ days (Gold)
  - 🔥 30+ days (Fire)
  - 👑 60+ days (Legendary)
  - 💎 100+ days (Mythic)
  - 🌟 365+ days (Immortal)

### 📊 Dashboard & Analytics
- **Overall Progress Donut Chart** - Visual completion percentage
- **Daily Completion Trend** - Area chart showing daily progress over time
- **Habit Breakdown Table** - Detailed stats per habit
- **Flexible Date Range Picker** - Filter stats by custom date ranges
- **Per-Habit Filtering** - View stats for individual habits

### 📆 Yearly Activity Chart
- **GitHub/LeetCode Style Heatmap** - Visualize your entire year at a glance
- **Month-by-Month Layout** - Clean separation between months
- **Current Day Highlight** - Cyan border on today's cell
- **Activity Levels** - 5 intensity levels from no activity to fully complete
- **Year Selector** - View activity from 2025 onwards

### 📈 Progress Reports
- **Shareable Reports** - Export to WhatsApp or clipboard
- **Downloadable Reports** - Save as text files
- **Comprehensive Stats** - Completion rate, perfect days, streaks
- **Habit Performance Breakdown** - Individual habit analysis

### 👥 Multi-User Support (Firebase)
- **Google Authentication** - Sign in with your Google account
- **Cloud Sync** - Data synced across devices
- **View Other Users** - See friends' progress (read-only)
- **User Profiles** - Display names and profile pictures

### 💾 Data Management
- **Export to JSON** - Full data backup
- **Export to CSV** - Spreadsheet-compatible format
- **Import Data** - Restore from JSON backup
- **Local Storage Fallback** - Works offline without Firebase

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript |
| **Styling** | Tailwind CSS, Custom CSS Animations |
| **State Management** | React Context API |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Date Handling** | date-fns |
| **Backend** | Firebase (Firestore, Authentication) |
| **Build Tool** | Vite |
| **Deployment** | Vercel |

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.tsx           # App header with streak badge, export/import
│   ├── TrackerView.tsx      # Main weekly habit tracker grid
│   ├── MainDashboard.tsx    # Stats dashboard with charts
│   ├── ReportsView.tsx      # Progress reports & sharing
│   ├── HabitForm.tsx        # Add/edit habit modal
│   ├── DateRangePicker.tsx  # Calendar date range selector
│   ├── FriendsPanel.tsx     # Multi-user panel
│   ├── LoginScreen.tsx      # Firebase authentication
│   └── ...
├── context/
│   ├── AuthContext.tsx      # Authentication state management
│   └── HabitContext.tsx     # Habits & entries state management
├── lib/
│   ├── firebase.ts          # Firebase configuration & Firestore ops
│   ├── localStorage.ts      # Local storage operations
│   └── utils.ts             # Utility functions (dates, streaks, etc.)
├── types/
│   └── index.ts             # TypeScript type definitions
├── App.tsx                  # Main app component with routing
├── main.tsx                 # App entry point
└── index.css                # Global styles & animations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Firebase project for cloud sync

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/habit-diary.git
   cd habit-diary
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional, for Firebase)
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## ☁️ Firebase Setup (Optional)

If you want cloud sync and multi-user features:

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable **Authentication** → Google Sign-in
3. Enable **Firestore Database**
4. Set Firestore rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /users/{userId}/habits/{habitId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /users/{userId}/entries/{entryId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Copy your Firebase config to `.env`

## 🌐 Deployment on Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (if using Firebase)
6. Click "Deploy"

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables on Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 📖 How It Works

### Habit Types
- **Binary Habits**: Yes/No tracking (e.g., "Wake up before 8AM")
- **Numeric Habits**: Quantity tracking with units (e.g., "3 liters of water")

### Weekly Goals
Each habit has a weekly goal. The app calculates daily expected progress:
- `dailyGoal = weeklyGoal / 7`
- Progress status is calculated based on how you're tracking vs. expected

### Streak Calculation
**Daily-based streaks**: A day is "complete" when all habits meet their daily goals:
- Binary habits: At least 1 completion
- Numeric habits: At least 80% of daily goal

The streak counts consecutive complete days from today backwards.

### Data Storage
- **With Firebase**: Data stored in Firestore, synced across devices
- **Without Firebase**: Data stored in browser's localStorage

## 🎨 Customization

### Changing Theme Colors
Edit `tailwind.config.js` or modify CSS variables in `index.css`:
- Primary gradient: Violet (#8b5cf6) to Cyan (#22d3ee)
- Background: Slate 900 (#0f172a)
- Glass effect: Semi-transparent with blur

### Adding New Streak Levels
Edit `src/lib/utils.ts`:
- `getStreakLevel()` - Returns level name
- `getStreakEmoji()` - Returns emoji for streak
- `getStreakColor()` - Returns color for level

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

If you have any questions or issues, please open a GitHub issue.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
