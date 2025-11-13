//Access Key id : 3a17c46eefcb4590b3f0654868f06a9c
//Secret Access Key : 306f73f45a7edd30b2bc25d68b9950113a752119a115d69d23573db9cda1fdeb
//endpoint for s3: https://22b26bea3c0ad1978d7d3c14c545dd43.r2.cloudflarestorage.com



const { exec }  = require('child_process');
const path = require('path');
const fs = require('fs');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');

const mime = require('mime-types');

const S3Client = new S3Client({
    region:'Asia-Pacific (APAC)',
    Credential:{
        accessKeyId:'process.env.ACCESS_KEY',
        secretAccessKey:'process.env.SECRET_KEY',
    }
})

const PROJECT_ID = process.env.PROJECT_ID;
async function init(){
    console.log('Executing script.js');
    const outDirPath = path.join(__dirname, 'output');

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data',function(data){
        console.log(data.toString());
    })

    p.stdout.on('error',function(data){
        console.error(data.toString());
    })

    p.on('close', async function(){
        console.log('Build process exited');
        const distFolderPath = path.join(__dirname, 'output', 'dist');
        const distFolderContents = fs.readdirSync(distFolderPath,{recursive:true});

        for( const filePath of distFolderContents ){
            if(fs.lstatSync(filePath).isDirectory())continue;

            console.log('uploading', filePath)
            const command = new PutObjectCommand({
                Bucket:'vercel-clone-project',
                Key:`__outputs/${PROJECT_ID}/${filePath}`,
Body:fs.createReadStream(filePath),
ContentType:mime.lookup(filePath)
            })

            await S3Client.send(command);
            console.log('Uploaded', filePath);
        }
        console.log('Deployment completed');
    })
}

init();