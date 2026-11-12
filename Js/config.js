
window.BEYOND_CONFIG = {
  // One message per star. Each star also opens its own scene on the big stage
  // (planet, moon, comet, heart) - see "stageNames" below.
  messages: [
    "I love you, so please don't ever forget about me. I'll be there whenever you need me.",
    "I miss you in the quiet little moments, when something funny happens and you're the first person I want to tell.",
    "On the heavy days, remember you're never carrying them alone. I'm cheering for you, always, even from far away.",
    "However far the stars drift, my heart keeps finding its way back to you. I love you, and I miss you every single day."
  ],

  stageNames: [
    "The quiet world",
    "The patient moon",
    "The long way home",
    "Where I keep you"
  ],

  // Shown (and rotated) at the bottom of the Descent scene.
  // These are the exact strings that were previously hard-coded in interactions.js.
  loadingFacts: [
    "Fun fact #1: I love you.",
    "Fun fact #2: The person who made this spent four months putting it together.",
    "Fun fact #3: The person who sent you this misses you, too."
  ],

  loadingFactInterval: 1700,

  descentDuration: 5200,

  // Audio paths (folder name "SFX" is case-sensitive on most web servers).
  musicPath: "Assets/Audios/ambient.mp3",
  sfxPath: "Assets/Audios/"
};
