export interface SGDBGame {
  id: number;
  name: string;
  release_date?: string;
  types?: string[];
}

export interface SGDBGrid {
  id: number;
  url: string;
  thumb: string;
  tags?: string[];
  style?: string;
  width: number;
  height: number;
  animated: boolean;
  mime: string;
  language: string;
  score: number;
  lock: boolean;
  epilepsy: boolean;
  upvotes: number;
  downvotes: number;
  author: {
    name: string;
    steam64: string;
    avatar: string;
  };
}

const SGDB_BASE_URL = 'https://www.steamgriddb.com/api/v2';

class SteamGridDBError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'SteamGridDBError';
  }
}

export class SteamGridDBClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${SGDB_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new SteamGridDBError(
        `SteamGridDB API error: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data.data;
  }

  async searchGames(query: string): Promise<SGDBGame[]> {
    try {
      const games = await this.request<SGDBGame[]>(`/search/autocomplete/${encodeURIComponent(query)}`);
      return games || [];
    } catch (error) {
      console.error('Failed to search games:', error);
      return [];
    }
  }

  async getGameGrids(gameId: number, types: string[] = ['static']): Promise<SGDBGrid[]> {
    try {
      const typeParam = types.join(',');
      const grids = await this.request<SGDBGrid[]>(`/grids/game/${gameId}?types=${typeParam}&nsfw=false&humor=false`);
      return grids || [];
    } catch (error) {
      console.error('Failed to get game grids:', error);
      return [];
    }
  }
}