export const getSortedPlayers = (players: any[], gameType: string) => {
  return [...players].sort((a, b) => {
    // 1. Primary Sort: Higher Score (Solved count) - Universal for most games
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }

    // 2. Secondary Sort: Based on Game Type
    if (gameType === "WORDLE") {
      // For Wordle: Lower time first, then fewer tries
      const timeDiff = (a.stats?.timeElapsedSeconds || 0) - (b.stats?.timeElapsedSeconds || 0);
      if (timeDiff !== 0) return timeDiff;
      return (a.stats?.tries || 0) - (b.stats?.tries || 0);
    } 
    
    if (gameType === "SUDOKU") {
      // For Sudoku: Maybe completion percentage?
      return (b.stats?.percentSolved || 0) - (a.stats?.percentSolved || 0);
    }

    return 0;
  });
};