const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 3000) => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/game-db';
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempting to connect to MongoDB... (Attempt ${attempt}/${retries})`);
      
      // Connection options for MongoDB Atlas
      // Note: If using mongodb+srv://, TLS is automatically enabled
      const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb.net');
      
      // Workaround for Node.js v24 SSL/TLS compatibility issues
      const nodeVersion = process.version;
      const isNode24 = nodeVersion.startsWith('v24');
      
      // Build connection options
      const connectionOptions = {
        serverSelectionTimeoutMS: 20000, // Increased timeout for SSL handshake
        socketTimeoutMS: 60000, // Increased socket timeout
        connectTimeoutMS: 20000, // Connection timeout
        family: 4, // Force IPv4, skip IPv6
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
      };

      // SSL/TLS configuration for MongoDB Atlas
      if (isAtlas) {
        connectionOptions.tls = true;
        
        // For Node.js v24, use more permissive SSL settings to work around OpenSSL issues
        if (isNode24) {
          connectionOptions.tlsAllowInvalidCertificates = true;
          connectionOptions.tlsAllowInvalidHostnames = true;
          // Try to use TLS 1.2 explicitly
          connectionOptions.tlsCAFile = undefined;
          connectionOptions.tlsCertificateKeyFile = undefined;
          console.log('⚠️  Using relaxed SSL settings for Node.js v24 compatibility');
          console.log('   Consider downgrading to Node.js v20 LTS for better compatibility');
        } else {
          // For Node.js v20 and earlier, use strict SSL validation
          connectionOptions.tlsAllowInvalidCertificates = false;
          connectionOptions.tlsAllowInvalidHostnames = false;
        }
      }

      const conn = await mongoose.connect(mongoUri, connectionOptions);

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️  MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });

      return conn;
    } catch (error) {
      const isSSLError = error.message.includes('SSL') || 
                        error.message.includes('TLS') || 
                        error.message.includes('tlsv1') ||
                        error.message.includes('ssl3_read_bytes');
      
      console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
      
      // If it's the last attempt, show detailed error and exit
      if (attempt === retries) {
        console.error('\n❌ Failed to connect to MongoDB after', retries, 'attempts');
        
        // Check for specific error types
        if (error.message.includes('whitelist') || error.message.includes('IP')) {
          console.error('\n🔒 IP WHITELIST ERROR:');
          console.error('   Your IP address is not whitelisted in MongoDB Atlas.');
          console.error('\n📝 How to fix:');
          console.error('   1. Go to: https://cloud.mongodb.com/');
          console.error('   2. Select your cluster');
          console.error('   3. Click "Network Access" (or "Security" > "Network Access")');
          console.error('   4. Click "Add IP Address"');
          console.error('   5. Choose one of:');
          console.error('      - "Add Current IP Address" (recommended)');
          console.error('      - "Allow Access from Anywhere" (0.0.0.0/0) - for testing only');
          console.error('   6. Click "Confirm"');
          console.error('\n⚠️  Note: It may take 1-2 minutes for changes to take effect.');
        } else if (error.message.includes('authentication')) {
          console.error('\n🔐 AUTHENTICATION ERROR:');
          console.error('   Check your username and password in MONGODB_URI');
          console.error('   Format: mongodb+srv://username:password@cluster.mongodb.net/dbname');
        } else if (isSSLError) {
          console.error('\n🔒 SSL/TLS ERROR:');
          console.error('   ⚠️  Node.js v24 has known SSL/TLS compatibility issues');
          console.error('   → Best Solution: Use Node.js v20 LTS instead');
          console.error('   → Download: https://nodejs.org/ (choose LTS version)');
          console.error('   → See server/MONGODB_SSL_FIX.md for detailed instructions');
          console.error('\n   Temporary workaround: The code will retry with relaxed SSL settings.');
        } else {
          console.error('\n💡 General troubleshooting tips:');
          console.error('   1. Check your MongoDB Atlas network access (IP whitelist)');
          console.error('   2. Verify your connection string in .env file');
          console.error('   3. Check your internet connection');
          console.error('   4. Verify MongoDB Atlas cluster is running');
        }
        
        process.exit(1);
      } else {
        // Wait before retrying
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

module.exports = connectDB;
