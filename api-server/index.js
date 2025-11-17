require('dotenv').config();   // <-- ADD THIS LINE

const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const {Server} = require ('socket.io');
const Redis = require('ioredis');


const PORT = 9000;
const app = express();

const subscriber = new Redis(process.env.REDIS_URL);

const io = new Server({ cors: '*'});

io.listen(9001,()=>{
  console.log('WebSocket Server running → http://localhost:9001');
})

io.on('connection',(socket)=>{
  socket.on('subscribe',channel =>{
    socket.join(channel);
    socket.emit('message',`Joined ${channel} channel`);
  })
})

const ecsClient = new ECSClient({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY
  }
});

const config = {
  CLUSTER: 'arn:aws:ecs:eu-north-1:138234892622:cluster/builder-cluster-vercel',
  TASK: 'arn:aws:ecs:eu-north-1:138234892622:task-definition/builder-task:2'
};

app.use(express.json());

app.post('/project', async (req, res) => {
  try {
    const { gitUrl } = req.body;

    if (!gitUrl) {
      return res.status(400).json({ error: "gitUrl is required" });
    }

    const projectSlug = generateSlug();

    const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: 'FARGATE',
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: [
            'subnet-09ffc4f3522de1d4f',
            'subnet-02d7cc2be4232d9f8',
            'subnet-06b52cc7c4e98cd15'
          ],
          securityGroups: ['sg-04da2c0c590cda604'],
          assignPublicIp: 'ENABLED'
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: 'builder-image',
            environment: [
        { name: 'GIT_REPOSITORY__URL', value: gitUrl },
        { name: 'PROJECT_ID', value: projectSlug },
        { name: 'ACCESS_KEY', value: process.env.ACCESS_KEY },
        { name: 'SECRET_KEY', value: process.env.SECRET_KEY },
        { name: 'BUCKET_NAME', value: 'vercel-object-storage' },
        { name: 'REDIS_URL', value: process.env.REDIS_URL }
            ]
          }
        ]
      }
    });

    await ecsClient.send(command);

    res.json({
      status: "queued",
      data: {
        projectId: projectSlug,
        url: `http://${projectSlug}.localhost:8000`
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

async function initRedisSubscriber() {
  console.log('Initializing Redis subscriber...');
subscriber.psubscribe('logs:*');
subscriber.on('pmessage', (pattern, channel, message) => {
  io.to(channel).emit('message', message);
})
}

initRedisSubscriber();

app.listen(PORT, () => {
  console.log(`API Server running → http://localhost:${PORT}`);
});
