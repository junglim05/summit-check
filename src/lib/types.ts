export type StoneShape = "rect" | "tall" | "natural" | "pillar";

export interface Mountain {
  id: number;
  slug: string;
  name: string;
  region: "서울" | "경기";
  district: string | null;
  elevation_m: number;
  lat: number;
  lng: number;
  radius_m: number;
  stone_shape: StoneShape;
}

export interface Summit {
  id: string;
  user_id: string;
  mountain_id: number;
  photo_path: string;
  method: "live" | "exif";
  lat: number;
  lng: number;
  distance_m: number;
  taken_at: string | null;
  created_at: string;
  mountains?: Mountain;
}

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

export interface RankingRow {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  summit_count: number;
  total_elevation: number;
  last_summit_at: string | null;
  rank: number;
}
