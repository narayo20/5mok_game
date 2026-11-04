/**
 * Renju Rule Engine (렌주룰 오목 엔진)
 * 15x15 표준 바둑판
 * 흑(Black): 3-3 금수, 4-4 금수, 장목(6목 이상) 금수. 5목만 승리.
 * 백(White): 금수 없음 (3-3, 4-4, 장목 모두 허용 및 승리 인정).
 */

export const BOARD_SIZE = 15;

export const Player = {
  NONE: 0,
  BLACK: 1,
  WHITE: 2,
} as const;

export type PlayerType = typeof Player[keyof typeof Player];
export type BoardState = PlayerType[][];

export type ForbiddenType = '3-3' | '4-4' | 'OVERLINE' | null;

export interface Move {
  row: number;
  col: number;
  player: PlayerType;
  moveNumber: number;
}

export interface GameStatus {
  isOver: boolean;
  winner: PlayerType;
  winLine?: [number, number][];
  reason?: string;
}

// 4개 방향: 가로(0, 1), 세로(1, 0), 우하대각선(1, 1), 우상대각선(-1, 1)
const DIRECTIONS: [number, number][] = [
  [0, 1],   // 가로
  [1, 0],   // 세로
  [1, 1],   // 대각선 ↘
  [-1, 1],  // 대각선 ↗
];

export function createEmptyBoard(): BoardState {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(Player.NONE));
}

export function isValidCoord(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/**
 * 특정 위치에 특정 플레이어가 돌을 놓았을 때 연속된 돌의 길이와 라인 좌표 반환
 */
export function getLineLength(
  board: BoardState,
  row: number,
  col: number,
  player: PlayerType,
  dr: number,
  dc: number
): { count: number; coords: [number, number][] } {
  let count = 1;
  const coords: [number, number][] = [[row, col]];

  // 정방향
  let r = row + dr;
  let c = col + dc;
  while (isValidCoord(r, c) && board[r][c] === player) {
    coords.push([r, c]);
    count++;
    r += dr;
    c += dc;
  }

  // 역방향
  r = row - dr;
  c = col - dc;
  while (isValidCoord(r, c) && board[r][c] === player) {
    coords.unshift([r, c]);
    count++;
    r -= dr;
    c -= dc;
  }

  return { count, coords };
}

/**
 * 5목 또는 승리 확인
 */
export function checkWin(
  board: BoardState,
  lastRow: number,
  lastCol: number,
  player: PlayerType
): { won: boolean; winLine?: [number, number][] } {
  for (const [dr, dc] of DIRECTIONS) {
    const { count, coords } = getLineLength(board, lastRow, lastCol, player, dr, dc);
    if (player === Player.BLACK) {
      // 흑은 정확히 5목이어야만 승리 (6목 이상은 금수)
      if (count === 5) {
        return { won: true, winLine: coords };
      }
    } else if (player === Player.WHITE) {
      // 백은 5목 이상(장목 포함) 모두 승리
      if (count >= 5) {
        return { won: true, winLine: coords };
      }
    }
  }
  return { won: false };
}

/**
 * 장목(6목 이상) 검사 (흑 전용)
 */
function isOverline(board: BoardState, row: number, col: number): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    const { count } = getLineLength(board, row, col, Player.BLACK, dr, dc);
    if (count > 5) {
      return true;
    }
  }
  return false;
}

/**
 * 흑이 (row, col)에 돌을 놓았을 때 4(Four)가 생기는지 특정 방향에 대해 검사
 * 사(4)는 다음 수로 5목을 만들 수 있는 패턴 (열린 4 또는 닫힌 4)
 */
function countFoursInDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number
): number {
  // 가상의 보드 생성: (row, col)에 흑돌 놓음
  board[row][col] = Player.BLACK;

  // (row, col)을 포함하는 해당 방향의 연속 5칸 윈도우들 검사
  // 5칸 윈도우 안에 흑돌 4개 + 빈칸 1개가 있고, 그 빈칸에 흑돌을 두었을 때 5목(정확히 5목)이 되는 경우
  let fourWinningPoints = new Set<string>();

  for (let offset = -4; offset <= 0; offset++) {
    let blackCount = 0;
    let emptyCount = 0;
    let emptyR = -1;
    let emptyC = -1;
    let validWindow = true;

    for (let i = 0; i < 5; i++) {
      const r = row + (offset + i) * dr;
      const c = col + (offset + i) * dc;

      if (!isValidCoord(r, c) || board[r][c] === Player.WHITE) {
        validWindow = false;
        break;
      }

      if (board[r][c] === Player.BLACK) {
        blackCount++;
      } else {
        emptyCount++;
        emptyR = r;
        emptyC = c;
      }
    }

    if (validWindow && blackCount === 4 && emptyCount === 1) {
      // 빈칸에 흑돌을 두었을 때 정확히 5목이 되는지 (장목이 되지 않는지) 확인
      board[emptyR][emptyC] = Player.BLACK;
      const { count } = getLineLength(board, emptyR, emptyC, Player.BLACK, dr, dc);
      board[emptyR][emptyC] = Player.NONE;

      if (count === 5) {
        fourWinningPoints.add(`${emptyR},${emptyC}`);
      }
    }
  }

  board[row][col] = Player.NONE;
  return fourWinningPoints.size > 0 ? 1 : 0;
}

/**
 * 흑이 (row, col)에 돌을 놓았을 때 활삼(열린 3) 검사
 * 활삼은 다음 수로 양쪽이 열린 4(Open Four)를 만들 수 있는 3-돌 구성
 */
function countOpenThreesInDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number
): number {
  board[row][col] = Player.BLACK;

  // 열린 4(Open Four)를 만들 수 있는 빈칸이 존재하는지 찾기
  // 6칸 윈도우: . X X X . 형태 (단, 내부 빈칸 포함 . X . X X . 등)
  let openThreeFound = false;

  // (row, col) 주변으로 가능한 후보 빈칸들을 놓아보고 열린 4가 되는지 확인
  for (let dist = -4; dist <= 4; dist++) {
    if (dist === 0) continue;
    const testR = row + dist * dr;
    const testC = col + dist * dc;

    if (!isValidCoord(testR, testC) || board[testR][testC] !== Player.NONE) continue;

    // testR, testC에 흑돌을 두었을 때 열린 4가 되는지 검사
    board[testR][testC] = Player.BLACK;

    const { count, coords } = getLineLength(board, testR, testC, Player.BLACK, dr, dc);
    if (count === 4) {
      // 양 끝이 비어있는지 확인
      const headR = coords[0][0] - dr;
      const headC = coords[0][1] - dc;
      const tailR = coords[coords.length - 1][0] + dr;
      const tailC = coords[coords.length - 1][1] + dc;

      const headOpen = isValidCoord(headR, headC) && board[headR][headC] === Player.NONE;
      const tailOpen = isValidCoord(tailR, tailC) && board[tailR][tailC] === Player.NONE;

      if (headOpen && tailOpen) {
        // testR, testC가 흑의 금수 자리가 아닌지 (가권자 체크 - 금수가 아니어야 진정한 활삼)
        // 5목 완성수는 금수 제외이므로 이 수는 항상 유효
        openThreeFound = true;
      }
    }

    board[testR][testC] = Player.NONE;
    if (openThreeFound) break;
  }

  board[row][col] = Player.NONE;
  return openThreeFound ? 1 : 0;
}

/**
 * 렌주룰 금수 검사 (흑돌 전용)
 * @returns 'OVERLINE' | '4-4' | '3-3' | null
 */
export function checkForbiddenMove(
  board: BoardState,
  row: number,
  col: number,
  player: PlayerType
): ForbiddenType {
  // 백돌은 어떤 금수도 없음
  if (player !== Player.BLACK) {
    return null;
  }

  if (board[row][col] !== Player.NONE) {
    return null;
  }

  // 1. 만약 이 수로 정확히 5목이 완성된다면, 렌주룰에서 5목은 금수보다 우선하여 즉시 승리!
  board[row][col] = Player.BLACK;
  let makesExactlyFive = false;
  for (const [dr, dc] of DIRECTIONS) {
    const { count } = getLineLength(board, row, col, Player.BLACK, dr, dc);
    if (count === 5) {
      makesExactlyFive = true;
      break;
    }
  }
  board[row][col] = Player.NONE;

  if (makesExactlyFive) {
    return null; // 승리 수이므로 금수 아님
  }

  // 2. 장목(6목 이상) 금수 체크
  board[row][col] = Player.BLACK;
  const overline = isOverline(board, row, col);
  board[row][col] = Player.NONE;
  if (overline) {
    return 'OVERLINE';
  }

  // 3. 4-4 (사사) 금수 체크
  let fourCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    fourCount += countFoursInDirection(board, row, col, dr, dc);
  }
  if (fourCount >= 2) {
    return '4-4';
  }

  // 4. 3-3 (삼삼) 금수 체크
  let threeCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    threeCount += countOpenThreesInDirection(board, row, col, dr, dc);
  }
  if (threeCount >= 2) {
    return '3-3';
  }

  return null;
}

/**
 * 현재 바둑판 위의 모든 흑 금수 위치 찾기 (UI 힌트용)
 */
export function getAllForbiddenMoves(board: BoardState): { row: number; col: number; reason: ForbiddenType }[] {
  const forbiddenList: { row: number; col: number; reason: ForbiddenType }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === Player.NONE) {
        const reason = checkForbiddenMove(board, r, c, Player.BLACK);
        if (reason) {
          forbiddenList.push({ row: r, col: c, reason });
        }
      }
    }
  }
  return forbiddenList;
}

/**
 * 간단하고 빠른 휴리스틱 기반 AI 추천 수 / 혼자하기 봇
 */
export function getBestMoveAI(board: BoardState, player: PlayerType): { row: number; col: number } | null {
  const opponent = player === Player.BLACK ? Player.WHITE : Player.BLACK;

  // 빈 보드인 경우 천원(7, 7)
  if (board[7][7] === Player.NONE) {
    let empty = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== Player.NONE) {
          empty = false;
          break;
        }
      }
    }
    if (empty) return { row: 7, col: 7 };
  }

  let bestScore = -Infinity;
  let bestMoves: { row: number; col: number }[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== Player.NONE) continue;

      // 흑일 때 금수 제외
      if (player === Player.BLACK) {
        const forbidden = checkForbiddenMove(board, r, c, Player.BLACK);
        if (forbidden) continue;
      }

      // 주위에 돌이 있는지 간단 반경 체크 (성능 최적화)
      let hasNeighbor = false;
      for (let dr = -2; dr <= 2 && !hasNeighbor; dr++) {
        for (let dc = -2; dc <= 2 && !hasNeighbor; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (isValidCoord(nr, nc) && board[nr][nc] !== Player.NONE) {
            hasNeighbor = true;
          }
        }
      }
      if (!hasNeighbor) continue;

      let score = 0;

      // 1. 내 돌을 두었을 때 승리 검사
      board[r][c] = player;
      const myWin = checkWin(board, r, c, player);
      board[r][c] = Player.NONE;
      if (myWin.won) return { row: r, col: c };

      // 2. 상대방이 두었을 때 승리하는지 막기
      board[r][c] = opponent;
      const opWin = checkWin(board, r, c, opponent);
      board[r][c] = Player.NONE;
      if (opWin.won) score += 50000;

      // 3. 방향별 점수 합산
      for (const [dr, dc] of DIRECTIONS) {
        board[r][c] = player;
        const myLen = getLineLength(board, r, c, player, dr, dc).count;
        board[r][c] = Player.NONE;

        board[r][c] = opponent;
        const opLen = getLineLength(board, r, c, opponent, dr, dc).count;
        board[r][c] = Player.NONE;

        if (myLen === 4) score += 10000;
        else if (myLen === 3) score += 1000;
        else if (myLen === 2) score += 100;

        if (opLen === 4) score += 8000;
        else if (opLen === 3) score += 800;
        else if (opLen === 2) score += 50;
      }

      // 중앙 가중치
      const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
      score += (14 - centerDist) * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [{ row: r, col: c }];
      } else if (score === bestScore) {
        bestMoves.push({ row: r, col: c });
      }
    }
  }

  if (bestMoves.length === 0) {
    return { row: 7, col: 7 };
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

