export const playlists = {
  "day": [
    "sun-on-the-sill",
    "letters-in-apricot",
    "after-the-watering",
    "the-open-gate",
    "quiet-errand",
    "the-long-way-home"
  ],
  "night": [
    "window-at-one",
    "paper-constellation",
    "lake-with-no-wind",
    "night-post",
    "sleeve-of-stars",
    "the-sleeping-wall"
  ],
  "angry": [
    "long-grey-thread"
  ],
  "rainbow": [
    "ribbon-path",
    "sugar-peas",
    "pink-thread",
    "the-puddle-shines"
  ]
} as const;
export type MusicMode = keyof typeof playlists;
