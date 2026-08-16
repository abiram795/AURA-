const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Database File Paths (Fallback Mode)
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

// Initialize Supabase if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const useSupabase = !!(supabaseUrl && supabaseKey);
let supabase = null;

if (useSupabase) {
  console.log(`🔌 Supabase configuration detected. Connecting to database: ${supabaseUrl}`);
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log('📁 No Supabase credentials in .env. Falling back to local JSON database storage.');
}

// ----------------------------------------------------
// HYBRID DATABASE ROUTER FUNCTIONS
// ----------------------------------------------------

// File helper functions
async function readDB(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

async function writeDB(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Users Database Methods
async function dbGetUsers() {
  if (useSupabase) {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw new Error(error.message);
    return data.map(u => ({
      ...u,
      lastActiveDate: u.last_active_date,
      ratingCount: u.rating_count,
      rating: parseFloat(u.rating || 0)
    }));
  }
  return readDB(USERS_FILE);
}

async function dbGetUser(id) {
  if (useSupabase) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data,
      lastActiveDate: data.last_active_date,
      ratingCount: data.rating_count,
      rating: parseFloat(data.rating || 0),
      longestStreak: data.longest_streak || data.streak || 0,
      totalLearningHours: data.total_learning_hours || 0,
      monthlyActivity: data.monthly_activity || {},
      certificates: data.certificates || []
    };
  }
  const users = await readDB(USERS_FILE);
  return users.find(u => u.id === id) || null;
}

async function dbSaveUser(user) {
  if (useSupabase) {
    // Tier 1: Full payload with all optional analytics columns
    const fullMapped = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      last_active_date: user.lastActiveDate,
      interests: user.interests,
      badges: user.badges,
      goals: user.goals,
      rating: user.rating || 0,
      rating_count: user.ratingCount || 0,
      longest_streak: user.longestStreak || user.streak || 0,
      total_learning_hours: user.totalLearningHours || 0,
      monthly_activity: user.monthlyActivity || {},
      certificates: user.certificates || []
    };
    const { error: e1 } = await supabase.from('users').upsert(fullMapped);
    if (!e1) return user;

    // Tier 2: Drop analytics columns (monthly_activity, certificates, longest_streak, total_learning_hours)
    const midMapped = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      last_active_date: user.lastActiveDate,
      interests: user.interests,
      badges: user.badges,
      goals: user.goals,
      rating: user.rating || 0,
      rating_count: user.ratingCount || 0
    };
    const { error: e2 } = await supabase.from('users').upsert(midMapped);
    if (!e2) return user;

    // Tier 3: Core columns only — no rating, no analytics
    const coreMapped = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      last_active_date: user.lastActiveDate,
      interests: user.interests,
      badges: user.badges,
      goals: user.goals
    };
    const { error: e3 } = await supabase.from('users').upsert(coreMapped);
    if (e3) {
      // All tiers failed — log once and return (don't crash the request)
      console.error('[dbSaveUser] All upsert tiers failed:', e3.message);
    }
    return user;
  }

  const users = await readDB(USERS_FILE);
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  await writeDB(USERS_FILE, users);
  return user;
}

// Attendance Database Methods
async function dbMarkAttendance(userId) {
  const user = await dbGetUser(userId);
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];

  if (useSupabase) {
    // Silently skip if attendance table doesn't exist in this Supabase instance
    const { error } = await supabase.from('attendance').upsert({
      user_id: userId,
      username: user.username,
      role: user.role,
      date: today
    }, { onConflict: 'user_id,date' });
    // Only log non-schema errors (schema errors are expected in minimal Supabase setups)
    if (error && !error.message.includes('schema cache') && !error.message.includes('does not exist')) {
      console.error('Error marking attendance:', error.message);
    }
  } else {
    const attendance = await readDB(ATTENDANCE_FILE);
    const exists = attendance.find(a => a.userId === userId && a.date === today);
    if (!exists) {
      attendance.push({
        id: 'att_' + Date.now(),
        userId,
        username: user.username,
        role: user.role,
        date: today
      });
      await writeDB(ATTENDANCE_FILE, attendance);
    }
  }
  return true;
}

async function dbGetAttendance() {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);
    return data.map(a => ({
      id: a.id,
      userId: a.user_id,
      username: a.username,
      role: a.role,
      date: a.date
    }));
  }
  return readDB(ATTENDANCE_FILE);
}

// Courses Database Methods
async function dbGetCourses() {
  if (useSupabase) {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) throw new Error(error.message);
    return data.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      instructorId: c.instructor_id,
      instructorName: c.instructor_name,
      image: c.image,
      category: c.category,
      difficulty: c.difficulty,
      duration: c.duration,
      price: parseFloat(c.price || 0),
      xpReward: c.xp_reward,
      modules: c.modules,
      quizzes: c.quizzes
    }));
  }
  return readDB(COURSES_FILE);
}

async function dbGetCourse(id) {
  if (useSupabase) {
    const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
    if (error) return null;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      instructorId: data.instructor_id,
      instructorName: data.instructor_name,
      image: data.image,
      category: data.category,
      difficulty: data.difficulty,
      duration: data.duration,
      price: parseFloat(data.price || 0),
      xpReward: data.xp_reward,
      modules: data.modules,
      quizzes: data.quizzes
    };
  }
  const courses = await readDB(COURSES_FILE);
  return courses.find(c => c.id === id);
}

async function dbCreateCourse(course) {
  if (useSupabase) {
    const mapped = {
      id: course.id,
      title: course.title,
      description: course.description,
      instructor_id: course.instructorId,
      instructor_name: course.instructorName,
      image: course.image,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration,
      price: course.price,
      xp_reward: course.xpReward,
      modules: course.modules,
      quizzes: course.quizzes
    };
    const { error } = await supabase.from('courses').insert(mapped);
    if (error) throw new Error(error.message);
    return course;
  }
  const courses = await readDB(COURSES_FILE);
  courses.push(course);
  await writeDB(COURSES_FILE, courses);
  return course;
}

async function dbDeleteCourse(id) {
  if (useSupabase) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const courses = await readDB(COURSES_FILE);
  const filtered = courses.filter(c => c.id !== id);
  if (courses.length === filtered.length) return false;
  await writeDB(COURSES_FILE, filtered);
  return true;
}

async function dbSaveQuiz(courseId, newQuiz) {
  const course = await dbGetCourse(courseId);
  if (!course) return null;

  if (!course.quizzes) course.quizzes = [];
  course.quizzes.push(newQuiz);

  if (useSupabase) {
    const { error } = await supabase.from('courses').update({ quizzes: course.quizzes }).eq('id', courseId);
    if (error) throw new Error(error.message);
  } else {
    const courses = await readDB(COURSES_FILE);
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx !== -1) {
      courses[idx].quizzes = course.quizzes;
      await writeDB(COURSES_FILE, courses);
    }
  }
  return newQuiz;
}

// Progress Database Methods
async function dbGetProgressList(userId) {
  if (useSupabase) {
    const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId);
    if (error) throw new Error(error.message);
    return data.map(p => ({
      userId: p.user_id,
      courseId: p.course_id,
      completedLessons: p.completed_lessons,
      quizScores: p.quiz_scores,
      bookmarks: p.bookmarks,
      completedAt: p.completed_at,
      purchased: p.purchased
    }));
  }
  const progressList = await readDB(PROGRESS_FILE);
  return progressList.filter(p => p.userId === userId);
}

async function dbSaveProgress(p) {
  if (useSupabase) {
    const mapped = {
      user_id: p.userId,
      course_id: p.courseId,
      completed_lessons: p.completedLessons,
      quiz_scores: p.quizScores,
      bookmarks: p.bookmarks,
      completed_at: p.completedAt,
      purchased: p.purchased
    };
    const { error } = await supabase.from('progress').upsert(mapped, { onConflict: 'user_id,course_id' });
    if (error) throw new Error(error.message);
    return p;
  }
  const progressList = await readDB(PROGRESS_FILE);
  const idx = progressList.findIndex(x => x.userId === p.userId && x.courseId === p.courseId);
  if (idx !== -1) {
    progressList[idx] = p;
  } else {
    progressList.push(p);
  }
  await writeDB(PROGRESS_FILE, progressList);
  return p;
}

// Comments Database Methods
async function dbGetComments(lessonId) {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('timestamp', { ascending: true });
    
    if (error) throw new Error(error.message);
    return data.map(c => ({
      id: c.id,
      lessonId: c.lesson_id,
      userId: c.user_id,
      userName: c.username,
      userAvatar: c.avatar,
      commentText: c.text,
      createdAt: c.timestamp
    }));
  }
  const comments = await readDB(COMMENTS_FILE);
  const filtered = comments.filter(c => c.lessonId === lessonId);
  return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function dbCreateComment(comment) {
  if (useSupabase) {
    const mapped = {
      lesson_id: comment.lessonId,
      user_id: comment.userId,
      username: comment.userName,
      avatar: comment.userAvatar,
      text: comment.commentText,
      timestamp: comment.createdAt
    };
    const { error } = await supabase.from('comments').insert(mapped);
    if (error) throw new Error(error.message);
    return comment;
  }
  const comments = await readDB(COMMENTS_FILE);
  comments.push(comment);
  await writeDB(COMMENTS_FILE, comments);
  return comment;
}

// Notifications Database Methods
async function dbGetNotifications(userId) {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data.map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.timestamp
    }));
  }
  const notifications = await readDB(NOTIFICATIONS_FILE);
  const filtered = notifications.filter(n => n.userId === userId);
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function dbAddNotification(userId, title, message) {
  const newNotif = {
    id: 'n_' + Date.now(),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };

  if (useSupabase) {
    const mapped = {
      user_id: userId,
      title,
      message,
      read: false
    };
    const { error } = await supabase.from('notifications').insert(mapped);
    if (error) throw new Error(error.message);
  } else {
    const notifications = await readDB(NOTIFICATIONS_FILE);
    notifications.push(newNotif);
    await writeDB(NOTIFICATIONS_FILE, notifications);
  }
  return newNotif;
}

async function dbMarkNotificationsRead(userId) {
  if (useSupabase) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    if (error) throw new Error(error.message);
  } else {
    const notifications = await readDB(NOTIFICATIONS_FILE);
    notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    await writeDB(NOTIFICATIONS_FILE, notifications);
  }
  return true;
}

// Helper to log monthly activity and evaluate dynamic badges/achievements
// Fully fault-tolerant — errors are logged but never propagated to callers
async function logMonthlyActivity(userId, xpAmount, lessonsCount = 0, coursesCount = 0, achievementId = null) {
  try {
    const user = await dbGetUser(userId);
    if (!user) return;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = String(now.getDate());

    if (!user.monthlyActivity) user.monthlyActivity = {};

    if (!user.monthlyActivity[yearMonth]) {
      user.monthlyActivity[yearMonth] = {
        xpEarned: 0,
        lessonsCompleted: 0,
        coursesCompleted: 0,
        achievementsUnlocked: [],
        dailyXp: {}
      };
    }

    const log = user.monthlyActivity[yearMonth];
    if (!log.dailyXp) log.dailyXp = {};
    if (!log.achievementsUnlocked) log.achievementsUnlocked = [];

    log.xpEarned = (log.xpEarned || 0) + xpAmount;
    log.lessonsCompleted = (log.lessonsCompleted || 0) + lessonsCount;
    log.coursesCompleted = (log.coursesCompleted || 0) + coursesCount;
    log.dailyXp[day] = (log.dailyXp[day] || 0) + xpAmount;

    if (achievementId && !log.achievementsUnlocked.includes(achievementId)) {
      log.achievementsUnlocked.push(achievementId);
    }

    // Evaluate achievement badges dynamically
    const achievements = Array.isArray(user.badges) ? [...user.badges] : [];

    if (log.coursesCompleted >= 1 && !achievements.includes('badge_first_course')) {
      achievements.push('badge_first_course');
      if (!log.achievementsUnlocked.includes('badge_first_course')) log.achievementsUnlocked.push('badge_first_course');
    }
    if ((user.streak || 0) >= 7 && !achievements.includes('badge_7day_streak')) {
      achievements.push('badge_7day_streak');
      if (!log.achievementsUnlocked.includes('badge_7day_streak')) log.achievementsUnlocked.push('badge_7day_streak');
    }
    if ((user.streak || 0) >= 30 && !achievements.includes('badge_30day_streak')) {
      achievements.push('badge_30day_streak');
      if (!log.achievementsUnlocked.includes('badge_30day_streak')) log.achievementsUnlocked.push('badge_30day_streak');
    }

    try {
      const progressList = await dbGetProgressList(userId);
      const totalCompletedCourses = progressList.filter(p => p.completedAt).length;
      if (totalCompletedCourses >= 5 && !achievements.includes('badge_5_courses')) {
        achievements.push('badge_5_courses');
        if (!log.achievementsUnlocked.includes('badge_5_courses')) log.achievementsUnlocked.push('badge_5_courses');
      }
    } catch (_) { /* progress list unavailable — skip badge check */ }

    if ((user.xp || 0) >= 1500 && !achievements.includes('badge_top_learner')) {
      achievements.push('badge_top_learner');
      if (!log.achievementsUnlocked.includes('badge_top_learner')) log.achievementsUnlocked.push('badge_top_learner');
    }

    user.badges = achievements;
    user.longestStreak = Math.max(user.longestStreak || 0, user.streak || 0);
    await dbSaveUser(user);
  } catch (err) {
    console.warn('[logMonthlyActivity] Non-fatal error, skipping analytics update:', err.message);
  }
}

// Helper to award XP and level up — fault-tolerant
async function awardXP(userId, xpAmount) {
  try {
    const user = await dbGetUser(userId);
    if (!user) return null;

    user.xp = (user.xp || 0) + xpAmount;

    // simple level formula: level = floor(XP / 200) + 1
    const targetLevel = Math.floor(user.xp / 200) + 1;
    let leveledUp = false;
    if (targetLevel > (user.level || 1)) {
      user.level = targetLevel;
      leveledUp = true;
    }

    if (user.goals) {
      user.goals.completedToday = (user.goals.completedToday || 0) + xpAmount;
    }

    await dbSaveUser(user);
    await logMonthlyActivity(userId, xpAmount, 0, 0, null); // already fault-tolerant
    return { user, leveledUp };
  } catch (err) {
    console.warn('[awardXP] Non-fatal error, skipping XP update:', err.message);
    return null;
  }
}

// ----------------------------------------------------
// EXPRESS CONTROLLERS API
// ----------------------------------------------------

// Get all users (for login selection details)
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbGetUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific user details
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await dbGetUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticate user with email and password
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const users = await dbGetUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await dbMarkAttendance(user.id);
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user details
app.post('/api/users/:id/update', async (req, res) => {
  const { bio, interests, goals, avatar } = req.body;
  try {
    const user = await dbGetUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (bio !== undefined) user.bio = bio;
    if (interests !== undefined) user.interests = interests;
    if (goals !== undefined) user.goals = { ...user.goals, ...goals };
    if (avatar !== undefined) user.avatar = avatar;

    await dbSaveUser(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check/Update user streak — fully hardened, never returns 500 for analytics gaps
app.post('/api/users/:id/streak', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await dbGetUser(userId);
    if (!user) {
      // Unknown user — return a safe default so frontend never hangs
      return res.json({
        id: userId,
        streak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        xp: 0,
        level: 1,
        badges: [],
        monthlyActivity: {},
        certificates: []
      });
    }

    // Initialize any missing analytics fields with safe defaults
    user.streak = user.streak || 0;
    user.xp = user.xp || 0;
    user.level = user.level || 1;
    user.badges = Array.isArray(user.badges) ? user.badges : [];
    user.monthlyActivity = user.monthlyActivity || {};
    user.certificates = Array.isArray(user.certificates) ? user.certificates : [];
    user.longestStreak = user.longestStreak || user.streak || 0;
    user.totalLearningHours = user.totalLearningHours || 0;
    user.goals = user.goals || { daily: 50, weekly: 250, completedToday: 0 };
    user.goals.completedToday = user.goals.completedToday || 0;

    // Mark attendance — non-fatal
    try { await dbMarkAttendance(user.id); } catch (_) {}

    const today = new Date().toISOString().split('T')[0];
    if (user.lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      user.streak = user.lastActiveDate === yesterdayStr ? user.streak + 1 : 1;
      user.longestStreak = Math.max(user.longestStreak, user.streak);
      user.lastActiveDate = today;

      // Save — if analytics columns don't exist in Supabase schema, dbSaveUser
      // will automatically fall back to base columns only
      try { await dbSaveUser(user); } catch (saveErr) {
        console.warn('[streak] Save failed (non-fatal):', saveErr.message);
      }
    }

    // Return user without password
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (err) {
    console.error(`[streak] Unexpected error for user ${userId}:`, err.message);
    // Never block the frontend — return a minimal valid response
    res.json({
      id: userId,
      streak: 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
      xp: 0, level: 1, badges: [], monthlyActivity: {}, certificates: []
    });
  }
});

// Get all courses (handles searches and categories)
app.get('/api/courses', async (req, res) => {
  const { search, category } = req.query;
  try {
    const courses = await dbGetCourses();
    let filtered = courses;

    if (category && category !== 'All') {
      filtered = filtered.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) || 
        c.description.toLowerCase().includes(query) ||
        (c.modules && c.modules.some(m => m.title.toLowerCase().includes(query) || 
          (m.lessons && m.lessons.some(l => l.title.toLowerCase().includes(query) || l.content.toLowerCase().includes(query)))
        ))
      );
    }
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific course
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await dbGetCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new course
app.post('/api/courses', async (req, res) => {
  const { title, description, instructorId, instructorName, category, difficulty, duration, modules, quizzes, price } = req.body;
  const newCourse = {
    id: 'c_' + Date.now(),
    title,
    description,
    instructorId,
    instructorName,
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500',
    category,
    difficulty: difficulty || 'Beginner',
    duration: duration || '2 hours',
    price: price !== undefined ? parseFloat(price) : 0,
    xpReward: 150,
    modules: modules || [],
    quizzes: quizzes || []
  };

  try {
    await dbCreateCourse(newCourse);
    res.status(201).json(newCourse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add quiz to course
app.post('/api/courses/:id/quiz', async (req, res) => {
  const { lessonId, title, questions } = req.body;
  const quizId = 'q_' + Date.now();
  const newQuiz = {
    id: quizId,
    lessonId,
    title,
    questions: questions || []
  };

  try {
    const result = await dbSaveQuiz(req.params.id, newQuiz);
    if (!result) return res.status(404).json({ error: 'Course not found' });
    res.status(201).json(newQuiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete course (Admin Dashboard action)
app.post('/api/courses/:id/delete', async (req, res) => {
  try {
    const success = await dbDeleteCourse(req.params.id);
    if (!success) return res.status(404).json({ error: 'Course not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user progress details
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const list = await dbGetProgressList(req.params.userId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enroll user in a course
app.post('/api/progress/enroll', async (req, res) => {
  const { userId, courseId } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    let existing = progressList.find(p => p.courseId === courseId);
    if (existing) {
      return res.json(existing);
    }

    const course = await dbGetCourse(courseId);
    const isFree = course ? course.price === 0 : true;

    const newProgress = {
      userId,
      courseId,
      completedLessons: [],
      quizScores: {},
      bookmarks: [],
      completedAt: null,
      purchased: isFree
    };

    await dbSaveProgress(newProgress);
    if (course) {
      await dbAddNotification(userId, 'Course Enrolled!', `You enrolled in ${course.title}. Happy learning!`);
    }
    res.json(newProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase course
app.post('/api/progress/purchase', async (req, res) => {
  const { userId, courseId } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    let existing = progressList.find(p => p.courseId === courseId);

    if (existing) {
      existing.purchased = true;
    } else {
      existing = {
        userId,
        courseId,
        completedLessons: [],
        quizScores: {},
        bookmarks: [],
        completedAt: null,
        purchased: true
      };
    }

    await dbSaveProgress(existing);

    const course = await dbGetCourse(courseId);
    if (course) {
      await dbAddNotification(userId, 'Course Purchased!', `You unlocked ${course.title} for $${course.price}.`);
    }
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Centralized course completion checker (requires all lessons and quizzes to be finished)
async function checkAndCompleteCourse(userId, courseId, progress) {
  try {
    const course = await dbGetCourse(courseId);
    if (!course) return false;

    const allLessons = (course.modules || []).flatMap(m => (m.lessons || []).map(l => l.id));
    const completedLessons = Array.isArray(progress.completedLessons) ? progress.completedLessons : [];
    const hasFinishedAllLessons = allLessons.length > 0 && allLessons.every(lId => completedLessons.includes(lId));

    const allQuizzes = course.quizzes || [];
    const quizScores = progress.quizScores || {};
    const hasFinishedAllQuizzes = allQuizzes.every(q => quizScores[q.id] !== undefined);

    if (hasFinishedAllLessons && hasFinishedAllQuizzes && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();

      // Award Course Completion XP — non-fatal
      try { await awardXP(userId, course.xpReward || 150); } catch (_) {}
      try { await dbAddNotification(userId, 'Course Certificate Unlocked!', `Congratulations! You finished ${course.title} and earned a certificate.`); } catch (_) {}

      // Generate secure SHA-256 certificate ID
      const crypto = require('crypto');
      const hashInput = `${userId}-${courseId}-${progress.completedAt}`;
      const certId = 'CERT-' + crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 12).toUpperCase();

      // Save certificate to user profile — non-fatal
      try {
        const user = await dbGetUser(userId);
        if (user) {
          if (!Array.isArray(user.certificates)) user.certificates = [];
          if (!user.certificates.some(c => c.courseId === courseId)) {
            user.certificates.push({
              id: certId,
              courseId,
              courseTitle: course.title,
              completedAt: progress.completedAt
            });
            await dbSaveUser(user);
          }
        }
      } catch (certErr) {
        console.warn('[checkAndCompleteCourse] Certificate save failed (non-fatal):', certErr.message);
      }

      // Log monthly activity — already fault-tolerant
      await logMonthlyActivity(userId, 0, 0, 1, 'badge_first_course');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[checkAndCompleteCourse] Non-fatal error, skipping completion check:', err.message);
    return false;
  }
}

// Mark lesson complete
app.post('/api/progress/complete-lesson', async (req, res) => {
  const { userId, courseId, lessonId } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    const progress = progressList.find(p => p.courseId === courseId);
    if (!progress) return res.status(404).json({ error: 'Enrollment record not found' });

    if (!progress.completedLessons) progress.completedLessons = [];
    
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);

      // Award 15 XP
      const xpResult = await awardXP(userId, 15);
      
      // Update monthly log for lessons count
      await logMonthlyActivity(userId, 0, 1, 0, null);

      // Check course completion
      const isComplete = await checkAndCompleteCourse(userId, courseId, progress);

      await dbSaveProgress(progress);
      res.json({
        progress,
        xpEarned: 15,
        courseCompleted: isComplete,
        leveledUp: xpResult ? xpResult.leveledUp : false,
        user: xpResult ? xpResult.user : null
      });
    } else {
      res.json({ progress, xpEarned: 0, courseCompleted: false, leveledUp: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Quiz Score
app.post('/api/progress/quiz', async (req, res) => {
  const { userId, courseId, quizId, score } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    const progress = progressList.find(p => p.courseId === courseId);
    if (!progress) return res.status(404).json({ error: 'Enrollment record not found' });

    if (!progress.quizScores) progress.quizScores = {};
    const oldScore = progress.quizScores[quizId] || 0;
    progress.quizScores[quizId] = Math.max(oldScore, score);

    let xpAwarded = 0;
    let notificationMessage = `You scored ${score}% on the quiz.`;
    
    if (score > oldScore) {
      const improvement = score - oldScore;
      xpAwarded = Math.floor(improvement * 0.5);
      if (score === 100) {
        xpAwarded += 20;
        notificationMessage += " Perfect score bonus (+20 XP)!";
      }
    }

    let xpResult = null;
    if (xpAwarded > 0) {
      xpResult = await awardXP(userId, xpAwarded);
    }

    // Check course completion (since quizzes are required)
    const isComplete = await checkAndCompleteCourse(userId, courseId, progress);

    await dbSaveProgress(progress);
    await dbAddNotification(userId, 'Quiz Finished!', notificationMessage);

    res.json({
      progress,
      xpEarned: xpAwarded,
      courseCompleted: isComplete,
      leveledUp: xpResult ? xpResult.leveledUp : false,
      user: xpResult ? xpResult.user : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save video playhead resume timestamp state
app.post('/api/progress/save-timestamp', async (req, res) => {
  const { userId, courseId, moduleId, lessonId, timestamp } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    const progress = progressList.find(p => p.courseId === courseId);
    if (!progress) return res.status(404).json({ error: 'Enrollment record not found' });

    progress.lastActiveLesson = {
      moduleId,
      lessonId,
      timestamp
    };

    await dbSaveProgress(progress);
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Certificate details for verification page by unique certificate ID
app.get('/api/progress/certificate/verify/:id', async (req, res) => {
  const certId = req.params.id;
  try {
    const users = await dbGetUsers();
    let foundCert = null;
    let foundUser = null;

    for (const u of users) {
      if (u.certificates) {
        const c = u.certificates.find(item => item.id.toUpperCase() === certId.toUpperCase());
        if (c) {
          foundCert = c;
          foundUser = u;
          break;
        }
      }
    }

    if (!foundCert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      certificate: foundCert,
      studentName: foundUser.username,
      studentEmail: foundUser.email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookmark notes manager
app.post('/api/progress/bookmark', async (req, res) => {
  const { userId, courseId, lessonId, notes, active } = req.body;
  try {
    const progressList = await dbGetProgressList(userId);
    const progress = progressList.find(p => p.courseId === courseId);
    if (!progress) return res.status(404).json({ error: 'Enrollment record not found' });

    if (!progress.bookmarks) progress.bookmarks = [];
    const bIdx = progress.bookmarks.findIndex(b => b.lessonId === lessonId);

    if (active) {
      if (bIdx !== -1) {
        progress.bookmarks[bIdx].notes = notes || '';
        progress.bookmarks[bIdx].bookmarkedAt = new Date().toISOString();
      } else {
        progress.bookmarks.push({
          lessonId,
          notes: notes || '',
          bookmarkedAt: new Date().toISOString()
        });
      }
    } else {
      if (bIdx !== -1) {
        progress.bookmarks.splice(bIdx, 1);
      }
    }

    await dbSaveProgress(progress);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user bookmarks
app.get('/api/progress/bookmarks/:userId', async (req, res) => {
  try {
    const progressList = await dbGetProgressList(req.params.userId);
    const courses = await dbGetCourses();

    const bookmarkList = [];
    for (const prog of progressList) {
      if (!prog.bookmarks) continue;
      const course = courses.find(c => c.id === prog.courseId);
      if (!course) continue;

      for (const bookmark of prog.bookmarks) {
        let lessonTitle = 'Unknown Lesson';
        let moduleTitle = 'Unknown Module';
        
        if (course.modules) {
          for (const m of course.modules) {
            const lesson = m.lessons ? m.lessons.find(l => l.id === bookmark.lessonId) : null;
            if (lesson) {
              lessonTitle = lesson.title;
              moduleTitle = m.title;
              break;
            }
          }
        }

        bookmarkList.push({
          courseId: course.id,
          courseTitle: course.title,
          moduleTitle,
          lessonId: bookmark.lessonId,
          lessonTitle,
          notes: bookmark.notes,
          bookmarkedAt: bookmark.bookmarkedAt
        });
      }
    }
    res.json(bookmarkList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get comments
app.get('/api/comments/:lessonId', async (req, res) => {
  try {
    const list = await dbGetComments(req.params.lessonId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post comment
app.post('/api/comments', async (req, res) => {
  const { lessonId, userId, commentText } = req.body;
  try {
    const user = await dbGetUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newComment = {
      id: 'com_' + Date.now(),
      lessonId,
      userId,
      userName: user.username,
      userAvatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
      commentText,
      createdAt: new Date().toISOString()
    };

    await dbCreateComment(newComment);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const list = await dbGetNotifications(req.params.userId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notifications read
app.post('/api/notifications/read', async (req, res) => {
  const { userId } = req.body;
  try {
    await dbMarkNotificationsRead(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get instructor/admin statistics analytics
app.get('/api/instructor/analytics', async (req, res) => {
  try {
    const courses = await dbGetCourses();
    const users = await dbGetUsers();
    
    // Fetch progress for all student enrollments
    let progressList = [];
    const students = users.filter(u => u.role === 'student');
    for (const stud of students) {
      const studentProgress = await dbGetProgressList(stud.id);
      progressList = progressList.concat(studentProgress);
    }

    const courseStats = courses.map(course => {
      const enrollments = progressList.filter(p => p.courseId === course.id);
      const numEnrolled = enrollments.length;
      const totalLessons = course.modules ? course.modules.flatMap(m => m.lessons ? m.lessons.map(l => l.id) : []).length : 0;
      
      let totalProgress = 0;
      let completions = 0;
      let sumQuizScores = 0;
      let quizCount = 0;

      enrollments.forEach(enr => {
        const completedCount = enr.completedLessons ? enr.completedLessons.length : 0;
        const progressPercent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
        totalProgress += progressPercent;
        if (enr.completedAt || progressPercent === 100) completions++;
        
        if (enr.quizScores) {
          const scores = Object.values(enr.quizScores);
          scores.forEach(s => {
            sumQuizScores += s;
            quizCount++;
          });
        }
      });

      return {
        courseId: course.id,
        title: course.title,
        enrolled: numEnrolled,
        avgProgress: numEnrolled > 0 ? Math.round(totalProgress / numEnrolled) : 0,
        completionRate: numEnrolled > 0 ? Math.round((completions / numEnrolled) * 100) : 0,
        avgQuizScore: quizCount > 0 ? Math.round(sumQuizScores / quizCount) : 0
      };
    });

    res.json({
      totalStudents: students.length,
      activeCourses: courses.length,
      courseStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance routes
app.post('/api/users/:id/attendance', async (req, res) => {
  try {
    await dbMarkAttendance(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/attendance', async (req, res) => {
  try {
    const list = await dbGetAttendance();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Add Student Route
app.post('/api/admin/students', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const newStudent = {
    id: 'u_' + Date.now(),
    username,
    email,
    password,
    role: 'student',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
    bio: 'New student account created by admin.',
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    interests: [],
    badges: [],
    goals: { daily: 50, weekly: 250, completedToday: 0 }
  };

  try {
    await dbSaveUser(newStudent);
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate Instructor Route
app.post('/api/instructors/:id/rate', async (req, res) => {
  const { rating, raterId } = req.body;
  const instructorId = req.params.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const instructor = await dbGetUser(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    const currentRating = parseFloat(instructor.rating || 0);
    const currentCount = parseInt(instructor.ratingCount || 0);

    const newCount = currentCount + 1;
    const newRating = parseFloat((((currentRating * currentCount) + rating) / newCount).toFixed(2));

    instructor.rating = newRating;
    instructor.ratingCount = newCount;

    await dbSaveUser(instructor);

    // Notify instructor
    await dbAddNotification(
      instructorId,
      'New Student Rating!',
      `A student rated you ${rating} stars. Your average rating is now ${newRating} (${newCount} ratings).`
    );

    res.json({ rating: newRating, ratingCount: newCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
