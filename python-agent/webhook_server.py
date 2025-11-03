from flask import Flask, request, jsonify
import logging
import os
import threading
import asyncio
from livekit import rtc, api
from livekit.agents import JobContext, WorkerOptions, cli
from agent import entrypoint

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

active_rooms = {}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "active_rooms": len(active_rooms)}), 200

@app.route('/join-room', methods=['POST'])
def join_room():
    """Webhook endpoint to make agent join a specific room"""
    try:
        data = request.json
        room_name = data.get('room_name')
        
        if not room_name:
            return jsonify({"error": "room_name required"}), 400
        
        log.info(f"📞 Received request to join room: {room_name}")
        
        # Start agent in background thread
        thread = threading.Thread(target=start_agent_sync, args=(room_name,))
        thread.daemon = True
        thread.start()
        
        return jsonify({"success": True, "room": room_name}), 200
    
    except Exception as e:
        log.error(f"Error in join_room: {e}")
        return jsonify({"error": str(e)}), 500

def start_agent_sync(room_name: str):
    """Wrapper to run async agent in sync context"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(join_room_async(room_name))
    except Exception as e:
        log.error(f"Error in agent thread: {e}")

async def join_room_async(room_name: str):
    """Make the agent join a specific room"""
    try:
        livekit_url = os.getenv('LIVEKIT_URL', 'wss://ai-interview-coach-f19dz5as.livekit.cloud')
        api_key = os.getenv('LIVEKIT_API_KEY')
        api_secret = os.getenv('LIVEKIT_API_SECRET')
        
        log.info(f"🔑 Generating token for room: {room_name}")
        
        # Generate token for agent
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(f"agent-{room_name}") \
            .with_name("AI Interviewer") \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )).to_jwt()
        
        log.info(f"✅ Token generated, connecting to room: {room_name}")
        
        # Connect to room
        room = rtc.Room()
        
        # Create proper JobContext
        class WebhookJobContext:
            def __init__(self, room_obj):
                self.room = room_obj
                self._room_obj = room_obj
            
            async def connect(self, *args, **kwargs):
                # Room is already connected, this is a no-op
                log.info("JobContext.connect() called (no-op, already connected)")
                pass
        
        await room.connect(livekit_url, token)
        
        log.info(f"🎉 Agent connected to room: {room_name}")
        active_rooms[room_name] = room
        
        ctx = WebhookJobContext(room)
        
        # Run the agent
        await entrypoint(ctx)
        
    except Exception as e:
        log.error(f"❌ Error joining room {room_name}: {e}", exc_info=True)
    finally:
        if room_name in active_rooms:
            del active_rooms[room_name]

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    log.info(f"🚀 Starting webhook server on 0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, threaded=True)
