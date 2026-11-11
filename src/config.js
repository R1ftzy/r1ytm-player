  /* ---------- settings ---------- */
  const PLAYER_PAGE_BAR_SPACE = '88px';          // space the player page keeps free for the bar until it's measured (follows the bar size)
  const ANIM_MS = 700;                           // player page open / background fade-out duration
  const FADE_IN_MS = 280;                        // how fast the page comes back after closing the player
  const ANIM_EASE = 'cubic-bezier(.16, 1, .3, 1)'; // expo-out: fast start, long soft landing
  const SLIDE_FROM = '12vh';                     // how far from the bar's side the player page starts its slide
  const CLOSE_MS = 320;                          // player page close toward a top / left / right bar
  const CLOSE_EASE = 'cubic-bezier(.4, 0, 1, 1)'; // ease-in: leaves gently, then goes
  const MINI_ART_FADE_MS = 450;                  // mobile: fade-in of YTM's own mini art after the player page closes
  const MINI_ART_DELAY_MS = 400;                 // ...starting this long after the page reports closed
  const VINYL_SPIN = [0, 40, 16, 1.8];           // vinyl: seconds per turn for the Spin choice (0 = still; 1.8 s = 33⅓ rpm)

