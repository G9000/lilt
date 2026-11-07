export const PLAYER_KEY = 'lilt.room.player';
export const PLAYERS = [
  { id: 'cassette', name: 'Cream cassette' },
  { id: 'boombox', name: 'Sage boombox' },
  { id: 'radio', name: 'Walnut radio' },
  { id: 'turntable', name: 'Record player' },
] as const;
export type Player = typeof PLAYERS[number]['id'];
export const readPlayer = (raw: string | null): Player => PLAYERS.find(player => player.id === raw)?.id ?? 'cassette';
export const playerImage = (player: Player) => `room/players/${player}.png`;
