const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

// Initialize S3 client correctly
const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  }
});

const PROJECT_ID = process.env.PROJECT_ID;

async function init(){
  console.log('Executing script.js');
  const outDirPath = path.join(__dirname, 'output');

  const p = exec(`cd ${outDirPath} && npm install --legacy-peer-deps && npm run build`);

  p.stdout.on('data', function (data) {
    console.log(data.toString());
  });

  p.stderr.on('data', function (data) {
    console.error(data.toString());
  });

  p.on('close', async function () {
  console.log('Build process exited');

  // Try build → dist fallback
  let buildFolderPath = path.join(__dirname, 'output', 'build');

  if (!fs.existsSync(buildFolderPath)) {
    console.log("No 'build' folder found, checking 'dist'...");
    buildFolderPath = path.join(__dirname, 'output', 'dist');
  }

  if (!fs.existsSync(buildFolderPath)) {
    console.error("Neither 'build' nor 'dist' folder found.");
    process.exit(1);
  }

  const buildFolderContents = fs.readdirSync(buildFolderPath, { recursive: true });

  for (const file of buildFolderContents) {
    const filePath = path.join(buildFolderPath, file);
    if (fs.lstatSync(filePath).isDirectory()) continue;

    console.log("Uploading", filePath);
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `__outputs/${PROJECT_ID}/${file}`,
      Body: fs.createReadStream(filePath),
      ContentType: mime.lookup(filePath) || 'application/octet-stream',
    });

    await s3.send(command);
    console.log("Uploaded", filePath);
  }

  console.log("Deployment completed");
});

}
init();
