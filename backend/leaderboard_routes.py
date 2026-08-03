from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

leaderboard_router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

class ScoreSubmission(BaseModel):
    username: str
    score: int

class LeaderboardEntry(BaseModel):
    username: str
    score: int
    timestamp: str

class UserStats(BaseModel):
    username: str
    high_score: int
    games_played: int
    rank: Optional[int] = None

async def get_db():
    from server import db
    return db

@leaderboard_router.post("/score")
async def submit_score(submission: ScoreSubmission):
    db = await get_db()

    username = submission.username.strip().lower()

    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Invalid username")

    if submission.score < 0:
        raise HTTPException(status_code=400, detail="Invalid score")

    existing = await db.scores.find_one({"username": username})

    if existing:
        if submission.score > existing["score"]:
            await db.scores.insert_one({
    "username": username,
    "score": submission.score,
    "games_played": 1,
    "timestamp": datetime.now(timezone.utc)
    })  
    else:
        await db.scores.insert_one({
            "username": username,
            "score": submission.score,
            "games_played": 1,
            "timestamp": datetime.now(timezone.utc)
        })

    return {
        "message": "Score submitted successfully",
        "score": submission.score
    }

@leaderboard_router.get("/top", response_model=List[LeaderboardEntry])
async def get_top_scores(limit: int = 50):
    """Get top scores from the leaderboard"""
    db = await get_db()
    
    # Get top scores sorted by score descending
    scores = await db.scores.find(
        {},
        {"_id": 0, "username": 1, "score": 1, "timestamp": 1}
    ).sort("score", -1).limit(limit).to_list(limit)
    
    # Convert timestamps to ISO format strings
    for score in scores:
        if isinstance(score.get("timestamp"), datetime):
            score["timestamp"] = score["timestamp"].isoformat()
    
    return scores

@leaderboard_router.get("/user/{username}", response_model=UserStats)
async def get_user_stats(username: str):
    db = await get_db()

    username = username.strip().lower()

    user = await db.scores.find_one({"username": username})

    if not user:
        return UserStats(
            username=username,
            high_score=0,
            games_played=0,
            rank=None
        )

    high_score = user["score"]
    games_played = user.get("games_played", 1)

    # Tüm kullanıcıları en yüksek skorlarına göre sırala
    pipeline = [
        {
            "$group": {
                "_id": "$username",
                "best_score": {"$max": "$score"}
            }
        },
        {
            "$sort": {
                "best_score": -1
            }
        }
    ]

    all_best_scores = await db.scores.aggregate(pipeline).to_list(10000)

    rank = None
    for idx, entry in enumerate(all_best_scores):
        if entry["_id"] == username:
            rank = idx + 1
            break

    return UserStats(
        username=username,
        high_score=high_score,
        games_played=games_played,
        rank=rank
    )

@leaderboard_router.get("/stats")
async def get_global_stats():
    """Get global leaderboard statistics"""
    db = await get_db()
    
    # Count total scores and unique players
    total_scores = await db.scores.count_documents({})
    unique_players = len(await db.scores.distinct("username"))
    
    # Get highest score
    highest_score_entry = await db.scores.find_one(
        {},
        sort=[("score", -1)]
    )
    
    highest_score = highest_score_entry["score"] if highest_score_entry else 0
    
    return {
        "total_games": total_scores,
        "unique_players": unique_players,
        "highest_score": highest_score
    }
