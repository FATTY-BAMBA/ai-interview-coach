#!/bin/bash

LIVEKIT_URL="wss://ai-interview-coach-f19dz5as.livekit.cloud"
LIVEKIT_API_KEY="APIpxkNWL92cjTy"
LIVEKIT_API_SECRET="k6bfI3IDFogG8q6H5fjeyrMDPvxLfoKAscFK9HBejiVH"
AGENT_NAME="BilingualInterviewCoach"

# Create dispatch rule using LiveKit API
curl -X POST "${LIVEKIT_URL/wss/https}/twirp/livekit.AgentDispatchService/CreateDispatch" \
  -H "Content-Type: application/json" \
  -u "${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}" \
  -d "{
    \"agent_name\": \"${AGENT_NAME}\",
    \"room\": \"interview-*\"
  }"

echo "Dispatch rule created!"
