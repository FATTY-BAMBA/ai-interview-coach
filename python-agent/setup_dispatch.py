import asyncio
from livekit import api

async def create_dispatch():
    livekit_url = "wss://ai-interview-coach-f19dz5as.livekit.cloud"
    api_key = "APIpxkNWL92cjTy"
    api_secret = "k6bfI3IDFogG8q6H5fjeyrMDPvxLfoKAscFK9HBejiVH"
    
    # Create dispatch service client
    dispatch_service = api.AgentDispatchServiceClient(
        livekit_url.replace("wss://", "https://"),
        api_key,
        api_secret
    )
    
    try:
        # Create dispatch rule
        dispatch = await dispatch_service.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="BilingualInterviewCoach",
                room="interview-*"
            )
        )
        print(f"✅ Dispatch rule created: {dispatch}")
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(create_dispatch())
