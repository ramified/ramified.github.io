# FIDE Chess on Glued-Boundary Square Boards

This document defines the intended rule contract for the `FIDE Chess` minigame.
It starts from the core rules of classical FIDE chess and then explains how those
rules are transported to a square lattice with removed tiles, cut edges, and
glued boundaries. The reference source for the classical rules is the FIDE Laws
of Chess, "FIDE Laws of Chess taking effect from 1 January 2023":
https://handbook.fide.com/chapter/E012023

Tournament administration rules are intentionally out of scope for this
minigame. Clocks, touch-move, arbiters, scoresheets, claims, rating procedures,
appeals, and penalties are not modeled here.

## 1. Classical FIDE Chess Essentials

### 1.1 Board and Pieces

Classical chess is played by two players, White and Black, on an 8 by 8 square
board. White moves first, and the players alternate one move at a time.

Each player begins with one king, one queen, two rooks, two bishops, two knights,
and eight pawns. No square may contain more than one piece. A piece may not move
to a square occupied by a friendly piece. If a piece legally moves to a square
occupied by an opposing piece, the opposing piece is captured and removed as
part of the same move.

### 1.2 Ordinary Movement

The rook moves any number of unobstructed squares along a rank or file.

The bishop moves any number of unobstructed squares along a diagonal.

The queen combines rook and bishop movement: any number of unobstructed squares
along a rank, file, or diagonal.

The king normally moves one square in any orthogonal or diagonal direction. The
king may never move into check, remain in check, or expose its own king to check.
Kings may not be adjacent in a way that attacks each other.

The knight moves in an L shape: two squares in one orthogonal direction and one
square perpendicular to that direction. Intervening pieces do not block a knight.

A pawn moves one square forward into an empty square. On its first move, a pawn
may instead move two squares forward if both the intermediate square and the
destination are empty. A pawn captures one square diagonally forward.

### 1.3 Check, Checkmate, and Stalemate

A king is in check when it is attacked by at least one opposing piece. A legal
move must leave the moving side's own king not in check.

Checkmate occurs when the side to move is in check and has no legal move. The
side delivering checkmate wins.

Stalemate occurs when the side to move is not in check and has no legal move.
The game is drawn.

Kings are not captured as a legal move. A position that would require capturing
the king is instead resolved as check, checkmate, or an illegal move.

### 1.4 Promotion

When a pawn reaches the rank furthest from its starting position, it is promoted
as part of the same move. The pawn becomes a queen, rook, bishop, or knight of
the same side. The new piece takes effect immediately. Promotion is not limited
by the pieces previously captured.

### 1.5 En Passant

If a pawn advances two squares in one move from its original square and lands
beside an opposing pawn that could have captured it had it advanced only one
square, the opposing pawn may capture it as though it had moved only one square.
This en passant capture is legal only on the immediately following move.

### 1.6 Castling

Castling is a single move involving the king and one rook of the same side. The
king moves two squares toward the rook along that side's back rank, and the rook
moves to the square the king crossed.

Castling is legal only if all of these conditions hold:

- The king and the chosen rook have not previously moved.
- The king and rook are on the required starting squares for that castling side.
- All squares between the king and rook are empty.
- The king is not currently in check.
- The square crossed by the king is not attacked by an opposing piece.
- The destination square of the king is not attacked by an opposing piece.

### 1.7 Basic Draw States

The minigame should recognize stalemate and positions where checkmate is
impossible for either side by any legal sequence. Other FIDE draw mechanisms,
such as draw offers, clock-related draws, repetition claims, and fifty-move-rule
claims, belong to competitive or claim-based play and are not required for this
first implementation.

## 2. Glued-Boundary Board Model

The glued-boundary chess variation uses only square-lattice boards. Hexagonal
and other non-square lattices are not part of `FIDE Chess`.

The playable board is the current square mosaic surface:

- Present tiles are playable squares.
- Removed tiles are absent and cannot be occupied or crossed.
- Cut edges are hard boundaries and cannot be crossed.
- Glued edges are traversable boundary identifications.

Whenever a move crosses an ordinary edge or a glued edge, it uses the existing
`surfaceSuccessor` behavior of the minigame engine. A step has both a destination
tile and a transported outgoing direction. For an ordinary edge the direction is
unchanged. For a glued edge the destination and outgoing direction are determined
by the glue.

This means a piece does not improvise a new geometric rule after crossing glue:
it keeps following its transported route.

## 3. Piece Movement on Glued Boards

### 3.1 Rook

A rook moves along transported orthogonal rays. Starting from its square, choose
one of the four orthogonal directions. Repeatedly apply `surfaceSuccessor`,
continuing in the transported direction at each step.

The rook may stop on any empty square reached by the ray, or on the first square
occupied by an opposing piece, which it captures. The ray stops when it reaches a
boundary that has no successor, a removed tile, a friendly piece, or the first
captured opposing piece. A repeated state of `(tile, direction)` closes the ray
and must stop search to avoid looping forever.

### 3.2 Bishop

A bishop moves along transported diagonal routes. A diagonal step is treated as
two compatible transported orthogonal steps that identify a diagonal neighbor on
the square surface. After crossing glue, the outgoing diagonal route is defined
by the transported component directions.

The bishop may stop on any empty square reached by such a route, or capture the
first opposing piece reached. It may not jump over intervening pieces. Ambiguous
diagonal continuations are not invented; only routes that the engine can resolve
unambiguously are legal.

### 3.3 Queen

A queen has all rook routes and all bishop routes.

### 3.4 King

A king moves one transported orthogonal or diagonal step. The destination must
exist, must not be occupied by a friendly piece, and must not be attacked by an
opposing piece after the move.

### 3.5 Knight

A knight moves by transported two-plus-one local routes: two transported
orthogonal steps in one direction, then one transported orthogonal step
perpendicular to that direction, or the same steps in the opposite order.

Intervening occupied squares do not block a knight. Missing successors, removed
tiles, or cuts that make the local route impossible invalidate that route. If
multiple local routes land on the same destination, that destination is still one
legal move. If routes land on different destinations, each destination is treated
as a separate possible knight move.

### 3.6 Pawn

White and Black each have a side-specific forward direction. On the ordinary
8 by 8 board, White moves toward decreasing row numbers and Black moves toward
increasing row numbers.

A pawn's one-step advance follows `surfaceSuccessor` in its current forward
direction and is legal only if the destination is empty. A pawn's first two-step
advance applies the same transported forward route twice and is legal only if
both reached squares exist and are empty.

A pawn captures by moving diagonally forward. The forward component is the
side-specific forward direction; the lateral component is left or right, with
both components transported through glue. The destination must contain an
opposing piece, except for en passant.

The pawn's forward direction is transported by glued edges. After a pawn crosses
glue, later pawn movement continues from the board's global side direction for
that side when choosing a new move, while the route of each individual move uses
the transported direction within that move.

## 4. Preserved Special Moves on Glued Boards

### 4.1 Promotion

On the standard 8 by 8 board, White promotes on row 1 and Black promotes on
row 8. On a glued-boundary board, promotion also happens at a generalized
promotion boundary for that side: a pawn promotes when it reaches a square that
has no legal one-step forward successor for that side, or when it reaches the
side's classical far rank if that rank exists.

Promotion choices remain queen, rook, bishop, or knight of the same side.

### 4.2 En Passant

En passant is preserved whenever the immediately preceding move was an
unambiguous two-step pawn advance from that pawn's starting position.

For a transported two-step route, the intermediate square and destination are
recorded. On the next move only, an opposing pawn may capture en passant if one
of its legal transported diagonal-forward capture routes lands on the recorded
intermediate square and the captured pawn is the pawn that just advanced two
steps. The capturing pawn moves to the intermediate square, and the advanced pawn
is removed from its destination square.

If the two-step route is ambiguous, self-intersecting in a way that makes the
intermediate square unclear, or cannot be reconstructed from the current glued
surface, en passant is not available for that move.

### 4.3 Castling

Castling is preserved for square boards whose back-rank geometry gives an
unambiguous king-rook route.

For the standard 8 by 8 setup:

- White king starts on e1, rooks on a1 and h1.
- Black king starts on e8, rooks on a8 and h8.
- Kingside castling moves the king two transported orthogonal steps toward the
  h-file rook, and the rook moves to the square crossed by the king.
- Queenside castling moves the king two transported orthogonal steps toward the
  a-file rook, and the rook moves to the square crossed by the king.

On a glued-boundary board, the same castling rights and safety tests apply:

- The king and selected rook must still have castling rights.
- The route between them must be unobstructed.
- The king must not start in check.
- The king's crossed square and destination square must not be attacked.
- The king route, rook route, crossed square, and destination must be
  unambiguous under transported `surfaceSuccessor` movement.

If glue makes a castling route ambiguous, disconnected, cyclic before reaching
the rook, or otherwise unlike a clear same-rank king-rook route, that castling
attempt is illegal. The implementation should reject the attempt rather than
inventing a replacement castling geometry.

## 5. Rule Boundaries for This Minigame

The goal is to preserve FIDE-core gameplay on square glued-boundary surfaces.
The implementation should model ordinary legal moves, captures, check,
checkmate, stalemate, promotion, en passant, castling, and impossible-checkmate
draws.

The implementation does not need to model tournament administration. In
particular, the following are out of scope until explicitly requested:

- Chess clocks and flag-fall.
- Touch-move and move-completion disputes.
- Arbiters, appeals, penalties, and illegal-move penalties.
- Scoresheets and notation requirements.
- Draw offers.
- Threefold/fivefold repetition claims or automatic repetition termination.
- Fifty-move/seventy-five-move claims or automatic termination.
- Any rated-play, title, pairing, or competition-specific procedures.
