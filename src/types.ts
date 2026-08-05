// src/types.ts
//
// GameConcept, NicheIdea, ValidationResult, GameDesignDocument и GameCode
// теперь определены как Zod-схемы в src/schemas.ts (единый источник истины —
// см. P1-4) и просто реэкспортируются отсюда, чтобы не менять импорты по
// всему проекту (`import { GameConcept } from '../types'` продолжает работать).
import type {
  GameConcept,
  NicheIdea,
  ValidationResult,
  GameDesignDocument,
  Economy,
  Production,
  AssetManifest,
  AssetEntry,
  GameCode,
} from './schemas';

export type {
  GameConcept,
  NicheIdea,
  ValidationResult,
  GameDesignDocument,
  Economy,
  Production,
  AssetManifest,
  AssetEntry,
  GameCode,
};

export interface ReviewResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  fixes?: GameCode;
}

export interface MarketData {
  platformStats: PlatformInsights;
}

export interface PlatformInsights {
  trends: string[];
  saturated: string[];
  niches: string[];
}

// === НОВЫЙ ЕДИНЫЙ КОНТЕКСТ ===
export interface PipelineContext {
  userPrompt?: string;
  searchEnabled: boolean;

  market?: MarketData;
  niches?: NicheIdea[];
  selectedNiche?: NicheIdea;
  concept?: GameConcept;
  validation?: ValidationResult;
  gdd?: GameDesignDocument;
  economy?: Economy;
  production?: Production;
  assets?: AssetManifest;
  code?: GameCode;
  review?: ReviewResult;
  /** Путь на диске, куда ProjectWriterStage записал готовый проект (output/games/<slug>). */
  projectPath?: string;

  executionId: string;
  startedAt: Date;
  updatedAt: Date;
  retryCount: number;
  tokenUsage: number;
  errors: string[];
  warnings: string[];
  history: string[];
  metrics: Record<string, any>;

  cache: Map<string, any>;

  saveState?: (context: PipelineContext) => Promise<void>;
}

export function createPipelineContext(userPrompt?: string, searchEnabled = true): PipelineContext {
  return {
    userPrompt,
    searchEnabled,
    executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    startedAt: new Date(),
    updatedAt: new Date(),
    retryCount: 0,
    tokenUsage: 0,
    errors: [],
    warnings: [],
    history: [],
    metrics: {},
    cache: new Map(),
  };
}