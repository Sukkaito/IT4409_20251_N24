/**
 * Script để đảm bảo tất cả indexes được tạo trong database
 * Chạy script này một lần sau khi cập nhật schema
 * 
 * Usage: node scripts/ensureIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ensureIndexes = async () => {
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

    console.log('✅ Connected to MongoDB');
    console.log('🔄 Creating indexes...');

    // Mongoose sẽ tự động tạo tất cả indexes từ schema
    // Nhưng chúng ta có thể force tạo lại để đảm bảo
    await User.createIndexes();
    
    console.log('✅ All indexes created successfully!');
    console.log('\n📋 Indexes created:');
    console.log('   - provider + providerId (unique compound)');
    console.log('   - email');
    console.log('   - provider + name (unique, partial filter for local)');
    
    // List all indexes
    const indexes = await User.collection.getIndexes();
    console.log('\n📊 Current indexes:');
    console.log(JSON.stringify(indexes, null, 2));
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

ensureIndexes();

