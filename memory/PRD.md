# Ancient Puzzle Game - Product Requirements Document

## Project Overview
A mobile puzzle game with guest login (username only), featuring an 8x8 grid where Tetris-style blocks are placed and cleared using Match-3 mechanics. The game has an ancient/mythological visual theme with a leaderboard system.

## Current Implementation Status

### ✅ Phase 1: Guest Login & Leaderboard System (COMPLETED)

#### Features Implemented:
1. **Guest Login System**
   - Simple username entry (no password/email required)
   - Username validation (2-20 characters)
   - Local storage of username for persistence
   - Ability to change username anytime

2. **Frontend Components**
   - Username Entry Screen: Clean interface for entering nickname
   - Home Screen: User profile with stats (high score, games played, rank)
   - Leaderboard Screen: Top 50 players with pull-to-refresh
   - Navigation between all screens

3. **Backend API Endpoints**
   - `POST /api/leaderboard/score` - Submit a score
   - `GET /api/leaderboard/top` - Get top scores (default 50, configurable)
   - `GET /api/leaderboard/user/{username}` - Get user statistics
   - `GET /api/leaderboard/stats` - Get global statistics

4. **Database Schema**
   - `scores` collection: username, score, timestamp
   - MongoDB indexes: username, score (descending), timestamp

5. **Leaderboard Features**
   - Display top 50 players by score
   - Show rank (🥇🥈🥉 for top 3)
   - Highlight current user's entry
   - Pull-to-refresh functionality
   - User statistics: high score, games played, global rank

### ✅ Phase 2: Rank Tier System (COMPLETED)

#### Features Implemented:
1. **Rank Tiers Based on High Score**
   - **Bronze** (0-99 pts): "The path of the initiate" - Copper gradient
   - **Silver** (100-299 pts): "Rising through the ranks" - Silver gradient
   - **Gold** (300-599 pts): "A worthy warrior" - Gold gradient
   - **Platinum** (600-999 pts): "Master of the ancient arts" - Cyan gradient
   - **Ancient Master** (1000+ pts): "Legend of the ancients" - Purple gradient

2. **Rank Display Features**
   - Beautiful gradient rank card on home screen
   - Custom icon for each rank tier
   - Progress bar to next rank
   - Points remaining to next rank
   - "MAX RANK" indicator for Ancient Master
   - Rank progression list showing all tiers with current highlighted

3. **Dynamic Rank Updates**
   - Rank calculated automatically from high score
   - Updates immediately when high score changes
   - useFocusEffect ensures fresh data on screen focus

#### Technical Stack:
- **Frontend**: Expo React Native, TypeScript, expo-router
- **Backend**: FastAPI, Python, Motor (async MongoDB)
- **Database**: MongoDB with indexes for performance
- **Storage**: Local storage for username persistence

## Next Phases (Pending User Request)

### Phase 2: Game Core Mechanics
- 8x8 grid implementation
- Tetris-style block generation
- Touch/drag controls for block placement
- Match-3 detection algorithm (horizontal/vertical)
- Block clearing animations
- Collision detection
- Score calculation (blocks popped)

### Phase 3: Visual Theme & UI
- Ancient patterns and engravings on blocks
- Mythological themed UI elements
- Background artwork
- Sound effects and music
- Particle effects for matches

### Phase 4: Game Features
- Scoring system integration with leaderboard
- Game over detection
- Level progression
- Power-ups and special blocks
- Score submission after game over

### Phase 5: Enhanced Features
- User achievements
- Daily challenges
- Social features (share scores)
- Game replay system

## Design Guidelines
- **Color Scheme**: Dark blues (#1a1a2e, #16213e, #0f3460) with red/pink accents (#e94560)
- **Icons**: MaterialIcons from @expo/vector-icons
- **Layout**: Portrait mode, mobile-first design
- **Typography**: Bold headings, clean sans-serif
- **Theme**: Ancient civilizations (Mayan, Aztec, Egyptian, Greek patterns)

## API Endpoints

### Leaderboard
- `POST /api/leaderboard/score` - Submit a score (username, score)
- `GET /api/leaderboard/top?limit=50` - Get top scores
- `GET /api/leaderboard/user/{username}` - Get user statistics
- `GET /api/leaderboard/stats` - Get global statistics

### Game (To Be Implemented)
- `POST /api/game/start` - Start new game
- `POST /api/game/move` - Submit move
- `POST /api/game/end` - End game and submit final score

## Scoring System
- **Score Calculation**: Total number of blocks popped during the game
- **Leaderboard Ranking**: Based on highest score achieved
- **User Stats**: 
  - High score (best game)
  - Total games played
  - Current global rank

## Environment Configuration
- Backend URL: `EXPO_PUBLIC_BACKEND_URL` (from .env)
- MongoDB: Configured via `MONGO_URL` in backend/.env

## User Flow
1. First time: Enter username → Home screen
2. Home screen: View stats, play game, view leaderboard
3. Play game → Game ends → Score submitted → Updated stats/leaderboard
4. View leaderboard: See top players and your rank
