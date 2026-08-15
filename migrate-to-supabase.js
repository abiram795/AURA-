const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: SUPABASE_URL and SUPABASE_KEY are not configured in your .env file.');
  console.error('Please configure them first, then run this migration script.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const USERS_FILE = path.join(__dirname, 'server', 'data', 'users.json');
const COURSES_FILE = path.join(__dirname, 'server', 'data', 'courses.json');
const PROGRESS_FILE = path.join(__dirname, 'server', 'data', 'progress.json');
const COMMENTS_FILE = path.join(__dirname, 'server', 'data', 'comments.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'server', 'data', 'notifications.json');

const readJSON = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return [];
};

async function migrate() {
  console.log('🔄 Connecting to Supabase and starting database seeding...');

  // 1. Migrate Users
  const users = readJSON(USERS_FILE);
  if (users.length > 0) {
    console.log(`👤 Seeding ${users.length} user accounts...`);
    const mappedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email || `${u.username.toLowerCase().replace(/\s+/g, '')}@auraai.com`,
      password: u.password || 'password123',
      role: u.role || 'student',
      avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
      bio: u.bio || '',
      xp: u.xp || 0,
      level: u.level || 1,
      streak: u.streak || 0,
      last_active_date: u.lastActiveDate || new Date().toISOString().split('T')[0],
      interests: u.interests || [],
      badges: u.badges || [],
      goals: u.goals || {}
    }));

    const { error: err } = await supabase.from('users').upsert(mappedUsers);
    if (err) console.error('❌ Error seeding users:', err.message);
    else console.log('✅ Users seeded successfully.');
  }

  // 2. Migrate Courses
  const courses = readJSON(COURSES_FILE);
  if (courses.length > 0) {
    console.log(`📚 Seeding ${courses.length} courses...`);
    const mappedCourses = courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      instructor_id: c.instructorId,
      instructor_name: c.instructorName,
      image: c.image || '',
      category: c.category || 'General',
      difficulty: c.difficulty || 'Beginner',
      duration: c.duration || '2 hours',
      price: c.price || 0.00,
      xp_reward: c.xpReward || 100,
      modules: c.modules || [],
      quizzes: c.quizzes || []
    }));

    const { error: err } = await supabase.from('courses').upsert(mappedCourses);
    if (err) console.error('❌ Error seeding courses:', err.message);
    else console.log('✅ Courses seeded successfully.');
  }

  // 3. Migrate Progress
  const progress = readJSON(PROGRESS_FILE);
  if (progress.length > 0) {
    console.log(`📈 Seeding ${progress.length} enrollment progress records...`);
    const mappedProgress = progress.map(p => ({
      user_id: p.userId,
      course_id: p.courseId,
      completed_lessons: p.completedLessons || [],
      quiz_scores: p.quizScores || {},
      bookmarks: p.bookmarks || [],
      completed_at: p.completedAt ? new Date(p.completedAt).toISOString() : null,
      purchased: p.purchased !== undefined ? p.purchased : false
    }));

    const { error: err } = await supabase.from('progress').upsert(mappedProgress, { onConflict: 'user_id,course_id' });
    if (err) console.error('❌ Error seeding progress:', err.message);
    else console.log('✅ Progress records seeded successfully.');
  }

  // 4. Migrate Comments
  const comments = readJSON(COMMENTS_FILE);
  if (comments.length > 0) {
    console.log(`💬 Seeding ${comments.length} discussion comments...`);
    const mappedComments = comments.map(c => ({
      lesson_id: c.lessonId,
      user_id: c.userId,
      username: c.userName || c.username || 'Guest',
      avatar: c.userAvatar || c.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      text: c.commentText || c.text || '',
      timestamp: c.createdAt || c.timestamp ? new Date(c.createdAt || c.timestamp).toISOString() : new Date().toISOString()
    }));

    const { error: err } = await supabase.from('comments').insert(mappedComments);
    if (err) console.error('❌ Error seeding comments:', err.message);
    else console.log('✅ Comments seeded successfully.');
  }

  // 5. Migrate Notifications
  const notifications = readJSON(NOTIFICATIONS_FILE);
  if (notifications.length > 0) {
    console.log(`🔔 Seeding ${notifications.length} system notifications...`);
    const mappedNotifications = notifications.map(n => ({
      user_id: n.userId,
      title: n.title,
      message: n.message,
      read: n.read || false,
      timestamp: n.timestamp ? new Date(n.timestamp).toISOString() : new Date().toISOString()
    }));

    const { error: err } = await supabase.from('notifications').insert(mappedNotifications);
    if (err) console.error('❌ Error seeding notifications:', err.message);
    else console.log('✅ Notifications seeded successfully.');
  }

  console.log('\n🎉 Seeding migration process completed!\n');
}

migrate();
