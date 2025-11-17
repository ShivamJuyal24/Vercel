const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Redis = require('ioredis');

// Initialize Redis publisher
const publisher = new Redis(process.env.REDIS_URL);

// Handle Redis connection events
publisher.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

publisher.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

publisher.on('ready', () => {
  console.log('✅ Redis is ready');
});

// Initialize S3 client
const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  }
});

const PROJECT_ID = process.env.PROJECT_ID;

// Fixed publishLog function
function publishLog(log) {
  const channel = `logs:${PROJECT_ID}`;
  const message = JSON.stringify({ log });
  
  console.log(`📤 Publishing to ${channel}: ${log}`);
  
  publisher.publish(channel, message, (err, numSubscribers) => {
    if (err) {
      console.error('❌ Failed to publish:', err);
    } else {
      console.log(`✅ Published to ${numSubscribers} subscriber(s)`);
    }
  });
}

async function init() {
  console.log('🚀 Executing script.js');
  
  // Wait for Redis to be ready before publishing
  try {
    await publisher.ping();
    console.log('✅ Redis PING successful');
  } catch (err) {
    console.error('❌ Redis PING failed:', err);
  }

  publishLog('🚀 Build started...');
  
  const outDirPath = path.join(__dirname, 'output');

  publishLog('📦 Installing dependencies...');
  
  const p = exec(`npm install --legacy-peer-deps && npm run build`, {
    cwd: outDirPath,
  });

  p.stdout.on('data', function (data) {
    const output = data.toString();
    console.log(output);
    publishLog(output);
  });

  p.stderr.on('data', function (data) {
    const output = data.toString();
    console.error(output);
    publishLog(`⚠️ ${output}`);
  });

  p.on('close', async function (code) {
    if (code !== 0) {
      console.error(`❌ Build process exited with code ${code}`);
      publishLog(`❌ Build failed with exit code ${code}`);
      await publisher.quit();
      process.exit(1);
    }

    console.log('✅ Build complete');
    publishLog('✅ Build completed. Starting deployment...');

    // Try build → dist fallback
    let buildFolderPath = path.join(__dirname, 'output', 'build');

    if (!fs.existsSync(buildFolderPath)) {
      console.log("No 'build' folder found, checking 'dist'...");
      publishLog("📂 No 'build' folder, using 'dist' folder");
      buildFolderPath = path.join(__dirname, 'output', 'dist');
    }

    if (!fs.existsSync(buildFolderPath)) {
      console.error("❌ Neither 'build' nor 'dist' folder found.");
      publishLog("❌ Deployment failed: No build output found");
      await publisher.quit();
      process.exit(1);
    }

    const buildFolderContents = fs.readdirSync(buildFolderPath, { recursive: true });
    
    publishLog(`📁 Found ${buildFolderContents.length} files to upload`);

    for (const file of buildFolderContents) {
      const filePath = path.join(buildFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("⬆️ Uploading", filePath);
      publishLog(`⬆️ Uploading: ${file}`);
      
      try {
        const command = new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: `__outputs/${PROJECT_ID}/${file}`,
          Body: fs.createReadStream(filePath),
          ContentType: mime.lookup(filePath) || 'application/octet-stream',
        });

        await s3.send(command);
        console.log("✅ Uploaded", filePath);
        publishLog(`✅ ${file}`);
      } catch (uploadErr) {
        console.error(`❌ Failed to upload ${file}:`, uploadErr);
        publishLog(`❌ Upload failed: ${file}`);
      }
    }

    console.log("🎉 Deployment completed");
    publishLog('🎉 Deployment completed successfully!');
    publishLog(`🌐 Visit: http://${PROJECT_ID}.localhost:8000`);
    
    // Close Redis connection gracefully
    await publisher.quit();
    console.log('✅ Redis connection closed');
    process.exit(0);
  });
}

init();