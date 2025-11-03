# Add this after the fetch_interview_type function (around line 280)

async def fetch_session_by_room(room_name: str) -> tuple[str, str]:
    """Fetch session ID and interview type from database using room name"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # URL encode the room name
            r = await client.get(
                f"{API_URL}/api/interview/by-room/{room_name}",
                headers=({"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {})
            )
            if r.status_code == 200:
                data = r.json()
                session_id = data.get("session", {}).get("id")
                interview_type = data.get("session", {}).get("interviewType", "behavioral")
                logging.getLogger("agent").info(f"✅ Found session: {session_id}, type: {interview_type}")
                return session_id, interview_type
    except Exception as e:
        logging.getLogger("agent").warning(f"Failed to fetch session by room: {e}")
    
    # Fallback
    return str(uuid.uuid4()), "behavioral"
