/**
 * Script để liệt kê tất cả users đã đăng ký
 * 
 * Usage: node scripts/listUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const listUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/game-db';
    console.log('🔄 Connecting to MongoDB...');
    
    const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb.net');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      ...(isAtlas && {
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false
      })
    });

    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).sort({ createdAt: -1 });
    
    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('='.repeat(80));
    
    if (users.length === 0) {
      console.log('No users found.');
    } else {
      // Group by provider
      const byProvider = {};
      users.forEach(user => {
        if (!byProvider[user.provider]) {
          byProvider[user.provider] = [];
        }
        byProvider[user.provider].push(user);
      });

      console.log('\n📋 Users by Provider:');
      Object.keys(byProvider).forEach(provider => {
        console.log(`\n  ${provider.toUpperCase()}: ${byProvider[provider].length} users`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('\n📝 All Users:\n');

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Provider: ${user.provider}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log(`   Last Login: ${user.lastLoginAt.toLocaleString()}`);
        console.log(`   Stats: ${user.stats.gamesPlayed} games, ${user.stats.gamesWon} wins`);
        if (user.provider === 'local') {
          console.log(`   Has Password: Yes`);
        }
        console.log('');
      });

      // Summary
      console.log('='.repeat(80));
      console.log('\n📈 Summary:');
      console.log(`   Total Users: ${users.length}`);
      console.log(`   Local Users: ${byProvider.local?.length || 0}`);
      console.log(`   Google Users: ${byProvider.google?.length || 0}`);
      console.log(`   Guest Users: ${byProvider.guest?.length || 0}`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

listUsers();

