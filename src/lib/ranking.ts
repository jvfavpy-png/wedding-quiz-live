export interface RankableParticipant {
  id: string;
  name: string;
  score: number;
  joinedAt: string | number;
}

export interface RankedParticipant extends RankableParticipant {
  rank: number;
}

export function rankParticipants(participants: RankableParticipant[]): RankedParticipant[] {
  return [...participants]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
}
