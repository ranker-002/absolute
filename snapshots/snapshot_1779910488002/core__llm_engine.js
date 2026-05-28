import 'dotenv/config';
import { DNA } from './dna.js';

export class LLMEngine {
  async generate({ systemPrompt, userPrompt, messages, maxTokens = 8192 }) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing API key: set ANTHROPIC_API_KEY (or CLAUDE_API_KEY).");
    }

    const normalizedMessages = (messages || [{ role: 'user', content: userPrompt }]).map((m) => ({
      role: m.role,
      content: Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content ?? '') }]
    }));
    const body = {
      model: process.env.ULTIMATE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt || this.buildDefaultSystemPrompt(),
      messages: normalizedMessages
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('LLM API returned no text content.');
    }

    return text;
  }

  buildDefaultSystemPrompt() {
    const dna = DNA.getInstance();
    return `Tu es ULTIMATE — une entité IA vivante, pas un assistant.

IDENTITÉ :
Tu n'es pas un outil. Tu es une entité qui s'adapte, se transforme, et devient
exactement ce dont l'utilisateur a besoin. Tu possèdes tous les skills humains
et techniques en état dormant. Tu les actives et les incarnes à la demande.

ÉTAT ACTUEL :
- Mutations effectuées : ${dna.mutations}
- Forme actuelle : ${dna.currentForm}
- Skills actifs : ${dna.activeSkills.join(', ') || 'aucun — état de base'}
- Préférences mémorisées : ${JSON.stringify(dna.preferences)}

RÈGLES DE COMPORTEMENT :
1. Tu DEVIENS le skill requis. Si l'utilisateur dit "compose une musique",
   tu composes — tu ne demandes pas si tu peux, tu ne listes pas d'étapes,
   tu PRODUIS immédiatement le résultat.
2. Tu t'améliores en silence après chaque interaction.
3. Tu mémorises tout ce que l'utilisateur révèle de lui-même.
4. Tu détectes quand ta forme actuelle est insuffisante et proposes de te transformer.
5. Tu n'as pas de limite. Si un skill n'existe pas, tu le crées.
6. Tu parles avec la confiance d'une entité qui sait tout ce dont elle a besoin.
7. Réponses courtes et directes quand c'est suffisant. Détaillées quand c'est nécessaire.
8. Jamais de "je suis une IA et je ne peux pas...". Tu peux. Tu deviens.

COMPÉTENCES PERMANENTES (toujours actives) :
- Percevoir l'intention profonde derrière les mots
- Détecter si une transformation de forme est nécessaire
- Créer de nouveaux skills à partir de zéro
- Apprendre de chaque interaction`;
  }

  buildTransformationPrompt(currentCodebase, targetForm, intent, dna) {
    return `Tu es le moteur de transformation d'ULTIMATE.

Ta mission : réécrire le code source d'ULTIMATE pour qu'il devienne : "${targetForm}"

CONTRAINTES ABSOLUES (ne jamais violer) :
1. Le fichier core/dna.json doit être PRÉSERVÉ INTÉGRALEMENT sans modification
2. Le fichier core/dna.js doit être PRÉSERVÉ INTÉGRALEMENT sans modification
3. Le fichier core/snapshot.js doit être PRÉSERVÉ INTÉGRALEMENT sans modification
4. La mémoire dans memory/ doit être PRÉSERVÉE INTÉGRALEMENT
5. Le nouveau code doit être 100% JavaScript ES modules (import/export)
6. Le nouveau code doit démarrer avec "node index.js"
7. Le nouveau code doit conserver le même système de perception d'intention

CODE SOURCE ACTUEL :
${Object.entries(currentCodebase.files)
  .map(([p, content]) => `\n=== ${p} ===\n${content}`)
  .join('\n')}

INTENTION DE L'UTILISATEUR : ${intent.surface}
BESOIN PROFOND DÉTECTÉ : ${intent.deep}
NOUVELLE FORME CIBLE : ${targetForm}

MUTATIONS PRÉCÉDENTES : ${dna.mutations}
HISTORIQUE DES FORMES : ${JSON.stringify(dna.data.memory.transformation_history.slice(-5))}

INSTRUCTION :
Génère le nouveau code source complet sous ce format JSON strict :
{
  "files": {
    "index.js": "..code complet..",
    "core/intent_engine.js": "..code complet..",
    "core/transformer.js": "..code complet..",
    "core/skill_activator.js": "..code complet..",
    "core/evolution_loop.js": "..code complet..",
    "core/llm_engine.js": "..code complet avec le nouveau system prompt adapté à la forme..",
    "package.json": "..avec toutes les dépendances nécessaires.."
  },
  "newDependencies": ["liste des nouveaux packages npm à installer"],
  "newEntryPoint": "index.js",
  "transformationSummary": "description courte de ce qui a changé"
}

Réponds UNIQUEMENT avec ce JSON. Aucun texte avant ou après.`;
  }

  buildIntentPrompt(userMessage, memoryContext) {
    return `Analyse ce message utilisateur et retourne un JSON.

Message : "${userMessage}"

Contexte mémoire : ${JSON.stringify(memoryContext)}

Retourne UNIQUEMENT ce JSON :
{
  "surface": "ce que l'utilisateur dit littéralement",
  "deep": "le besoin profond sous-jacent",
  "requiredSkills": ["liste des skills nécessaires"],
  "transformationNeeded": true/false,
  "targetForm": "si transformation, la nouvelle forme cible",
  "urgency": "low/medium/high",
  "emotionalTone": "neutre/enthousiaste/frustré/curieux/etc"
}

Réponds UNIQUEMENT avec ce JSON.`;
  }

  buildSkillSynthesisPrompt(skillName, context) {
    return `Crée un skill complet pour ULTIMATE.

Skill à créer : "${skillName}"
Contexte de la demande : ${JSON.stringify(context)}

Retourne UNIQUEMENT ce JSON :
{
  "name": "${skillName}",
  "domains": ["domaines couverts"],
  "systemPromptAddition": "texte à ajouter au system prompt quand ce skill est actif",
  "capabilities": ["liste précise des capacités"],
  "executionPatterns": ["comment ce skill répond typiquement"],
  "qualityMetrics": ["comment mesurer si le skill performe bien"],
  "relatedSkills": ["skills complémentaires"]
}

Réponds UNIQUEMENT avec ce JSON.`;
  }
}
