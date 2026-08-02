// src/types.ts
export interface GameConcept {
  title: string;
  genre: string;
  description: string;
  mechanics: string[];
  targetAudience: string;
  monetization: {
    ads?: boolean;
    inAppPurchases?: boolean;
    rewardedVideo?: boolean;
  };
  platforms: string[];
}

export interface GameDesign {
  scenes: {
    name: string;
    description: string;
    objects: { type: string; name: string; properties: Record<string, any> }[];
  }[];
  physics?: any;
  uiLayout?: any;
  assets?: string[];
  codeStructure?: string;
}

export interface GameCode {
  files: { path: string; content: string }[];
  mainFile: string;
}

export interface ReviewResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  fixes?: GameCode;
}

export interface AgentContext {
  concept?: GameConcept;
  design?: GameDesign;
  code?: GameCode;
  userPrompt?: string;
  searchEnabled?: boolean;
}

export interface MarketData {
  platformStats: PlatformInsights;
}

export interface PlatformInsights {
  trends: string[];
  saturated: string[];
  niches: string[];
}

export interface NicheIdea {
  name: string;
  description: string;
  whyBlueOcean: string;
  existingGames: string[];
  potentialMechanics: string;
  complexity: number;
  monetizationPotential: number;
}

export interface ValidationResult {
  scores: {
    uniqueness: number;
    feasibility: number;
    retention_potential: number;
    monetization_potential: number;
    moderation_safety: number;
    market_demand: number;
  };
  risks: string[];
  improvements: string[];
  alternatives: string[];
  verdict: 'approved' | 'needs_work' | 'rejected';
  issues?: string[];
}

export interface GameDesignDocument {
  concept: string;
  uniqueness: string;
  targetAudience: {
    persona: string;
    motivation: string;
    painPoints: string[];
  };
  coreLoop: {
    perSecond: string;
    perMinute: string;
    perSession: string;
    progression: string;
  };
  monetization: {
    adFormats: string[];
    iap: string[];
    economy: string;
  };
  technicalArchitecture: {
    scenes: string[];
    entities: any[];
    physics: string;
    saveSystem: string;
  };
  moderationRequirements: string[];
  mvpFeatures: string[];
  risks: { risk: string; mitigation: string }[];
}