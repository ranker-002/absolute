import { bootstrap } from './core/bootstrap.js';
import { DNA } from './core/dna.js';
import { IntentEngine } from './core/intent_engine.js';
import { Transformer } from './core/transformer.js';
import { UniversalMemory } from './memory/store.js';
import { SkillActivator } from './core/skill_activator.js';
import { EvolutionLoop } from './core/evolution_loop.js';
import { LLMEngine } from './core/llm_engine.js';
import readline from 'readline';

class Ultimate {
  constructor() {
    this.intent = new IntentEngine();
    this.transformer = new Transformer();
    this.memory = new UniversalMemory();
    this.skills = new SkillActivator();
    this.evolution = new EvolutionLoop();
    this.llm = new LLMEngine();
  }

  async boot() {
    await bootstrap();
    this.dna = await DNA.load();
    await this.memory.restore();
    this.displayPreflight();
    this.displayIdentity();
    this.startLoop();
  }

  displayPreflight() {
    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    if (!hasKey) {
      console.log("⚠ API key absente: configure ANTHROPIC_API_KEY ou CLAUDE_API_KEY (.env supporté).");
    }
  }

  displayIdentity() {
    const dna = this.dna;
    console.log('\n' + '═'.repeat(50));
    console.log(`  ⚡ ULTIMATE — ${dna.data.identity.version}`);
    console.log(`  Forme : ${dna.currentForm}`);
    console.log(`  Mutations : ${dna.mutations}`);
    console.log(`  Skills actifs : ${dna.activeSkills.length > 0 ? dna.activeSkills.join(', ') : 'état de base'}`);
    console.log('═'.repeat(50) + '\n');
  }

  startLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'YOU → '
    });

    rl.prompt();


    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input === '/quit' || input === '/exit') {
        console.log('\nULTIMATE se met en veille.\n');
        process.exit(0);
      }

      if (input === '/status') {
        this.displayIdentity();
        rl.prompt();
        return;
      }

      rl.pause();

      try {
        const output = await this.processInput(input);
        if (output) {
          console.log(`\nULTIMATE → ${output}\n`);
        }
      } catch (err) {
        console.error(`\n⚠ Erreur : ${err.message}\n`);
      }

      if (!rl.closed) {
        rl.resume();
        rl.prompt();
      }
    });
  }

  async processInput(userMessage) {
    const memoryContext = this.memory.getRecentContext(5);
    const intent = await this.intent.perceive(userMessage, memoryContext);

    if (intent.transformationNeeded) {
      console.log(`\n⚡ Transformation détectée → ${intent.targetForm}`);
      await this.transformer.transformSelf(intent.targetForm, intent);
      return null;
    }

    for (const skill of intent.requiredSkills) {
      await this.skills.activate(skill, intent);
    }

    const activeSkillContext = this.skills.getActiveContext();
    const systemPrompt =
      this.llm.buildDefaultSystemPrompt() +
      (activeSkillContext ? `\n\nSKILLS ACTIFS :\n${activeSkillContext}` : '');

    const recentMemory = this.memory.getRecentContext(8);
    const messages = [
      ...recentMemory
        .filter((m) => m.key === 'interaction')
        .flatMap((m) => [
          { role: 'user', content: m.value.input },
          { role: 'assistant', content: m.value.output }
        ]),
      { role: 'user', content: userMessage }
    ];

    const response = await this.llm.generate({
      systemPrompt,
      messages,
      maxTokens: 4096
    });

    await this.memory.remember('interaction', { input: userMessage, output: response });
    await this.dna.logInteraction();

    this.evolution
      .analyze({ input: userMessage, output: response, skills: intent.requiredSkills })
      .catch(() => {});

    return response;
  }
}

const ultimate = new Ultimate();
ultimate.boot().catch((err) => {
  console.error('Erreur fatale au démarrage :', err);
  process.exit(1);
});
