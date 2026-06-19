export type BloodType = '' | 'A' | 'B' | 'AB' | 'O';

export interface PersonInput {
  name: string;
  bloodType: BloodType;
  birthday: string;
}

export interface AnalyzeRequest {
  person: PersonInput;
}

export interface SubScore {
  score: number;
  description: string;
}

export interface AnalysisResult {
  resonance_score: number;
  personality: SubScore;
  wealth: SubScore;
  love: SubScore;
  leadership: SubScore;
  advantage: SubScore;
  blind_spot: SubScore;
  name_energy: string;
  summary: string;
}

export interface ApiError {
  error: string;
}
