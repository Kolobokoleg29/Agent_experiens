// src/stages/niche-selection-stage.ts
import { BaseStage } from './base-stage';
import { PipelineContext, NicheIdea } from '../types';

/**
 * Выбирает одну нишу из context.niches и записывает её в context.selectedNiche.
 *
 * Критерий (детерминированный, без LLM):
 *  - Среди ниш с complexity <= 6 (ограничение, которое ConceptAgent/buildConceptPrompt
 *    в любом случае требует для MVP за 1-2 недели) выбираем нишу с максимальным
 *    значением (monetizationPotential - complexity).
 *  - Если ни одна ниша не удовлетворяет complexity <= 6, берём нишу с минимальной
 *    complexity (наиболее реализуемую) среди всех найденных.
 */
export class NicheSelectionStage extends BaseStage {
  name = 'Niche Selection';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    if (context.selectedNiche) {
      console.log(`⏭️ Stage ${this.name} уже выполнен, пропускаем`);
      return context;
    }

    if (!context.niches || context.niches.length === 0) {
      throw new Error('Список ниш пуст. Сначала выполните NicheHunter.');
    }

    console.log(`🧭 Stage: ${this.name}`);

    const selected = this.selectNiche(context.niches);
    context.selectedNiche = selected;
    context.updatedAt = new Date();
    context.history.push(`Niche selection completed: "${selected.name}"`);

    console.log(`✅ Выбрана ниша: "${selected.name}" (complexity=${selected.complexity}, monetizationPotential=${selected.monetizationPotential})`);
    return context;
  }

  private selectNiche(niches: NicheIdea[]): NicheIdea {
    const feasible = niches.filter(n => n.complexity <= 6);
    const pool = feasible.length > 0 ? feasible : niches;

    if (feasible.length === 0) {
      // Ни одна ниша не укладывается в ограничение сложности — берём самую простую.
      return [...pool].sort((a, b) => a.complexity - b.complexity)[0];
    }

    // Среди подходящих по сложности — максимизируем (монетизация - сложность).
    return [...pool].sort(
      (a, b) => (b.monetizationPotential - b.complexity) - (a.monetizationPotential - a.complexity)
    )[0];
  }
}
