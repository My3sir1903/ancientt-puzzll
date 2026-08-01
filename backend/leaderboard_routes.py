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
    """Submit a score to the leaderboard"""
    db = await get_db()

    # Validate username
    username = submission.username.strip().lower()

    if not username or len(username) < 2:
        raise HTTPException(status_code=400, detail="Invalid username")

    if submission.score < 0:
        raise HTTPException(status_code=400, detail="Invalid score")

    # Check if this user already exists
    existing = await db.scores.find_one(
    {"username": username},
    sort=[("score", -1)]
)

    if existing:
        # Only update if the new score is higher
        if submission.score > existing["score"]:
            await db.scores.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "score": submission.score,
                        "timestamp": datetime.now(timezone.utc)
                    }
                }
            )
    else:
        # First score of this user
        await db.scores.insert_one({
            "username": username,
            "score": submission.score,
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
    """Get statistics for a specific user"""
    db = await get_db()
    
    # Get all scores for this user
    user_scores = await db.scores.find(
        {"username": username},
        {"_id": 0, "score": 1}
    ).to_list(1000)
    
    if not user_scores:
        return UserStats(
            username=username,
            high_score=0,
            games_played=0,
            rank=None
        )
    
    # Calculate stats
    high_score = max(score["score"] for score in user_scores)
    games_played = len(user_scores)
    
    # Calculate rank (how many unique users have a higher best score)
    # Get all users' best scores
    pipeline = [
        {"$group": {
            "_id": "$username",
            "best_score": {"$max": "$score"}
        }},
        {"$sort": {"best_score": -1}}
    ]
    
    all_best_scores = await db.scores.aggregate(pipeline).to_list(10000)
    
    # Find rank
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
