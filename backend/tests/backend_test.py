"""
Backend tests for Mythos Grid puzzle game.
Covers:
  - Health check
  - Leaderboard: score submission, top scores, user stats, global stats
  - Input validation for score submissions
  - Data persistence & rank calculations
"""

import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # Fall back to reading frontend/.env
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break

assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")

API = f"{BASE_URL}/api"

# Unique test prefix so we can find + clean up later
RUN_ID = uuid.uuid4().hex[:8]
TEST_PREFIX = f"TEST_{RUN_ID}_"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


# ---------------------- Health ----------------------

class TestHealth:
    def test_root_health(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"message": "Hello World"}


# ---------------------- Score submission validation ----------------------

class TestScoreValidation:
    def test_empty_username_returns_400(self, api_client):
        r = api_client.post(f"{API}/leaderboard/score", json={"username": "", "score": 10})
        assert r.status_code == 400, r.text
        assert "Invalid username" in r.json().get("detail", "")

    def test_whitespace_username_returns_400(self, api_client):
        r = api_client.post(f"{API}/leaderboard/score", json={"username": "  ", "score": 10})
        assert r.status_code == 400, r.text

    def test_username_less_than_2_chars_returns_400(self, api_client):
        r = api_client.post(f"{API}/leaderboard/score", json={"username": "a", "score": 10})
        assert r.status_code == 400, r.text
        assert "Invalid username" in r.json().get("detail", "")

    def test_negative_score_returns_400(self, api_client):
        r = api_client.post(
            f"{API}/leaderboard/score",
            json={"username": f"{TEST_PREFIX}user", "score": -5},
        )
        assert r.status_code == 400, r.text
        assert "Invalid score" in r.json().get("detail", "")

    def test_missing_fields_returns_422(self, api_client):
        r = api_client.post(f"{API}/leaderboard/score", json={"username": f"{TEST_PREFIX}x"})
        assert r.status_code == 422, r.text

    def test_zero_score_is_valid(self, api_client):
        # zero should be acceptable (>=0)
        r = api_client.post(
            f"{API}/leaderboard/score",
            json={"username": f"{TEST_PREFIX}zero", "score": 0},
        )
        assert r.status_code == 200, r.text


# ---------------------- Score submission + persistence ----------------------

class TestScoreSubmissionPersistence:
    def test_submit_score_success(self, api_client):
        username = f"{TEST_PREFIX}alice"
        r = api_client.post(
            f"{API}/leaderboard/score", json={"username": username, "score": 250}
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("score") == 250
        assert "message" in data

        # Verify persistence via user stats
        time.sleep(0.3)
        r2 = api_client.get(f"{API}/leaderboard/user/{username}")
        assert r2.status_code == 200
        stats = r2.json()
        assert stats["username"] == username
        assert stats["high_score"] == 250
        assert stats["games_played"] == 1

    def test_multiple_scores_high_score_is_max(self, api_client):
        username = f"{TEST_PREFIX}bob"
        for s in [100, 500, 300, 450]:
            r = api_client.post(
                f"{API}/leaderboard/score", json={"username": username, "score": s}
            )
            assert r.status_code == 200

        time.sleep(0.3)
        r = api_client.get(f"{API}/leaderboard/user/{username}")
        assert r.status_code == 200
        stats = r.json()
        assert stats["high_score"] == 500, stats
        assert stats["games_played"] == 4, stats

    def test_username_whitespace_is_trimmed(self, api_client):
        username = f"{TEST_PREFIX}trim"
        r = api_client.post(
            f"{API}/leaderboard/score",
            json={"username": f"  {username}  ", "score": 42},
        )
        assert r.status_code == 200

        # Should be findable by trimmed name
        r2 = api_client.get(f"{API}/leaderboard/user/{username}")
        assert r2.status_code == 200
        assert r2.json()["high_score"] == 42


# ---------------------- Top scores ----------------------

class TestTopScores:
    def test_get_top_scores_sorted_desc(self, api_client):
        # Seed a few distinctive scores
        users = [
            (f"{TEST_PREFIX}top1", 9001),
            (f"{TEST_PREFIX}top2", 8500),
            (f"{TEST_PREFIX}top3", 8000),
        ]
        for u, s in users:
            api_client.post(
                f"{API}/leaderboard/score", json={"username": u, "score": s}
            )

        time.sleep(0.3)
        r = api_client.get(f"{API}/leaderboard/top?limit=100")
        assert r.status_code == 200, r.text
        entries = r.json()
        assert isinstance(entries, list)
        assert len(entries) > 0

        # Should be sorted descending overall
        scores_only = [e["score"] for e in entries]
        assert scores_only == sorted(scores_only, reverse=True), scores_only

        # Verify our seeded users show up with expected scores
        seeded = {u for u, _ in users}
        found = {e["username"]: e["score"] for e in entries if e["username"] in seeded}
        for u, s in users:
            assert found.get(u) == s, f"Missing/incorrect score for {u}: {found}"

        # Verify schema
        for e in entries[:3]:
            assert set(e.keys()) >= {"username", "score", "timestamp"}
            assert isinstance(e["timestamp"], str)
            assert "_id" not in e  # ObjectId must not leak

    def test_top_scores_limit_param(self, api_client):
        r = api_client.get(f"{API}/leaderboard/top?limit=2")
        assert r.status_code == 200
        assert len(r.json()) <= 2

    def test_top_scores_default_limit(self, api_client):
        r = api_client.get(f"{API}/leaderboard/top")
        assert r.status_code == 200
        assert len(r.json()) <= 50


# ---------------------- User stats ----------------------

class TestUserStats:
    def test_nonexistent_user_returns_zero_values(self, api_client):
        username = f"{TEST_PREFIX}ghost_{uuid.uuid4().hex[:6]}"
        r = api_client.get(f"{API}/leaderboard/user/{username}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["username"] == username
        assert data["high_score"] == 0
        assert data["games_played"] == 0
        assert data["rank"] is None

    def test_rank_is_based_on_best_score(self, api_client):
        """Rank should be determined by user's MAX (best) score vs other users."""
        # Create two users; user_high has best 10_000, user_low has best 5_000
        user_high = f"{TEST_PREFIX}ranker_high"
        user_low = f"{TEST_PREFIX}ranker_low"

        # user_low: many low scores
        for s in [100, 200, 5000]:
            api_client.post(
                f"{API}/leaderboard/score", json={"username": user_low, "score": s}
            )
        # user_high: one huge score plus low ones (should still rank higher)
        for s in [50, 10000, 300]:
            api_client.post(
                f"{API}/leaderboard/score", json={"username": user_high, "score": s}
            )

        time.sleep(0.3)
        r_high = api_client.get(f"{API}/leaderboard/user/{user_high}")
        r_low = api_client.get(f"{API}/leaderboard/user/{user_low}")
        assert r_high.status_code == 200 and r_low.status_code == 200

        high_stats = r_high.json()
        low_stats = r_low.json()

        assert high_stats["high_score"] == 10000
        assert low_stats["high_score"] == 5000
        assert high_stats["rank"] is not None
        assert low_stats["rank"] is not None
        # high user must be ranked better (lower number) than low user
        assert high_stats["rank"] < low_stats["rank"], (high_stats, low_stats)


# ---------------------- Global stats ----------------------

class TestGlobalStats:
    def test_global_stats_shape_and_growth(self, api_client):
        r_before = api_client.get(f"{API}/leaderboard/stats")
        assert r_before.status_code == 200, r_before.text
        before = r_before.json()
        for key in ("total_games", "unique_players", "highest_score"):
            assert key in before
            assert isinstance(before[key], int)

        # Submit a new record-ish score
        username = f"{TEST_PREFIX}globaluser"
        api_client.post(
            f"{API}/leaderboard/score", json={"username": username, "score": 999999}
        )
        time.sleep(0.3)

        r_after = api_client.get(f"{API}/leaderboard/stats")
        assert r_after.status_code == 200
        after = r_after.json()

        assert after["total_games"] >= before["total_games"] + 1
        assert after["highest_score"] >= 999999
        assert after["unique_players"] >= before["unique_players"]


# ---------------------- Cleanup ----------------------

def test_zzz_cleanup_test_data():
    """Clean up all TEST_ prefixed rows via direct Mongo (best-effort)."""
    try:
        from pymongo import MongoClient
        # Read backend env
        mongo_url = None
        db_name = None
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("MONGO_URL="):
                    mongo_url = line.split("=", 1)[1].strip().strip('"')
                elif line.startswith("DB_NAME="):
                    db_name = line.split("=", 1)[1].strip().strip('"')
        if mongo_url and db_name:
            c = MongoClient(mongo_url)
            res = c[db_name].scores.delete_many({"username": {"$regex": f"^{TEST_PREFIX}"}})
            print(f"Cleaned up {res.deleted_count} test docs")
            c.close()
    except Exception as e:
        print(f"Cleanup skipped: {e}")
