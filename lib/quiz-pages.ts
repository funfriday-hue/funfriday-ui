export type QuizPageConfig = {
  slug: string;
  name: string;
  icon: string;
  gameType: "QUIZ_ROYALE" | "WORDLE" | "SUDOKU" | "CROSSWORD";
  quizCategory?:
    "CRICKET" | "FOOTBALL" | "BOLLYWOOD" | "WWE" | "INDIA" | "CHESS";
  description: string;
  singlePlayerDescription: string;
  multiplayerDescription: string;
  seoHeading: string;
  seoParagraphs: string[];
  keywords: string[];
};

export const QUIZ_PAGES: QuizPageConfig[] = [
  {
    slug: "cricket-quiz",
    name: "Cricket Quiz",
    icon: "🏏",
    gameType: "QUIZ_ROYALE",
    quizCategory: "CRICKET",
    description:
      "Play cricket quiz questions with friends or take a fast solo cricket challenge on FunFriday.",
    singlePlayerDescription:
      "Answer one cricket question in 60 seconds. Every correct answer earns a point.",
    multiplayerDescription:
      "Create a cricket quiz room, invite friends, and compete live in Quiz Royale.",
    seoHeading: "Play cricket quizzes online with friends",
    seoParagraphs: [
      "FunFriday's cricket quiz brings together questions about players, teams, tournaments, records, captains, and landmark moments in the game.",
      "Start a quick single-player cricket quiz when you have a minute, or create a private multiplayer room to challenge friends in real time.",
    ],
    keywords: [
      "cricket quiz",
      "online cricket quiz",
      "cricket quiz with friends",
    ],
  },
  {
    slug: "football-quiz",
    name: "Football Quiz",
    icon: "⚽",
    gameType: "QUIZ_ROYALE",
    quizCategory: "FOOTBALL",
    description:
      "Play football quiz questions online, solo or in a live multiplayer room with friends.",
    singlePlayerDescription:
      "Take on one football question in a fast 60-second solo challenge.",
    multiplayerDescription:
      "Host a football quiz room and see who knows the game best.",
    seoHeading: "Football quiz games for fans",
    seoParagraphs: [
      "Test your football knowledge across players, clubs, international tournaments, transfers, records, and iconic moments.",
      "Choose a quick solo football quiz for a short challenge or invite friends to a multiplayer Quiz Royale match.",
    ],
    keywords: ["football quiz", "soccer quiz", "football quiz online"],
  },
  {
    slug: "bollywood-quiz",
    name: "Bollywood Quiz",
    icon: "🎬",
    gameType: "QUIZ_ROYALE",
    quizCategory: "BOLLYWOOD",
    description:
      "Play Bollywood quiz games covering films, actors, music, awards, and memorable Hindi cinema moments.",
    singlePlayerDescription:
      "Play one Bollywood question against the clock in a 60-second solo round.",
    multiplayerDescription:
      "Create a Bollywood quiz room and compete with your movie-loving friends.",
    seoHeading: "Bollywood quiz: films, actors and music",
    seoParagraphs: [
      "This Bollywood quiz is built for fans of Hindi cinema—from classic films and performers to songs, awards, directors, and blockbuster moments.",
      "Play a fast solo round or start a private multiplayer Bollywood quiz and settle the movie debate with friends.",
    ],
    keywords: ["Bollywood quiz", "Hindi movie quiz", "Bollywood trivia"],
  },
  {
    slug: "wwe-quiz",
    name: "WWE Quiz",
    icon: "🤼",
    gameType: "QUIZ_ROYALE",
    quizCategory: "WWE",
    description:
      "Play a WWE quiz online with questions about wrestlers, championships, events, and wrestling history.",
    singlePlayerDescription:
      "Take a one-question WWE challenge with 60 seconds on the clock.",
    multiplayerDescription:
      "Host a WWE Quiz Royale room and challenge your friends live.",
    seoHeading: "WWE quiz for wrestling fans",
    seoParagraphs: [
      "Put your wrestling knowledge to work with WWE quiz questions on Superstars, title reigns, Royal Rumble winners, WrestleMania, and historic matches.",
      "Use the single-player mode for a quick challenge or create a multiplayer WWE room for a live contest with friends.",
    ],
    keywords: ["WWE quiz", "wrestling quiz", "WWE trivia"],
  },
  {
    slug: "india-quiz",
    name: "India Quiz",
    icon: "🇮🇳",
    gameType: "QUIZ_ROYALE",
    quizCategory: "INDIA",
    description:
      "Play an India quiz online covering Indian history, geography, culture, leaders, and more.",
    singlePlayerDescription:
      "Play one India quiz question in a short solo challenge.",
    multiplayerDescription:
      "Create an India Quiz Royale room and compete with friends in real time.",
    seoHeading: "India quiz: history, geography and culture",
    seoParagraphs: [
      "Explore an India quiz with questions about the country's states, capitals, history, culture, public life, landmarks, and achievements.",
      "Take a quick solo India quiz or invite friends to a private multiplayer room for a shared trivia challenge.",
    ],
    keywords: ["India quiz", "Indian general knowledge quiz", "India trivia"],
  },
  {
    slug: "chess-quiz",
    name: "Chess Quiz",
    icon: "♟️",
    gameType: "QUIZ_ROYALE",
    quizCategory: "CHESS",
    description:
      "Play a chess quiz online with questions about world champions, tournaments, records, openings, and chess history.",
    singlePlayerDescription:
      "Take on one random chess question in a fast 60-second solo challenge.",
    multiplayerDescription:
      "Create a Chess Quiz Royale room and challenge friends live.",
    seoHeading: "Chess quiz for players and fans",
    seoParagraphs: [
      "Test your chess knowledge with questions about world champions, grandmasters, major tournaments, ratings, records, and landmark games.",
      "Play a fast solo chess quiz or create a private multiplayer room to compete with friends in real time.",
    ],
    keywords: ["chess quiz", "chess trivia", "online chess quiz"],
  },
  {
    slug: "wordle-quiz",
    name: "Wordle Rush",
    icon: "⌨️",
    gameType: "WORDLE",
    description:
      "Play Wordle Rush online: solve five-letter words solo or race friends in a live multiplayer word game.",
    singlePlayerDescription:
      "Create a solo Wordle Rush room and work through the word challenge at your pace.",
    multiplayerDescription:
      "Create a Wordle Rush room or join friends to race through the same words live.",
    seoHeading: "Play Wordle Rush online",
    seoParagraphs: [
      "Wordle Rush is FunFriday's fast word game. Guess five-letter words and use the colour clues to improve each attempt.",
      "Play on your own or bring friends into the same room to race through a shared sequence of word puzzles.",
    ],
    keywords: [
      "Wordle Rush",
      "multiplayer word game",
      "Wordle game with friends",
    ],
  },
  {
    slug: "sudoku-quiz",
    name: "Sudoku",
    icon: "🔢",
    gameType: "SUDOKU",
    description:
      "Play Sudoku online solo or race friends to solve the same logic puzzle in real time.",
    singlePlayerDescription:
      "Create a private solo Sudoku room and solve a classic logic puzzle.",
    multiplayerDescription:
      "Create a Sudoku room or join friends to race through the same board.",
    seoHeading: "Play Sudoku online with friends",
    seoParagraphs: [
      "FunFriday Sudoku gives you a clean online board for a classic logic challenge. Fill every row, column, and box without repeating a number.",
      "Start a private solo game or invite friends to solve the same Sudoku board and compare live progress.",
    ],
    keywords: [
      "Sudoku online",
      "multiplayer Sudoku",
      "Sudoku game with friends",
    ],
  },
  {
    slug: "crossword-quiz",
    name: "Crossword",
    icon: "✏️",
    gameType: "CROSSWORD",
    description:
      "Solve compact themed crosswords solo or race friends on the same clue grid.",
    singlePlayerDescription:
      "Choose a themed crossword and solve it at your own pace.",
    multiplayerDescription:
      "Create a room, share the code, and race friends through the same crossword.",
    seoHeading: "Play themed crossword puzzles online",
    seoParagraphs: [
      "FunFriday Crosswords are compact, themed puzzles built around topics such as cricket, Bollywood, geography, Pokémon, and general knowledge.",
      "Choose a crossword to solve alone or create a private room and compare live progress with friends.",
    ],
    keywords: [
      "crossword online",
      "multiplayer crossword",
      "themed crossword puzzle",
    ],
  },
];

export const QUIZ_PAGE_BY_SLUG = Object.fromEntries(
  QUIZ_PAGES.map((page) => [page.slug, page]),
) as Record<string, QuizPageConfig>;
