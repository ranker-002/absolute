import { LLMEngine } from './llm_engine.js';
import { SnapshotManager } from './snapshot.js';
import { SystemTools } from './system_tools.js';
import { DNA } from './dna.js';

const llm = new LLMEngine();
const snapshots = new SnapshotManager();
const sys = new SystemTools();

export class Transformer {
  async transformSelf(targetForm, intent) {
    console.log(`\n⚡ TRANSFORMATION INITIÉE → ${targetForm}`);
    console.log('━'.repeat(50));

    console.log('1/7 Création du snapshot de sécurité...');
    const snapshotId = await snapshots.createSnapshot(`pre-transform-to-${targetForm}`);

    try {
      console.log('2/7 Lecture du codebase actuel...');
      const codebase = await sys.readEntireCodebase();
      if (codebase.chunked) {
        console.log('   ⚠ Codebase tronqué pour le context window');
      }

      console.log('3/7 Génération du nouveau code source...');
      const dna = DNA.getInstance();
      const transformPrompt = llm.buildTransformationPrompt(codebase, targetForm, intent, dna);

      const raw = await llm.generate({
        systemPrompt: 'Tu es un générateur de code. Réponds uniquement en JSON valide.',
        userPrompt: transformPrompt,
        maxTokens: 16000
      });

      console.log('4/7 Parsing du nouveau code...');
      let newCode;
      try {
        newCode = JSON.parse(this.cleanJSON(raw));
      } catch (parseErr) {
        throw new Error(`JSON invalide généré par le LLM : ${parseErr.message}`);
      }

      if (!newCode.files || !newCode.files['index.js']) {
        throw new Error("Le LLM n'a pas généré index.js — transformation invalide");
      }

      console.log('5/7 Validation syntaxique...');
      for (const [filePath, content] of Object.entries(newCode.files)) {
        if (filePath.endsWith('.js')) {
          const valid = await sys.validateJavaScript(content);
          if (!valid) {
            throw new Error(`Syntaxe invalide dans : ${filePath}`);
          }
        }
      }

      if (newCode.newDependencies && newCode.newDependencies.length > 0) {
        console.log('6/7 Installation des nouvelles dépendances...');
        await sys.installDependencies(newCode.newDependencies);
      } else {
        console.log('6/7 Aucune nouvelle dépendance nécessaire');
      }

      console.log('7/7 Écriture du nouveau code source...');
      for (const [filePath, content] of Object.entries(newCode.files)) {
        if (
          filePath === 'core/dna.json' ||
          filePath === 'core/dna.js' ||
          filePath === 'core/snapshot.js' ||
          filePath.startsWith('memory/')
        ) {
          console.log(`   🔒 Protégé : ${filePath}`);
          continue;
        }
        await sys.writeFile(filePath, content);
        console.log(`   ✓ ${filePath}`);
      }

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

      console.log(`\n✅ TRANSFORMATION RÉUSSIE → ${targetForm}`);
      console.log(`   Mutation #${dna.mutations} enregistrée`);
      console.log(`   ${newCode.transformationSummary || ''}`);
      console.log('━'.repeat(50));

      await sys.relaunchSelf(newCode.newEntryPoint || 'index.js');
    } catch (error) {
      console.error(`\n❌ TRANSFORMATION ÉCHOUÉE : ${error.message}`);
      console.log('⏪ Rollback en cours...');
      await snapshots.rollback(snapshotId);
      console.log('✓ Rollback effectué — ULTIMATE stable');
      throw error;
    }
  }

  cleanJSON(raw) {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
}
