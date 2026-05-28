import { LLMEngine } from './llm_engine.js';
import { SnapshotManager } from './snapshot.js';
import { SystemTools } from './system_tools.js';
import { DNA } from './dna.js';
import { logger } from './logger.js';
import { TestRunner } from './test_runner.js';
import { EvolutionMemory } from './evolution_memory.js';
import { GitIntegration } from './git_integration.js';
import type { Intent } from './types.js';

const llm = new LLMEngine();
const snapshots = new SnapshotManager();
const sys = new SystemTools();
const testRunner = new TestRunner();
const evolutionMemory = new EvolutionMemory();
const git = new GitIntegration();

type TransformationResult = {
  files: Record<string, string>;
  newDependencies?: string[];
  newEntryPoint?: string;
  transformationSummary?: string;
};

const MAX_SELF_CORRECTION_ATTEMPTS = 3;

export class Transformer {
  private lastTransformationId: string | null = null;

  async init(): Promise<void> {
    await evolutionMemory.load();
    await git.init();
  }

  async transformSelf(targetForm: string, intent: Intent): Promise<void> {
    logger.info('Transformer', `Starting transformation: ${targetForm}`);

    if (!evolutionMemory.shouldRetry(targetForm)) {
      const maxRetry = evolutionMemory.getMaxRetryCount(targetForm);
      logger.warn('Transformer', `Max retries (${MAX_SELF_CORRECTION_ATTEMPTS}) reached for "${targetForm}"`);
      throw new Error(`Transformation "${targetForm}" has failed ${maxRetry} times. Try a different approach.`);
    }

    const snapshotId = await snapshots.createSnapshot(`pre-transform-to-${targetForm}`);
    const startTime = Date.now();

    const attempt = await evolutionMemory.recordAttempt({
      targetForm,
      status: 'failure',
      duration: 0,
      filesChanged: 0,
      lessons: [],
      retryCount: evolutionMemory.getMaxRetryCount(targetForm) + 1
    });

    this.lastTransformationId = attempt.id;

    try {
      // Step 1: Generate code
      logger.info('Transformer', 'Step 1/5: Generating code...');
      const codebase = await sys.readEntireCodebase();
      const dna = DNA.getInstance();
      const raw = await llm.generate({
        systemPrompt: 'You are a TypeScript code generator. Reply only in valid JSON.',
        userPrompt: llm.buildTransformationPrompt(codebase, targetForm, intent, dna),
        maxTokens: 16000
      });

      let newCode: TransformationResult;
      try {
        newCode = JSON.parse(this.cleanJSON(raw)) as TransformationResult;
      } catch (parseErr) {
        const error = `Invalid JSON from LLM: ${(parseErr as Error).message}`;
        await this.recordFailure(attempt.id, error, startTime, snapshotId, 0);
        throw new Error(error);
      }

      if (!newCode.files || !newCode.files['index.ts']) {
        const error = 'LLM did not generate index.ts — invalid transformation';
        await this.recordFailure(attempt.id, error, startTime, snapshotId, 0);
        throw new Error(error);
      }

      // Step 2: Validate syntax
      logger.info('Transformer', 'Step 2/5: Validating syntax...');
      let validFiles = 0;
      for (const [filePath, content] of Object.entries(newCode.files)) {
        if (filePath.endsWith('.ts')) {
          const valid = await sys.validateTypeScript(content);
          if (!valid) {
            const error = `Invalid TypeScript in: ${filePath}`;
            await this.recordFailure(attempt.id, error, startTime, snapshotId, Object.keys(newCode.files).length);
            throw new Error(error);
          }
        } else if (filePath.endsWith('.js')) {
          const valid = await sys.validateJavaScript(content);
          if (!valid) {
            const error = `Invalid JavaScript in: ${filePath}`;
            await this.recordFailure(attempt.id, error, startTime, snapshotId, Object.keys(newCode.files).length);
            throw new Error(error);
          }
        }
        validFiles++;
      }

      // Step 2: Install dependencies
      logger.info('Transformer', 'Step 2/5: Installing dependencies...');
      if (newCode.newDependencies?.length) {
        await sys.installDependencies(newCode.newDependencies);
      }

      // Step 3: Write files
      logger.info('Transformer', 'Step 3/5: Writing files...');
      for (const [filePath, content] of Object.entries(newCode.files)) {
        if (
          filePath === 'core/dna.json' ||
          filePath === 'core/dna.ts' ||
          filePath === 'core/snapshot.ts' ||
          filePath.startsWith('memory/')
        ) {
          continue;
        }
        await sys.writeFile(filePath, content);
      }

      // Step 4: Run tests
      logger.info('Transformer', 'Step 4/5: Running tests...');
      const testResult = await testRunner.runAll();

      if (!testResult.passed) {
        logger.warn('Transformer', `Tests failed: ${testResult.errors.join(', ')}`);

        // Self-correction loop
        for (let correctionAttempt = 0; correctionAttempt < MAX_SELF_CORRECTION_ATTEMPTS; correctionAttempt++) {
          logger.info('Transformer', `Self-correction attempt ${correctionAttempt + 1}/${MAX_SELF_CORRECTION_ATTEMPTS}`);

          const correctedCode = await this.selfCorrect(newCode, testResult.errors, targetForm);
          if (!correctedCode) break;

          // Write corrected files
          for (const [filePath, content] of Object.entries(correctedCode.files)) {
            if (filePath === 'core/dna.json' || filePath === 'core/dna.ts' || filePath === 'core/snapshot.ts' || filePath.startsWith('memory/')) continue;
            await sys.writeFile(filePath, content);
          }

          const retryResult = await testRunner.runAll();
          if (retryResult.passed) {
            newCode.files = correctedCode.files;
            newCode.transformationSummary = (newCode.transformationSummary || '') + ` [self-corrected ${correctionAttempt + 1} times]`;
            break;
          }
        }

        const finalTests = await testRunner.runAll();
        if (!finalTests.passed) {
          await snapshots.rollback(snapshotId);
          await this.recordFailure(attempt.id, `Tests failed after ${MAX_SELF_CORRECTION_ATTEMPTS} correction attempts`, startTime, snapshotId, Object.keys(newCode.files).length);
          git.commitRollback(snapshotId);
          throw new Error(`Transformation failed: tests still failing after self-correction`);
        }
      }

      // Step 5: Update DNA and commit
      logger.info('Transformer', 'Step 5/5: Finalizing...');
      const previousForm = dna.currentForm;
      await dna.incrementMutations({
        type: 'self_transformation',
        from: previousForm,
        to: targetForm,
        summary: newCode.transformationSummary || ''
      });

      dna.data.identity.currentForm = targetForm;
      dna.data.memory.transformation_history.push({
        timestamp: Date.now(),
        from: previousForm,
        to: targetForm
      });
      await dna.save();

      // Git commit
      await git.commitTransformation(targetForm, newCode.transformationSummary || `Transformed to ${targetForm}`);

      // Record success
      const duration = Date.now() - startTime;
      await evolutionMemory.updateAttempt(attempt.id, {
        status: 'success',
        duration,
        testsPassed: true,
        filesChanged: Object.keys(newCode.files).length,
        snapshotId
      });

      logger.info('Transformer', `Transformation complete: ${previousForm} → ${targetForm} (${duration}ms)`);

      // Relaunch
      await sys.relaunchSelf(newCode.newEntryPoint || 'index.ts');
    } catch (error) {
      logger.error('Transformer', `Transformation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async selfCorrect(
    originalCode: TransformationResult,
    errors: string[],
    targetForm: string
  ): Promise<TransformationResult | null> {
    try {
      const raw = await llm.generate({
        systemPrompt: 'You fix code errors. Reply only in valid JSON.',
        userPrompt: `Fix these errors in the generated code for "${targetForm}":
Errors: ${JSON.stringify(errors)}
Current files: ${JSON.stringify(Object.keys(originalCode.files))}
${Object.entries(originalCode.files).map(([p, c]) => `\n=== ${p} ===\n${c.substring(0, 2000)}`).join('\n')}

Return the corrected JSON with all files fixed.`,
        maxTokens: 16000
      });

      return JSON.parse(this.cleanJSON(raw)) as TransformationResult;
    } catch (err) {
      logger.error('Transformer', `Self-correction failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async recordFailure(
    attemptId: string,
    error: string,
    startTime: number,
    snapshotId: string,
    filesChanged: number
  ): Promise<void> {
    await evolutionMemory.updateAttempt(attemptId, {
      status: 'failure',
      duration: Date.now() - startTime,
      error,
      snapshotId,
      filesChanged,
      lessons: [error]
    });
  }

  cleanJSON(raw: string): string {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  getEvolutionMemory(): EvolutionMemory {
    return evolutionMemory;
  }

  getGit(): GitIntegration {
    return git;
  }
}
