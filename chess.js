document.addEventListener('DOMContentLoaded', async () => {
  const boardElement = document.getElementById('chessBoard');
  const statusElement = document.getElementById('chessStatus');
  const capturedPiecesElement = document.getElementById('capturedPieces');
  const moveHistoryElement = document.getElementById('moveHistory');
  const gameModeElement = document.getElementById('gameMode');
  const difficultyElement = document.getElementById('aiDifficulty');
  const difficultyGroup = document.getElementById('difficultyGroup');
  const playerColorElement = document.getElementById('playerColor');
  const boardThemeElement = document.getElementById('boardTheme');
  const pieceStyleElement = document.getElementById('pieceStyle');
  const showLegalMovesElement = document.getElementById('showLegalMoves');
  const showCoordinatesElement = document.getElementById('showCoordinates');
  const newGameBtn = document.getElementById('newGameBtn');
  const undoMoveBtn = document.getElementById('undoMoveBtn');
  const hintBtn = document.getElementById('hintBtn');
  const flipBoardBtn = document.getElementById('flipBoardBtn');
  const winModal = document.getElementById('chessWinModal');
  const winTitle = document.getElementById('winTitle');
  const winText = document.getElementById('winText');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const fireworksCanvas = document.getElementById('fireworksCanvas');

  const loadChessEngine = async () => {
    if (window.Chess) return true;

    const engineSources = [
      'vendor/chess-engine.js?v=20260810-classic2',
      './vendor/chess-engine.js?v=20260810-classic2',
      '/vendor/chess-engine.js?v=20260810-classic2'
    ];

    for (const source of engineSources) {
      const loaded = await new Promise((resolve) => {
        const script = document.createElement('script');

        script.src = source;
        script.onload = () => resolve(Boolean(window.Chess));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });

      if (loaded) return true;
    }

    return false;
  };

  const installFallbackChessEngine = () => {
    const startRows = {
      8: 'rnbqkbnr',
      7: 'pppppppp',
      2: 'PPPPPPPP',
      1: 'RNBQKBNR'
    };
    const fileNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    window.Chess = function FallbackChess() {
      let turnColor = 'w';
      let squares = {};
      const moveStack = [];

      const squareToCoords = (square) => ({
        file: fileNames.indexOf(square[0]),
        rank: Number(square[1])
      });

      const coordsToSquare = (file, rank) => (
        file >= 0 && file < 8 && rank >= 1 && rank <= 8 ? `${fileNames[file]}${rank}` : null
      );

      const pieceColor = (letter) => letter === letter.toUpperCase() ? 'w' : 'b';
      const pieceType = (letter) => letter.toLowerCase();
      const makePiece = (letter) => ({ color: pieceColor(letter), type: pieceType(letter) });

      const resetBoard = () => {
        squares = {};
        turnColor = 'w';
        moveStack.length = 0;

        Object.entries(startRows).forEach(([rank, row]) => {
          row.split('').forEach((letter, file) => {
            squares[`${fileNames[file]}${rank}`] = makePiece(letter);
          });
        });
      };

      const getPiece = (square) => squares[square] || null;
      const isEnemy = (square, color) => {
        const piece = getPiece(square);
        return piece && piece.color !== color;
      };
      const isEmpty = (square) => square && !getPiece(square);

      const addSlideMoves = (moves, from, piece, directions) => {
        const { file, rank } = squareToCoords(from);

        directions.forEach(([fileStep, rankStep]) => {
          let nextFile = file + fileStep;
          let nextRank = rank + rankStep;

          while (true) {
            const to = coordsToSquare(nextFile, nextRank);
            if (!to) break;

            const target = getPiece(to);
            if (!target) {
              moves.push({ color: piece.color, from, to, piece: piece.type, flags: 'n', san: `${from}-${to}` });
            } else {
              if (target.color !== piece.color) {
                moves.push({ color: piece.color, from, to, piece: piece.type, captured: target.type, flags: 'c', san: `${from}x${to}` });
              }
              break;
            }

            nextFile += fileStep;
            nextRank += rankStep;
          }
        });
      };

      const generateMoves = (options = {}) => {
        const moves = [];

        Object.entries(squares).forEach(([from, piece]) => {
          if (!piece || piece.color !== turnColor) return;
          if (options.square && options.square !== from) return;

          const { file, rank } = squareToCoords(from);
          const pushStep = (to) => {
            if (!to) return;
            const target = getPiece(to);
            if (!target) moves.push({ color: piece.color, from, to, piece: piece.type, flags: 'n', san: `${from}-${to}` });
            else if (target.color !== piece.color) moves.push({ color: piece.color, from, to, piece: piece.type, captured: target.type, flags: 'c', san: `${from}x${to}` });
          };

          if (piece.type === 'p') {
            const direction = piece.color === 'w' ? 1 : -1;
            const startRank = piece.color === 'w' ? 2 : 7;
            const one = coordsToSquare(file, rank + direction);
            const two = coordsToSquare(file, rank + direction * 2);

            if (isEmpty(one)) {
              moves.push({ color: piece.color, from, to: one, piece: 'p', flags: 'n', san: `${from}-${one}` });
              if (rank === startRank && isEmpty(two)) moves.push({ color: piece.color, from, to: two, piece: 'p', flags: 'b', san: `${from}-${two}` });
            }

            [file - 1, file + 1].forEach((captureFile) => {
              const to = coordsToSquare(captureFile, rank + direction);
              if (to && isEnemy(to, piece.color)) {
                moves.push({ color: piece.color, from, to, piece: 'p', captured: getPiece(to).type, flags: 'c', san: `${from}x${to}` });
              }
            });
            return;
          }

          if (piece.type === 'n') {
            [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
              .forEach(([fileStep, rankStep]) => pushStep(coordsToSquare(file + fileStep, rank + rankStep)));
            return;
          }

          if (piece.type === 'b') addSlideMoves(moves, from, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
          if (piece.type === 'r') addSlideMoves(moves, from, piece, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
          if (piece.type === 'q') addSlideMoves(moves, from, piece, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
          if (piece.type === 'k') {
            [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]]
              .forEach(([fileStep, rankStep]) => pushStep(coordsToSquare(file + fileStep, rank + rankStep)));
          }
        });

        return options.verbose ? moves : moves.map((move) => move.san);
      };

      const hasKing = (color) => Object.values(squares).some((piece) => piece.color === color && piece.type === 'k');

      resetBoard();

      return {
        reset: resetBoard,
        turn: () => turnColor,
        get: getPiece,
        board: () => {
          const rows = [];
          for (let rank = 8; rank >= 1; rank -= 1) {
            rows.push(fileNames.map((file) => getPiece(`${file}${rank}`)));
          }
          return rows;
        },
        moves: generateMoves,
        move: (move) => {
          const legalMove = generateMoves({ square: move.from, verbose: true })
            .find((candidate) => candidate.to === move.to);

          if (!legalMove) return null;

          const movingPiece = getPiece(move.from);
          const capturedPiece = getPiece(move.to);
          const finalType = movingPiece.type === 'p' && (move.to[1] === '8' || move.to[1] === '1')
            ? (move.promotion || 'q')
            : movingPiece.type;
          const playedMove = {
            ...legalMove,
            captured: capturedPiece?.type,
            promotion: finalType !== movingPiece.type ? finalType : undefined,
            san: capturedPiece ? `${move.from}x${move.to}` : `${move.from}-${move.to}`
          };

          squares[move.to] = { color: movingPiece.color, type: finalType };
          delete squares[move.from];
          moveStack.push({ move: playedMove, movingPiece, capturedPiece, previousTurn: turnColor });
          turnColor = turnColor === 'w' ? 'b' : 'w';
          return playedMove;
        },
        undo: () => {
          const last = moveStack.pop();
          if (!last) return null;

          squares[last.move.from] = last.movingPiece;
          if (last.capturedPiece) squares[last.move.to] = last.capturedPiece;
          else delete squares[last.move.to];
          turnColor = last.previousTurn;
          return last.move;
        },
        history: (options = {}) => options.verbose ? moveStack.map((entry) => entry.move) : moveStack.map((entry) => entry.move.san),
        in_check: () => false,
        in_checkmate: () => !hasKing(turnColor),
        in_stalemate: () => false,
        in_threefold_repetition: () => false,
        insufficient_material: () => false,
        in_draw: () => false,
        game_over: () => !hasKing('w') || !hasKing('b') || generateMoves({ verbose: true }).length === 0
      };
    };
  };

  statusElement.textContent = 'Loading local chess engine...';

  const loadedEngine = await loadChessEngine();

  if (!loadedEngine) {
    installFallbackChessEngine();
  }

  if (!window.Chess) {
    statusElement.textContent = 'Chess engine could not start.';
    return;
  }

  const game = new window.Chess();
  const pieceMap = {
    wp: '♙',
    wn: '♘',
    wb: '♗',
    wr: '♖',
    wq: '♕',
    wk: '♔',
    bp: '♟',
    bn: '♞',
    bb: '♝',
    br: '♜',
    bq: '♛',
    bk: '♚'
  };
  const pieceValues = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  let selectedSquare = null;
  let legalTargets = [];
  let boardFlipped = false;
  let aiThinking = false;
  let fireworkAnimationId = null;

  const getSettings = () => ({
    mode: gameModeElement.value,
    difficulty: difficultyElement.value,
    playerColor: playerColorElement.value,
    boardTheme: boardThemeElement.value,
    pieceStyle: pieceStyleElement.value,
    showLegalMoves: showLegalMovesElement.checked,
    showCoordinates: showCoordinatesElement.checked
  });

  const isAiTurn = () => {
    const settings = getSettings();
    return settings.mode === 'ai' && game.turn() !== settings.playerColor && !game.game_over();
  };

  const getSquareName = (row, col) => {
    const visibleFiles = boardFlipped ? [...files].reverse() : files;
    const visibleRanks = boardFlipped ? [...ranks].reverse() : ranks;
    return `${visibleFiles[col]}${visibleRanks[row]}`;
  };

  const clearSelection = () => {
    selectedSquare = null;
    legalTargets = [];
  };

  const getMoveScore = (move) => {
    let score = 0;

    if (move.captured) score += pieceValues[move.captured] || 0;
    if (move.promotion) score += pieceValues[move.promotion] || 0;

    game.move(move);
    if (game.in_checkmate()) score += 100000;
    else if (game.in_check()) score += 60;
    game.undo();

    if (move.flags?.includes('c')) score += 20;
    if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) score += 15;
    return score;
  };

  const evaluateBoard = () => {
    const board = game.board();
    let score = 0;

    board.flat().forEach((piece) => {
      if (!piece) return;

      const value = pieceValues[piece.type] || 0;
      score += piece.color === 'w' ? value : -value;
    });

    return score;
  };

  const minimax = (depth, alpha, beta, maximizingWhite) => {
    if (depth === 0 || game.game_over()) return evaluateBoard();

    const moves = game.moves({ verbose: true }).sort((a, b) => getMoveScore(b) - getMoveScore(a));

    if (maximizingWhite) {
      let bestScore = -Infinity;

      for (const move of moves) {
        game.move(move);
        bestScore = Math.max(bestScore, minimax(depth - 1, alpha, beta, false));
        game.undo();
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      }

      return bestScore;
    }

    let bestScore = Infinity;

    for (const move of moves) {
      game.move(move);
      bestScore = Math.min(bestScore, minimax(depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }

    return bestScore;
  };

  const chooseAiMove = () => {
    const moves = game.moves({ verbose: true });
    const difficulty = getSettings().difficulty;

    if (!moves.length) return null;
    if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

    if (difficulty === 'medium') {
      const sortedMoves = moves.sort((a, b) => getMoveScore(b) - getMoveScore(a));
      return sortedMoves[Math.floor(Math.random() * Math.min(3, sortedMoves.length))];
    }

    const aiColor = game.turn();
    let bestMove = moves[0];
    let bestScore = aiColor === 'w' ? -Infinity : Infinity;

    for (const move of moves) {
      game.move(move);
      const score = minimax(2, -Infinity, Infinity, game.turn() === 'w');
      game.undo();

      if ((aiColor === 'w' && score > bestScore) || (aiColor === 'b' && score < bestScore)) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  };

  const getGameResult = () => {
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return { over: true, winner, text: `${winner} wins by checkmate.` };
    }

    if (game.in_stalemate()) return { over: true, winner: null, text: 'Draw by stalemate.' };
    if (game.in_threefold_repetition()) return { over: true, winner: null, text: 'Draw by repetition.' };
    if (game.insufficient_material()) return { over: true, winner: null, text: 'Draw by insufficient material.' };
    if (game.in_draw()) return { over: true, winner: null, text: 'The game is a draw.' };
    return { over: false, winner: null, text: '' };
  };

  const startFireworks = () => {
    const context = fireworksCanvas.getContext('2d');
    const particles = [];
    const colors = ['#facc15', '#6ee7f9', '#fb7185', '#86efac', '#c084fc'];
    let frame = 0;

    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    fireworksCanvas.classList.add('active');

    const burst = () => {
      const x = Math.random() * fireworksCanvas.width;
      const y = Math.random() * fireworksCanvas.height * 0.55 + 50;

      for (let index = 0; index < 42; index += 1) {
        const angle = (Math.PI * 2 * index) / 42;
        const speed = 2 + Math.random() * 4;

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 60,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const animate = () => {
      context.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

      if (frame % 18 === 0) burst();
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.035;
        particle.life -= 1;
        context.globalAlpha = Math.max(0, particle.life / 60);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        context.fill();
      });

      while (particles.length && particles[0].life <= 0) particles.shift();
      frame += 1;
      fireworkAnimationId = window.requestAnimationFrame(animate);
    };

    window.cancelAnimationFrame(fireworkAnimationId);
    animate();

    window.setTimeout(() => {
      window.cancelAnimationFrame(fireworkAnimationId);
      fireworksCanvas.classList.remove('active');
      context.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }, 4800);
  };

  const showWinModal = (result) => {
    if (!result.over || !result.winner) return;

    const settings = getSettings();
    const userWon = settings.mode === 'two'
      || (settings.playerColor === 'w' && result.winner === 'White')
      || (settings.playerColor === 'b' && result.winner === 'Black');

    if (!userWon) return;

    winTitle.textContent = 'Congratulations';
    winText.textContent = settings.mode === 'two' ? `${result.winner} wins the match.` : 'You defeated the AI.';
    winModal.classList.add('open');
    winModal.setAttribute('aria-hidden', 'false');
    startFireworks();
  };

  const updateStatus = () => {
    const result = getGameResult();

    if (result.over) {
      statusElement.textContent = result.text;
      showWinModal(result);
      return;
    }

    const turnName = game.turn() === 'w' ? 'White' : 'Black';
    const checkText = game.in_check() ? ' Check.' : '';
    statusElement.textContent = isAiTurn() ? `AI thinking as ${turnName}...` : `${turnName} to move.${checkText}`;
  };

  const renderHistory = () => {
    const history = game.history({ verbose: true });
    const rows = [];

    for (let index = 0; index < history.length; index += 2) {
      rows.push(`<span>${index / 2 + 1}.</span><strong>${history[index]?.san || ''}</strong><strong>${history[index + 1]?.san || ''}</strong>`);
    }

    moveHistoryElement.innerHTML = rows.join('') || '<p>No moves yet.</p>';
  };

  const renderCapturedPieces = () => {
    const history = game.history({ verbose: true });
    const captured = { w: [], b: [] };

    history.forEach((move) => {
      if (!move.captured) return;
      captured[move.color === 'w' ? 'b' : 'w'].push(pieceMap[`${move.color === 'w' ? 'b' : 'w'}${move.captured}`]);
    });

    capturedPiecesElement.innerHTML = `
      <span>White captured: ${captured.b.join(' ') || '-'}</span>
      <span>Black captured: ${captured.w.join(' ') || '-'}</span>
    `;
  };

  const renderBoard = () => {
    const settings = getSettings();

    boardElement.className = `chess-board theme-${settings.boardTheme} pieces-${settings.pieceStyle}${settings.showCoordinates ? ' show-coordinates' : ''}`;
    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const squareName = getSquareName(row, col);
        const piece = game.get(squareName);
        const square = document.createElement('button');
        const isLight = (row + col) % 2 === 0;

        square.className = `chess-square ${isLight ? 'light' : 'dark'}`;
        square.type = 'button';
        square.dataset.square = squareName;
        square.setAttribute('aria-label', piece ? `${squareName} ${piece.color} ${piece.type}` : squareName);

        if (squareName === selectedSquare) square.classList.add('selected');
        if (settings.showLegalMoves && legalTargets.includes(squareName)) square.classList.add(piece ? 'capture-target' : 'move-target');

        if (settings.showCoordinates && row === 7) square.dataset.file = squareName[0];
        if (settings.showCoordinates && col === 0) square.dataset.rank = squareName[1];
        if (piece) square.textContent = pieceMap[`${piece.color}${piece.type}`];

        boardElement.appendChild(square);
      }
    }

    renderCapturedPieces();
    renderHistory();
    updateStatus();
  };

  const makeMove = (move) => {
    const moved = game.move(move);

    if (!moved) return false;

    clearSelection();
    renderBoard();

    if (isAiTurn()) {
      aiThinking = true;
      window.setTimeout(() => {
        const aiMove = chooseAiMove();
        if (aiMove) game.move(aiMove);
        aiThinking = false;
        renderBoard();
      }, 350);
    }

    return true;
  };

  const handleSquareClick = (squareName) => {
    if (aiThinking || game.game_over()) return;
    if (isAiTurn()) return;

    const piece = game.get(squareName);
    const settings = getSettings();

    if (selectedSquare && legalTargets.includes(squareName)) {
      makeMove({ from: selectedSquare, to: squareName, promotion: 'q' });
      return;
    }

    if (!piece || piece.color !== game.turn()) {
      clearSelection();
      renderBoard();
      return;
    }

    if (settings.mode === 'ai' && piece.color !== settings.playerColor) return;

    selectedSquare = squareName;
    legalTargets = game.moves({ square: squareName, verbose: true }).map((move) => move.to);
    renderBoard();
  };

  const resetGame = () => {
    game.reset();
    clearSelection();
    aiThinking = false;
    winModal.classList.remove('open');
    winModal.setAttribute('aria-hidden', 'true');
    renderBoard();

    if (isAiTurn()) {
      window.setTimeout(() => {
        const aiMove = chooseAiMove();
        if (aiMove) game.move(aiMove);
        renderBoard();
      }, 400);
    }
  };

  boardElement.addEventListener('click', (event) => {
    const square = event.target.closest('.chess-square');
    if (!square) return;
    handleSquareClick(square.dataset.square);
  });

  gameModeElement.addEventListener('change', () => {
    difficultyGroup.hidden = gameModeElement.value !== 'ai';
    playerColorElement.disabled = gameModeElement.value !== 'ai';
    resetGame();
  });

  [difficultyElement, playerColorElement].forEach((element) => {
    element.addEventListener('change', resetGame);
  });

  [boardThemeElement, pieceStyleElement, showLegalMovesElement, showCoordinatesElement].forEach((element) => {
    element.addEventListener('change', renderBoard);
  });

  newGameBtn.addEventListener('click', resetGame);
  playAgainBtn.addEventListener('click', resetGame);
  flipBoardBtn.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    renderBoard();
  });
  undoMoveBtn.addEventListener('click', () => {
    if (aiThinking) return;
    game.undo();
    if (getSettings().mode === 'ai') game.undo();
    clearSelection();
    renderBoard();
  });
  hintBtn.addEventListener('click', () => {
    const moves = game.moves({ verbose: true });
    if (!moves.length || isAiTurn()) return;

    const hint = moves.sort((a, b) => getMoveScore(b) - getMoveScore(a))[0];
    selectedSquare = hint.from;
    legalTargets = [hint.to];
    statusElement.textContent = `Hint: ${hint.from} to ${hint.to}`;
    renderBoard();
    statusElement.textContent = `Hint: ${hint.from} to ${hint.to}`;
  });

  difficultyGroup.hidden = gameModeElement.value !== 'ai';
  renderBoard();
});
