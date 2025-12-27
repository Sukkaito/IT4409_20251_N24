const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const authRouter = express.Router();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'drawify-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production', // Trust proxy in production
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.API_DOMAIN || undefined
  }
};

// Passport serialization - lưu user ID thay vì toàn bộ object
passport.serializeUser((user, done) => {
  done(null, user._id); // Lưu MongoDB _id
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 
    `${process.env.SERVER_URL || 'http://localhost:8080'}/api/auth/google/callback`;
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackUrl
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userData = {
        name: profile.displayName || profile.name?.givenName || 'Google User',
        email: profile.emails?.[0]?.value,
        avatar: profile.photos?.[0]?.value
      };
      
      const user = await User.findOrCreate('google', profile.id, userData);
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Initialize passport (session is handled at app level in server.js)
authRouter.use(passport.initialize());
authRouter.use(passport.session());

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

authRouter.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
authRouter.use(express.json());
authRouter.use(express.urlencoded({ extended: true }));

// Auth routes
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    const user = req.user;
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}?provider=google&name=${encodeURIComponent(user.name)}&id=${user._id}`;
    res.redirect(redirectUrl);
  }
);

// Register route
authRouter.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', { body: { ...req.body, password: '***' } });
    const { username, nickname, email, password } = req.body;

    // Validation - All fields required
    if (!username || !nickname || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ error: 'Nickname must be between 2 and 20 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ 
      provider: 'local', 
      name: username 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // name = username (for login)
    // nickname = display name (for game)
    const user = await User.create({
      provider: 'local',
      providerId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: username, // Username for login
      nickname: nickname, // Display name
      email: email,
      password: hashedPassword,
      lastLoginAt: new Date()
    });
    
    // Update name to nickname for display (or we can add a separate nickname field)
    // For simplicity, we'll use username for login and can display nickname separately if needed

    // Log user in
    req.login(user, (err) => {
      if (err) {
        console.error('Login after registration error:', err);
        return res.status(500).json({ error: 'Failed to log in after registration' });
      }
      console.log('User registered and logged in:', user.name);
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          nickname: user.nickname || user.name,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error.message || 'Registration failed';
    res.status(500).json({ error: errorMessage });
  }
});

// Login route
authRouter.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username (local provider)
    const user = await User.findOne({ 
      provider: 'local', 
      name: username 
    }).select('+password'); // Include password field

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Log user in
    req.login(user, (err) => {
      if (err) {
        console.error('Login session error:', err);
        return res.status(500).json({ error: 'Failed to log in' });
      }
      console.log('User logged in:', user.name);
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          nickname: user.nickname || user.name,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.message || 'Login failed';
    res.status(500).json({ error: errorMessage });
  }
});

authRouter.get('/failure', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?auth_error=true`);
});

authRouter.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  });
});

// Get current user
authRouter.get('/user', async (req, res) => {
  if (req.user) {
    const user = await User.findById(req.user._id);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      stats: user.stats,
      createdAt: user.createdAt
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API để lấy thống kê user
authRouter.get('/user/stats', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await User.findById(req.user._id);
    res.json({
      gamesPlayed: user.stats.gamesPlayed,
      gamesWon: user.stats.gamesWon,
      totalScore: user.stats.totalScore,
      winRate: user.winRate,
      favoriteElement: user.stats.favoriteElement
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// API để cập nhật stats sau khi chơi game
authRouter.post('/user/stats/update', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await User.findById(req.user._id);
    await user.updateStats({
      won: req.body.won || false,
      score: req.body.score || 0,
      element: req.body.element || null
    });
    res.json({ success: true, stats: user.stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Leaderboard - top users by totalScore
authRouter.get('/leaderboard', async (req, res) => {
  try {
    // Only non-guest users have persistent stats
    const users = await User.find({ provider: { $ne: 'guest' } })
      .select('name nickname avatar stats createdAt provider')
      .sort({ 'stats.totalScore': -1 })
      .limit(50);

    res.json({
      success: true,
      leaderboard: users.map((u, index) => ({
        rank: index + 1,
        id: u._id,
        name: u.name,
        nickname: u.nickname || u.name,
        avatar: u.avatar,
        provider: u.provider,
        createdAt: u.createdAt,
        gamesPlayed: u.stats?.gamesPlayed || 0,
        gamesWon: u.stats?.gamesWon || 0,
        totalScore: u.stats?.totalScore || 0,
        winRate:
          u.stats?.gamesPlayed && u.stats.gamesPlayed > 0
            ? Number(((u.stats.gamesWon || 0) / u.stats.gamesPlayed) * 100).toFixed(2)
            : '0.00'
      }))
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Admin route to list all users (for development/testing)
// In production, add authentication/authorization check
authRouter.get('/admin/users', async (req, res) => {
  try {
    // TODO: Add admin authentication check in production
    // if (!req.user || !req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden' });
    // }

    const users = await User.find({})
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .limit(100); // Limit to 100 users

    const summary = {
      total: await User.countDocuments({}),
      byProvider: {
        local: await User.countDocuments({ provider: 'local' }),
        google: await User.countDocuments({ provider: 'google' }),
        guest: await User.countDocuments({ provider: 'guest' })
      }
    };

    res.json({
      success: true,
      summary,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: user.stats
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = authRouter;

