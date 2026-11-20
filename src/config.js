  /* ---------- settings ---------- */
  const PLAYER_PAGE_BAR_SPACE = '88px';          // space the player page keeps free for the bar until it's measured (follows the bar size)
  const ANIM_MS = 700;                           // player page open / background fade-out duration
  const FADE_IN_MS = 280;                        // how fast the page comes back after closing the player
  const ANIM_EASE = 'cubic-bezier(.16, 1, .3, 1)'; // expo-out: fast start, long soft landing
  const SLIDE_FROM = '12vh';                     // how far from the bar's side the player page starts its slide
  const CLOSE_MS = 320;                          // player page close toward a top / left / right bar
  const CLOSE_EASE = 'cubic-bezier(.4, 0, 1, 1)'; // ease-in: leaves gently, then goes
  const POP_OPEN_MS = 560;                       // left / right bar: the player page grows out of the bar's art
  const POP_CLOSE_MS = 360;                      // ...and goes back into it
  const MINI_ART_FADE_MS = 450;                  // mobile: fade-in of YTM's own mini art after the player page closes
  const MINI_ART_DELAY_MS = 400;                 // ...starting this long after the page reports closed
  const CIRCLE_DELAY_MS = 300;                   // art circle: the bar bounces this long after the player page starts to open
  const CIRCLE_BOUNCE_MS = 520;                  // ...the bounce away from the bar's edge and back
  const CIRCLE_BOUNCE_PX = 16;                   // ...how far it goes
  const CIRCLE_GROW_MS = 900;                    // ...the circle growing until it covers the page
  const CIRCLE_BLUR = 90;                        // ...how blurred the art is (px)
  const CIRCLE_SHRINK_MS = 650;                  // ...the circle shrinking back into the bar when the page closes
  const CIRCLE_CATCH_MS = 380;                   // ...the bar catching it (a small push into its edge and back)
  const CIRCLE_CATCH = 0.45;                     // ...how far, as a part of CIRCLE_BOUNCE_PX
  const CIRCLE_FADE_MS = 800;                    // ...fade to the next song's art
  const CIRCLE_SPIN_S = 40;                      // ...seconds per turn of the blurred art
  const VINYL_SPIN = [0, 40, 16, 1.8];           // vinyl: seconds per turn for the Spin choice (0 = still; 1.8 s = 33⅓ rpm)

