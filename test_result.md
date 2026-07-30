# Testing Protocol

## Testing Workflow:
1. Backend testing first using testing_agent
2. Fix any backend issues before frontend testing
3. Frontend testing only after explicit user permission
4. Never fix issues that are already fixed by testing agents

---

## Current Test Focus: Game Screen Bug Fixes

### Bugs Reported by User (need verification):
1. **Grid Layout & Alignment**: 8x8 grid was distorted/misaligned - need perfect centering
2. **Drag and Drop Controls**: Couldn't drag pieces from bottom to grid - need touch/mouse drag-drop
3. **Block Shape Consistency**: Pieces changed shape when placed - need identical visual

### Fixes Applied:
1. Refactored grid to use absolute positioning per cell (each cell at exact `row * CELL_SIZE, col * CELL_SIZE`)
2. Implemented PanResponder-based drag-and-drop with capture handlers
3. Created single `RenderPieceBlocks` component used for BOTH queue pieces AND placed grid pieces (guarantees identical shape/size)

### Key Implementation Details:
- Uses `Animated.ValueXY` + `getLayout()` for smooth drag position tracking
- Grid layout measured via `measureInWindow` on layout (with retries for reliability)
- Uses refs for state values accessed in PanResponder callbacks (avoids stale closures)
- Piece follows finger center with 20px lift for visibility
- Preview cells highlight where piece will land (green=valid, red=invalid)
- Placement is snapped to grid cells (Math.round for tolerance)

### System Status:
- Backend: RUNNING (leaderboard endpoints operational)
- Frontend: RUNNING with new game.tsx
- Grid width fits viewport (352px in 390px screen, 19px margins)
- Piece slots fit (96px x 3 = 288px, distributed with gaps)

### Test Coverage Needed:
- [ ] Drag piece from slot 0/1/2 to grid successfully places it
- [ ] Piece shape matches exactly between queue and grid (L stays L, T stays T, etc.)
- [ ] Grid cells are perfectly aligned (no distortion)
- [ ] Preview highlights show correctly during drag
- [ ] Invalid placements are rejected
- [ ] Score increments on Match-3 clear
- [ ] All 6 block colors render correctly
- [ ] Game over triggers when no piece fits

---

## Previous Backend Tests (Passed): 17/17 leaderboard tests

## Test Credentials
Any username can be used - no authentication required. See /app/memory/test_credentials.md
