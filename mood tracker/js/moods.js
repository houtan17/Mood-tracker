/* ============================================
   MOOD DEFINITIONS
   To change moods: edit the array below.
   level 1 = best mood ... level 5 = worst mood
   Colors live in css/variables.css (--mood-N-*)
   ============================================ */

var Moods = {
  COUNT: 5,

  list: [
    { emoji: "\u{1F604}", colorVar: "mood-1" },
    { emoji: "\u{1F642}", colorVar: "mood-2" },
    { emoji: "\u{1F610}", colorVar: "mood-3" },
    { emoji: "\u{1F641}", colorVar: "mood-4" },
    { emoji: "\u{1F61E}", colorVar: "mood-5" }
  ],

  get: function (level) {
    return this.list[level - 1] || null;
  },

  emojiOf: function (level) {
    var m = this.get(level);
    return m ? m.emoji : "";
  }
};
