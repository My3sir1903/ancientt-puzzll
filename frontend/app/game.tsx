import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { storage } from '@/src/utils/storage';
import {
  GRID_SIZE,
  NUM_PIECES,
  Grid,
  Piece,
  BlockColor,
  COLOR_CONFIG,
  createEmptyGrid,
  generatePieces,
  canPlacePiece,
  placePiece,
  findMatches,
  clearMatches,
  canPlaceAnyPiece,
} from '@/src/utils/gameLogic';
import { getGameSettings, GameSettings } from '@/src/utils/gameSettings';
import { getRankByScore } from '@/src/utils/ranks';

const BACKEND_URL = 'https://ancient-puzzl.onrender.com';

// Web-only styles to prevent page scroll while dragging
const webNoTouchStyle =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none' } as any)
    : {};

// ---------- shared block renderer ----------

const RenderPieceBlocks = ({
  piece,
  cellSize,
}: {
  piece: Piece | null;
  cellSize: number;
}) => {
  if (!piece) return null; // <-- Null gelirse hataya düşmesini engelliyor

  const config = COLOR_CONFIG[piece.color];
  return (
    <View
      style={{
        width: piece.width * cellSize,
        height: piece.height * cellSize,
        pointerEvents: 'none',
      }}
    >
      {piece.shape.map(([r, c], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: r * cellSize,
            left: c * cellSize,
            width: cellSize,
            height: cellSize,
            padding: 1,
          }}
        >
          <LinearGradient
            colors={[config.lighter, config.hex, config.darker]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.blockFill}
          >
            <MaterialIcons
              name={config.icon as any}
              size={cellSize * 0.55}
              color="rgba(255,255,255,0.95)"
            />
          </LinearGradient>
        </View>
      ))}
    </View>
  );
};

// ---------- main game screen ----------

export default function GameScreen() {
  const { width } = useWindowDimensions();
  const triggerComboAnimation = (combo: number) => {
  let text = `COMBO x${combo}!`;
  if (combo === 2) text = 'GREAT! x2';
  else if (combo === 3) text = 'EXCELLENT! x3';
  else if (combo === 4) text = 'UNSTOPPABLE! x4';
  else if (combo >= 5) text = 'LEGENDARY! x' + combo;

  setComboText(text);
  comboAnim.setValue(0);

  // Yazının yukarı doğru süzülüp büyüyerek kaybolma animasyonu
  Animated.sequence([
    Animated.timing(comboAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.delay(400),
    Animated.timing(comboAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start(() => setComboText(null));
};
// GameScreen fonksiyonunun içine ekle:
const [comboCount, setComboCount] = useState(0);
const [comboText, setComboText] = useState<string | null>(null);
const comboAnim = useRef(new Animated.Value(0)).current;
  // Responsive grid sizing
  const GRID_PADDING = 4;
  const GRID_BORDER = 2;
  const availableWidth = Math.min(width - 16, 500);
  const CELL_SIZE = Math.floor(
    (availableWidth - GRID_PADDING * 2 - GRID_BORDER * 2) / GRID_SIZE
  );
  const GRID_PX = CELL_SIZE * GRID_SIZE;
  const GRID_OUTER = GRID_PX + GRID_PADDING * 2 + GRID_BORDER * 2;

  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [pieces, setPieces] = useState<(Piece | null)[]>(
    generatePieces(NUM_PIECES)
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<GameSettings>({
    sfxEnabled: true,
    musicEnabled: true,
  });
  const [username, setUsername] = useState<string>('');
  const [showPause, setShowPause] = useState(false);

  // Drag state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [previewCells, setPreviewCells] = useState<Set<string>>(new Set());
  const [previewValid, setPreviewValid] = useState(false);
  const dragPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Refs to avoid stale closures in gesture callbacks
  const gridRef = useRef<Grid>(grid);
  const piecesRef = useRef<(Piece | null)[]>(pieces);
  const gameOverRef = useRef(gameOver);
  const gridLayoutRef = useRef({
    pageX: 0,
    pageY: 0,
    cellSize: CELL_SIZE,
  });
  const currentTargetRef = useRef<{
    row: number;
    col: number;
    valid: boolean;
  } | null>(null);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);
  useEffect(() => {
    gridLayoutRef.current.cellSize = CELL_SIZE;
  }, [CELL_SIZE]);

  const gridContainerRef = useRef<View>(null);

  const measureGrid = useCallback(() => {
    gridContainerRef.current?.measureInWindow((x, y) => {
      if (x >= 0 && y >= 0) {
        gridLayoutRef.current = {
          pageX: x + GRID_PADDING + GRID_BORDER,
          pageY: y + GRID_PADDING + GRID_BORDER,
          cellSize: CELL_SIZE,
        };
      }
    });
  }, [CELL_SIZE, GRID_PADDING, GRID_BORDER]);

  const handleGridLayout = useCallback(() => {
    measureGrid();
    // Extra measurements to handle late layout on some devices
    setTimeout(measureGrid, 100);
    setTimeout(measureGrid, 400);
  }, [measureGrid]);

  useEffect(() => {
    (async () => {
      const s = await getGameSettings();
      setSettings(s);
      const u = await storage.getItem('username', null);
      setUsername(u || 'Player');
    })();
  }, []);

  // Refill pieces when all 3 are used
  useEffect(() => {
    if (pieces.every((p) => p === null)) {
      setPieces(generatePieces(NUM_PIECES));
    }
  }, [pieces]);

  // Check for game over after state changes
 useEffect(() => {
  if (gameOver) return;
  const activePieces = pieces.filter((p) => p !== null) as Piece[];
  if (activePieces.length === 0) return;

  if (!canPlaceAnyPiece(grid, activePieces)) {
    const timer = setTimeout(() => handleGameOver(), 400);
    return () => clearTimeout(timer);
  }
}, [pieces, grid, gameOver]);

  const triggerHaptic = useCallback(
  (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
    if (!settings.sfxEnabled) return;
    if (Platform.OS === 'web') return;
    try {
      if (type === 'light')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // <-- Güçlü vuruş
      else if (type === 'success')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },
  [settings.sfxEnabled]
);

  const handleGameOver = async () => {
    if (gameOverRef.current) return;
    setGameOver(true);
    triggerHaptic('error');
    if (!scoreSubmitted && username && score > 0) {
      try {
        await fetch(`${BACKEND_URL}/api/leaderboard/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, score }),
        });
        setScoreSubmitted(true);
      } catch (error) {
        console.error('Failed to submit score:', error);
      }
    }
  };

  const processMatchCascade = async (startGrid: Grid) => {
  let currentGrid = startGrid;
  let totalCleared = 0;
  let currentCombo = comboCount; // Mevcut kombodan devam et veya artır

  while (true) {
    const matches = findMatches(currentGrid);
    if (matches.size === 0) break;

    currentCombo += 1; // Her patlamada kombo artar
    setComboCount(currentCombo);

    // Eğer kombo 2 veya daha fazlaysa ekranda animasyonlu yazıyı tetikle
    if (currentCombo >= 2) {
      triggerComboAnimation(currentCombo);
    }

    setClearingCells(new Set(matches));
    triggerHaptic('success');
    await new Promise((r) => setTimeout(r, 350));

    totalCleared += matches.size;
    currentGrid = clearMatches(currentGrid, matches);
    setGrid(currentGrid);
    setClearingCells(new Set());

    await new Promise((r) => setTimeout(r, 100));
  }

  // Eğer bu hamlede hiç patlama olmadıysa kombo sıfırlanır
  if (totalCleared === 0) {
    setComboCount(0);
  } else {
    // Kombo bonus puanı ekle
    const comboBonus = currentCombo > 1 ? currentCombo * 5 : 0;
    setScore((prev) => prev + totalCleared + comboBonus);
  }
};


 const placePieceAt = (pieceIndex: number, row: number, col: number) => {
  const piece = piecesRef.current[pieceIndex];
  if (!piece) return;
  const currentGrid = gridRef.current;
  if (!canPlacePiece(currentGrid, piece, row, col)) return;

  triggerHaptic('medium');

  // Bloğu yerleştirdiği için parça büyüklüğüne göre puan ver (Örn: blok başına 10 puan)
  const pieceScore = piece.shape.length * 10;
  setScore((prev) => prev + pieceScore);

  const newGrid = placePiece(currentGrid, piece, row, col);
  setGrid(newGrid);

  const newPieces = [...piecesRef.current];
  newPieces[pieceIndex] = null;
  setPieces(newPieces);

  processMatchCascade(newGrid);
};

  const computeTargetFromDrag = (
    pieceX: number,
    pieceY: number,
    piece: Piece
  ) => {
    const layout = gridLayoutRef.current;
    if (!layout || layout.cellSize === 0) return null;

    // Bloğun sol üst köşesinin grid'e göre relatif konumu
    const relX = pieceX - layout.pageX;
    const relY = pieceY - layout.pageY;

    const col = Math.round(relX / layout.cellSize);
    const row = Math.round(relY / layout.cellSize);

    if (
      row + piece.height <= 0 ||
      col + piece.width <= 0 ||
      row >= GRID_SIZE ||
      col >= GRID_SIZE
    ) {
      return null;
    }
    return { row, col };
  };

  const updateDragTracking = (
    pieceIndex: number,
    absoluteX: number,
    absoluteY: number
  ) => {
    const piece = piecesRef.current[pieceIndex];
    if (!piece) return;

    const layout = gridLayoutRef.current;
    const pieceW = piece.width * layout.cellSize;
    const pieceH = piece.height * layout.cellSize;
    const OFFSET_Y = 80; // Blok parmağın 50px yukarısında uçsun

    // Bloğun ekrandaki gerçek (uçtuğu) sol üst köşe koordinatı
    const visualX = absoluteX - pieceW / 2;
    const visualY = absoluteY - pieceH / 2 - OFFSET_Y;

    dragPos.setValue({
      x: visualX,
      y: visualY,
    });

    // Hedef hücreyi parmağa göre DEĞİL, bloğun uçtuğu konuma göre hesapla:
    const target = computeTargetFromDrag(visualX, visualY, piece);
    if (!target) {
      currentTargetRef.current = null;
      setPreviewCells(new Set());
      setPreviewValid(false);
      return;
    }

    const cellsSet = new Set<string>();
    let allValid = true;
    for (const [dr, dc] of piece.shape) {
      const r = target.row + dr;
      const c = target.col + dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        allValid = false;
      } else if (gridRef.current[r] && gridRef.current[r][c] !== null) {
        allValid = false;
      }
      cellsSet.add(`${r},${c}`);
    }
    currentTargetRef.current = {
      row: target.row,
      col: target.col,
      valid: allValid,
    };
    setPreviewCells(cellsSet);
    setPreviewValid(allValid);
  };
  const onDragStart = (pieceIndex: number, x: number, y: number) => {
    if (gameOverRef.current) return;
    if (piecesRef.current[pieceIndex] === null) return;
    // Re-measure grid on each drag start to ensure fresh position
    measureGrid();
    setDraggingIndex(pieceIndex);
    updateDragTracking(pieceIndex, x, y);
    triggerHaptic('light');
  };

  const onDragUpdate = (pieceIndex: number, x: number, y: number) => {
    updateDragTracking(pieceIndex, x, y);
  };

  const onDragEnd = (pieceIndex: number) => {
    const target = currentTargetRef.current;
    if (target && target.valid) {
      placePieceAt(pieceIndex, target.row, target.col);
    } else {
      triggerHaptic('error');
    }
    setDraggingIndex(null);
    setPreviewCells(new Set());
    setPreviewValid(false);
    currentTargetRef.current = null;
  };

  const handleRestart = () => {
    setGrid(createEmptyGrid());
    setPieces(generatePieces(NUM_PIECES));
    setScore(0);
    setGameOver(false);
    setScoreSubmitted(false);
    setClearingCells(new Set());
    setShowPause(false);
    setDraggingIndex(null);
    setPreviewCells(new Set());
    currentTargetRef.current = null;
  };

  const handleExit = () => {
    router.replace('/home');
  };

  const draggingPiece =
    draggingIndex !== null ? pieces[draggingIndex] : null;

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowPause(true)}
            testID="pause-btn"
          >
            <MaterialIcons name="pause" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue} testID="game-score">
              {score}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleRestart}
            testID="restart-btn"
          >
            <MaterialIcons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {draggingPiece
              ? previewValid
                ? '✧ Release to place ✧'
                : '✧ Move to a valid spot ✧'
              : '✧ Drag a piece onto the grid ✧'}
          </Text>
        </View>

       {/* Grid — responsive, centered */}
        <View style={styles.gridWrapper}>
          {/* Floating Combo Text */}
          {comboText && (
            <Animated.View
              style={{
                position: 'absolute',
                top: '40%',
                alignSelf: 'center',
                zIndex: 999,
                pointerEvents: 'none',
                opacity: comboAnim,
                transform: [
                  {
                    scale: comboAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.4],
                    }),
                  },
                  {
                    translateY: comboAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, -30],
                    }),
                  },
                ],
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '900',
                  color: '#ff2e63',
                  textShadowColor: 'rgba(255, 255, 255, 0.8)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 12,
                  fontStyle: 'italic',
                  letterSpacing: 1.5,
                }}
              >
                {comboText}
              </Text>
            </Animated.View>
          )}

          {/* Izgara Bileşeni */}
          <View
            ref={gridContainerRef}
            onLayout={handleGridLayout}
            style={[
              styles.grid,
              {
                width: GRID_OUTER,
                height: GRID_OUTER,
                padding: GRID_PADDING,
                borderWidth: GRID_BORDER,
              },
            ]}
            testID="game-grid"
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const r = Math.floor(i / GRID_SIZE);
              const c = i % GRID_SIZE;
              const cell = grid[r][c];
              const key = `${r},${c}`;
              const isClearing = clearingCells.has(key);
              const isPreview = previewCells.has(key);
              return (
                <GridCell
                  key={key}
                  cell={cell}
                  size={CELL_SIZE}
                  row={r}
                  col={c}
                  isClearing={isClearing}
                  isPreview={isPreview}
                  previewValid={previewValid}
                  previewColor={draggingPiece?.color || null}
                />
              );
            })}
          </View>
        </View>

        {/* Piece queue with PanGestureHandler drag-and-drop */}
        <View style={styles.piecesContainer}>
          {pieces.map((piece, index) => (
            <PieceSlot
              key={`slot-${index}`}
              piece={piece}
              index={index}
              isDragging={draggingIndex === index}
              disabled={gameOver || draggingIndex !== null && draggingIndex !== index}
              onStart={onDragStart}
              onUpdate={onDragUpdate}
              onEnd={onDragEnd}
            />
          ))}
        </View>

        <View style={styles.legend}>
          <Text style={styles.legendText}>
            Match 3+ same symbols in a row or column
          </Text>
        </View>
      </SafeAreaView>

      {/* dragPos.getLayout() yerine transform kullanıyoruz */}
{draggingPiece && (
  <Animated.View
    style={[
      {
        position: 'absolute',
        opacity: 0.9,
        pointerEvents: 'none',
        transform: dragPos.getTranslateTransform(),
      },
    ]}
  >
    <RenderPieceBlocks piece={draggingPiece} cellSize={CELL_SIZE} />
  </Animated.View>
)}

      {/* Pause Modal */}
      <Modal visible={showPause} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="pause-circle-filled" size={64} color="#e94560" />
            <Text style={styles.modalTitle}>Paused</Text>
            <Text style={styles.modalScore}>Score: {score}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPause(false)}
              testID="resume-btn"
            >
              <LinearGradient
                colors={['#e94560', '#c0392b']}
                style={styles.modalButtonGradient}
              >
                <MaterialIcons name="play-arrow" size={24} color="#fff" />
                <Text style={styles.modalButtonText}>Resume</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={handleRestart}
              testID="restart-modal-btn"
            >
              <MaterialIcons name="refresh" size={20} color="#e94560" />
              <Text style={styles.modalButtonSecondaryText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={handleExit}
              testID="exit-btn"
            >
              <MaterialIcons name="home" size={20} color="#e94560" />
              <Text style={styles.modalButtonSecondaryText}>Exit to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="emoji-events" size={64} color="#e94560" />
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.modalSubtitle}>
              The ancients bow to your effort
            </Text>

            <View style={styles.gameOverStats}>
              <View style={styles.gameOverStat}>
                <Text style={styles.gameOverStatLabel}>FINAL SCORE</Text>
                <Text style={styles.gameOverStatValue} testID="final-score">
                  {score}
                </Text>
              </View>
              <View style={styles.gameOverStat}>
                <Text style={styles.gameOverStatLabel}>RANK</Text>
                <Text
                  style={[
                    styles.gameOverStatValue,
                    { color: getRankByScore(score).colors[0], fontSize: 16 },
                  ]}
                >
                  {getRankByScore(score).name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleRestart}
              testID="play-again-btn"
            >
              <LinearGradient
                colors={['#e94560', '#c0392b']}
                style={styles.modalButtonGradient}
              >
                <MaterialIcons name="replay" size={24} color="#fff" />
                <Text style={styles.modalButtonText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => {
                setGameOver(false);
                router.replace('/leaderboard');
              }}
            >
              <MaterialIcons name="leaderboard" size={20} color="#e94560" />
              <Text style={styles.modalButtonSecondaryText}>
                View Leaderboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={handleExit}
            >
              <MaterialIcons name="home" size={20} color="#e94560" />
              <Text style={styles.modalButtonSecondaryText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ---------- Piece slot with drag support ----------

interface PieceSlotProps {
  piece: Piece | null;
  index: number;
  isDragging: boolean;
  disabled: boolean;
  onStart: (index: number, x: number, y: number) => void;
  onUpdate: (index: number, x: number, y: number) => void;
  onEnd: (index: number) => void;
}

const PieceSlot = ({
  piece,
  index,
  isDragging,
  disabled,
  onStart,
  onUpdate,
  onEnd,
}: PieceSlotProps) => {
  const startedRef = useRef(false);

  const onGestureEvent = (e: PanGestureHandlerGestureEvent) => {
    if (!piece || disabled) return;
    const { absoluteX, absoluteY, state } = e.nativeEvent;
    // Sometimes onHandlerStateChange doesn't fire BEGAN before ACTIVE — fallback here
    if (!startedRef.current && (state === State.ACTIVE || state === State.BEGAN)) {
      startedRef.current = true;
      onStart(index, absoluteX, absoluteY);
    } else if (startedRef.current) {
      onUpdate(index, absoluteX, absoluteY);
    }
  };

  const onHandlerStateChange = (e: PanGestureHandlerStateChangeEvent) => {
    if (!piece || disabled) return;
    const { state, absoluteX, absoluteY } = e.nativeEvent;
    if (state === State.BEGAN || state === State.ACTIVE) {
      if (!startedRef.current) {
        startedRef.current = true;
        onStart(index, absoluteX, absoluteY);
      }
    } else if (
      state === State.END ||
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      if (startedRef.current) {
        startedRef.current = false;
        onEnd(index);
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      minDist={0}
      shouldCancelWhenOutside={false}
      enabled={!!piece && !disabled}
    >
      <View
        style={[
          styles.pieceSlot,
          isDragging && styles.pieceSlotDragging,
          !piece && styles.pieceSlotEmpty,
          webNoTouchStyle,
        ]}
        testID={`piece-slot-${index}`}
      >
        {piece && !isDragging && (
          <RenderPieceBlocks piece={piece} cellSize={24} />
        )}
      </View>
    </PanGestureHandler>
  );
};

// ---------- Grid Cell ----------

// ---------- Grid Cell (Animasyonlu Patlama Efekti) ----------

interface GridCellProps {
  cell: { color: BlockColor } | null;
  size: number;
  row: number;
  col: number;
  isClearing: boolean;
  isPreview: boolean;
  previewValid: boolean;
  previewColor: BlockColor | null;
}

const GridCell = ({
  cell,
  size,
  row,
  col,
  isClearing,
  isPreview,
  previewValid,
  previewColor,
}: GridCellProps) => {
  const config = cell ? COLOR_CONFIG[cell.color] : null;

  // Animasyon değerleri
  const animValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isClearing) {
      // Patlama efekti: Önce hafifçe büyüyüp parlar, sonra küçülerek şeffaflaşır
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.25, // Pop/Genişleme etkisi
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0, // İçeri doğru patlayıp küçülme
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityValue, {
          toValue: 0, // Şeffaflaşma
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Efekt bitince değerleri sıfırla
        animValue.setValue(1);
        opacityValue.setValue(1);
      });
    }
  }, [isClearing]);

  const previewBg =
    isPreview && previewColor
      ? previewValid
        ? COLOR_CONFIG[previewColor].hex + '55'
        : '#ef444455'
      : 'transparent';
  const previewBorder =
    isPreview && previewColor
      ? previewValid
        ? COLOR_CONFIG[previewColor].hex
        : '#ef4444'
      : 'transparent';

  return (
    <View
      style={{
        position: 'absolute',
        left: col * size,
        top: row * size,
        width: size,
        height: size,
        padding: 1,
      }}
    >
      {cell && config ? (
        <Animated.View
          style={{
            flex: 1,
            transform: [{ scale: isClearing ? animValue : 1 }],
            opacity: isClearing ? opacityValue : 1,
          }}
        >
          <LinearGradient
            colors={[config.lighter, config.hex, config.darker]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.blockFill,
              isClearing && {
                // Patlama anında etrafa parıltı/glow verme
                shadowColor: config.hex,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
                elevation: 10,
              },
            ]}
          >
            <MaterialIcons
              name={config.icon as any}
              size={size * 0.55}
              color="rgba(255,255,255,0.95)"
            />
          </LinearGradient>
        </Animated.View>
      ) : (
        <View
          style={[
            styles.emptyCell,
            isPreview && {
              backgroundColor: previewBg,
              borderColor: previewBorder,
              borderWidth: 2,
            },
          ]}
        />
      )}
    </View>
  );
};

// ---------- styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.4)',
    minWidth: 100,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#a8b2d1',
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e94560',
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  instructionText: {
    fontSize: 12,
    color: '#a8b2d1',
    fontStyle: 'italic',
  },
  gridWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  grid: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    borderColor: 'rgba(233, 69, 96, 0.3)',
    position: 'relative',
    aspectRatio: 1,
  },
  blockFill: {
    flex: 1,
    width: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCell: {
    flex: 1,
    width: '100%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  piecesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  pieceSlot: {
    width: 96,
    height: 82,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(233, 69, 96, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceSlotDragging: {
    opacity: 0.25,
    borderColor: '#e94560',
    borderStyle: 'dashed',
  },
  pieceSlotEmpty: {
    opacity: 0.3,
  },
  legend: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#a8b2d1',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#a8b2d1',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalScore: {
    fontSize: 20,
    color: '#e94560',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 20,
  },
  gameOverStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  gameOverStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.2)',
  },
  gameOverStatLabel: {
    fontSize: 10,
    color: '#a8b2d1',
    letterSpacing: 1,
    marginBottom: 4,
  },
  gameOverStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e94560',
  },
  modalButton: {
    width: '100%',
    marginBottom: 10,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  width: '100%',
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderWidth: 1,
  borderColor: 'rgba(233, 69, 96, 0.3)',
  marginTop: 8,
  marginBottom: 8,
  gap: 8,
},

modalButtonSecondaryText: {
  color: '#e94560',
  fontSize: 14,
  fontWeight: '600',
},
});
