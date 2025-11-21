const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // OAuth provider info
  provider: {
    type: String,
    required: true,
    enum: ['google', 'facebook', 'discord', 'guest', 'local']
  },
  providerId: {
    type: String,
    required: true
  },
  // Password for local authentication
  password: {
    type: String,
    default: null,
    select: false // Don't include password in queries by default
  },
  
  // User info
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  email: {
    type: String,
    default: null,
    required: false // Will be required for local users in validation
  },
  nickname: {
    type: String,
    default: null,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Game statistics
  stats: {
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    },
    favoriteElement: {
      type: String,
      enum: ['dog', 'duck', 'penguin', 'whale', null],
      default: null
    }
  },
  
  // Account info
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound unique index: one user per provider + providerId combination
userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

// Index for email (if provided)
userSchema.index({ email: 1 });

// Index for username (local provider)
userSchema.index({ provider: 1, name: 1 }, { 
  unique: true, 
  partialFilterExpression: { provider: 'local' } 
});

// Virtual for win rate
userSchema.virtual('winRate').get(function() {
  if (this.stats.gamesPlayed === 0) return 0;
  return ((this.stats.gamesWon / this.stats.gamesPlayed) * 100).toFixed(2);
});

// Method to update stats
userSchema.methods.updateStats = function(gameResult) {
  this.stats.gamesPlayed += 1;
  if (gameResult.won) {
    this.stats.gamesWon += 1;
  }
  if (gameResult.score) {
    this.stats.totalScore += gameResult.score;
  }
  if (gameResult.element) {
    this.stats.favoriteElement = gameResult.element;
  }
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find or create user
userSchema.statics.findOrCreate = async function(provider, providerId, userData) {
  let user = await this.findOne({ provider, providerId });
  
  if (!user) {
    // Create new user
    user = await this.create({
      provider,
      providerId,
      name: userData.name,
      email: userData.email || null,
      avatar: userData.avatar || null,
      lastLoginAt: new Date()
    });
  } else {
    // Update existing user info
    user.name = userData.name || user.name;
    user.avatar = userData.avatar || user.avatar;
    if (userData.email && !user.email) {
      user.email = userData.email;
    }
    user.lastLoginAt = new Date();
    await user.save();
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);

