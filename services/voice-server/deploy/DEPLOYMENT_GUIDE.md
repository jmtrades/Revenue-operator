# Voice Synthesis Server Deployment Guide

This guide covers deploying the self-hosted voice synthesis server to production environments.

## Deployment Options

### 1. Fly.io (Recommended for most users)

Fly.io provides GPU instances with the easiest setup for real-time voice applications.

#### Prerequisites
- Fly.io account (https://fly.io)
- Fly CLI installed: `curl https://fly.io/install.sh | sh`

#### Deployment Steps

```bash
# Navigate to the voice-server directory
cd services/voice-server

# Login to Fly
flyctl auth login

# Create a new app (choose a unique name)
flyctl apps create voice-synthesis-server

# Build and deploy (uses fly.toml + Dockerfile.cpu in this directory)
flyctl deploy --remote-only

# Monitor logs
flyctl logs

# Get the public URL
flyctl info
```

#### GPU Options on Fly.io
- `gpu-a10-large` - 24GB VRAM, $3-4/hour, best for most use cases
- `gpu-a100-40gb` - 40GB VRAM, $7-8/hour, highest performance
- `cpu-4x` - No GPU, $0.20/hour, for development only

Set in `fly.toml`:
```toml
[vm]
machine = "gpu-a10-large"
```

#### Cost Estimation (Monthly)
- GPU A10 (1): ~$100-120/month
- Persistent storage (10GB): ~$5/month
- Outbound bandwidth: ~$20/month (varies)
- **Total: ~$130-150/month for production**

### 2. Render (Good for integrated deployments)

Render offers GPU hosting with integrated databases and easy environment management.

#### Prerequisites
- Render account (https://render.com)
- GitHub repo connected to Render

#### Deployment Steps

```bash
# Push code to GitHub
git push origin main

# Go to Render dashboard: https://dashboard.render.com
# Click "New Web Service"
# Connect your GitHub repo
# Select "services/voice-server" as root directory
# Deploy using render.yaml configuration
```

The `render.yaml` file will automatically configure:
- GPU instance (A40-Large by default)
- Auto-scaling (1-3 instances)
- Health checks
- Environment variables

#### Render GPU Options
- `a40-large` - 48GB VRAM, $2.70/hour, excellent for TTS/STT
- `a100-40gb` - 40GB VRAM, $3.24/hour, maximum performance
- `rtx-4090` - 24GB VRAM, $1.68/hour, gaming-class GPU

#### Cost Estimation (Monthly)
- GPU A40 (1): ~$160-200/month
- Database (if used): ~$15/month
- **Total: ~$175-220/month**

### 3. AWS (For large scale or existing AWS infrastructure)

Using AWS g4dn or g5 instances for maximum control.

#### Instance Types Recommended
- `g4dn.xlarge` - 1x T4 GPU (16GB VRAM), $0.526/hour
- `g4dn.2xlarge` - 1x T4 GPU (16GB VRAM) + more CPU, $0.752/hour
- `g5.xlarge` - 1x A10G GPU (24GB VRAM), $1.006/hour
- `g5.2xlarge` - 1x A10G GPU + more resources, $1.212/hour

#### Deployment with EC2

```bash
# Launch instance with NVIDIA GPU support
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Ubuntu 22.04 LTS (check region)
  --instance-type g4dn.xlarge \
  --key-name your-key-pair \
  --security-groups voice-server

# SSH into instance
ssh -i your-key.pem ubuntu@instance-ip

# Install Docker and NVIDIA Container Runtime
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install -y nvidia-docker2

# Clone repository and deploy
git clone <your-repo>
cd Revenue-operator-1/services/voice-server
docker-compose up -d

# Setup reverse proxy (nginx)
sudo apt-get install -y nginx
# Configure nginx to proxy :8100 to :443 with SSL
```

#### Deployment with ECS (Container Service)

```bash
# Create ECR repository
aws ecr create-repository --repository-name voice-synthesis-server

# Build and push image
docker build -t voice-synthesis-server:latest .
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin <your-account>.dkr.ecr.us-west-2.amazonaws.com
docker tag voice-synthesis-server:latest \
  <your-account>.dkr.ecr.us-west-2.amazonaws.com/voice-synthesis-server:latest
docker push <your-account>.dkr.ecr.us-west-2.amazonaws.com/voice-synthesis-server:latest

# Create ECS cluster and task definition
# Use g4dn instances with GPU support enabled
```

#### Cost Estimation (Monthly)
- g4dn.xlarge: ~$380/month compute
- Data transfer: ~$20-40/month
- EBS volume: ~$10/month
- **Total: ~$410-430/month**

### 4. Docker Compose (Local Development)

```bash
cd services/voice-server

# Build and run locally
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f voice-server

# Stop
docker-compose down
```

Requires:
- Docker & Docker Compose installed
- NVIDIA GPU + nvidia-docker for GPU support
- 16GB+ RAM recommended
- 20GB disk space for models

## Environment Configuration

### Required Environment Variables

```bash
# Server config
PORT=8100
HOST=0.0.0.0
LOG_LEVEL=info

# LLM endpoint (for conversational AI responses)
LLM_ENDPOINT=https://your-app.fly.dev/api/agent/respond

# Optional: Model cache directory
MODEL_CACHE_DIR=/app/.cache
```

### Optional Configuration

```bash
# TTS/STT model selection
# Default uses fishspeech + faster-whisper
TTS_MODEL=fishspeech-1.5
STT_MODEL=whisper-large

# Voice cloning
VOICE_CLONING_ENABLED=true

# Backchanneling
BACKCHANNEL_ENABLED=true
BACKCHANNEL_INTERVAL=2.0

# Audio processing
SAMPLE_RATE=16000
AUDIO_CHUNK_SIZE=4096
```

## Production Checklist

- [ ] GPU instance selected (minimum 16GB VRAM)
- [ ] HTTPS/SSL configured
- [ ] Health checks enabled and responding
- [ ] Log aggregation configured (Datadog, New Relic, etc.)
- [ ] Monitoring alerts set up
- [ ] Auto-scaling policies configured (if applicable)
- [ ] Database for session persistence (optional but recommended)
- [ ] Backup strategy for voice model cache
- [ ] Rate limiting configured
- [ ] CORS settings restricted
- [ ] Environment variables secured (no hardcoded secrets)

## Monitoring & Logging

### Fly.io Monitoring
```bash
# View logs
flyctl logs

# Get metrics
flyctl status
flyctl metrics

# SSH into running instance
flyctl ssh console
```

### CloudWatch (AWS)
```bash
# View logs
aws logs tail /aws/ecs/voice-synthesis-server --follow

# View metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average
```

## Cost Optimization

1. **Use CPU-only instances for development** ($0.20/hour)
2. **Implement session caching** to reduce model reloads
3. **Use Spot instances on AWS** for 70% cost savings
4. **Monitor GPU utilization** - scale down if <50%
5. **Pre-cache models** to avoid cold starts
6. **Implement request batching** for TTS/STT
7. **Use smaller models** (faster-whisper base vs. large)

## Troubleshooting

### Server not starting
```bash
# Check logs for Python errors
docker-compose logs voice-server

# Verify GPU is available
docker run --gpus all nvidia/cuda:12.1.1-runtime-ubuntu22.04 nvidia-smi

# Check port availability
lsof -i :8100
```

### Memory issues
```bash
# Check GPU memory usage
nvidia-smi

# Reduce batch size in environment
# Or increase instance size
```

### WebSocket connection failures
```bash
# Check if WebSocket is accessible
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8100/ws/conversation

# Verify HTTPS/WSS configuration
# Check firewall rules
```

### STT/TTS latency
- Increase `chunk_size_ms` for streaming TTS
- Pre-warm models on startup
- Use smaller model variants
- Ensure GPU utilization is not saturated

## Support & Resources

- Fly.io Documentation: https://fly.io/docs
- Render Documentation: https://render.com/docs
- AWS GPU Instances: https://aws.amazon.com/ec2/instance-types/#accelerated_computing
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment
- NVIDIA Container Guide: https://github.com/NVIDIA/nvidia-docker
