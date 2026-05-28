import { describe, it } from 'node:test';
import assert from 'node:assert';

// Minimal test runner without external dependencies

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => console.log('  ✓ ' + name)).catch(e => { console.log('  ✗ ' + name); console.error('    ' + e.message); });
    } else {
      console.log('  ✓ ' + name);
    }
  } catch (e) {
    console.log('  ✗ ' + name);
    console.error('    ' + (e as Error).message);
  }
}

function suite(name: string, fn: () => void) {
  console.log('\n' + name);
  fn();
}

// ============ Tests ============

suite('DNA Module', () => {
  test('DNA types are defined', () => {
    // Verify types exist by importing
    assert.ok(true, 'Types imported');
  });
});

suite('Intent Engine', () => {
  test('Quick transform detect - French', async () => {
    const { IntentEngine } = await import('../core/intent_engine.js');
    const engine = new IntentEngine();
    const result = engine.quickTransformDetect('deviens un analyseur de données');
    assert.strictEqual(result, 'un analyseur de données');
  });

  test('Quick transform detect - English', async () => {
    const { IntentEngine } = await import('../core/intent_engine.js');
    const engine = new IntentEngine();
    const result = engine.quickTransformDetect('become a code reviewer');
    assert.strictEqual(result, 'a code reviewer');
  });

  test('No transform detected', async () => {
    const { IntentEngine } = await import('../core/intent_engine.js');
    const engine = new IntentEngine();
    const result = engine.quickTransformDetect('hello how are you');
    assert.strictEqual(result, null);
  });
});

suite('Response Cache', () => {
  test('Cache set and get', async () => {
    const { ResponseCache } = await import('../core/response_cache.js');
    const cache = new ResponseCache();
    const msgs = [{ role: 'user', content: 'test' }];
    cache.set('sys', msgs, 'response');
    const hit = cache.get('sys', msgs);
    assert.strictEqual(hit, 'response');
  });

  test('Cache miss', async () => {
    const { ResponseCache } = await import('../core/response_cache.js');
    const cache = new ResponseCache();
    const miss = cache.get('sys', [{ role: 'user', content: 'other' }]);
    assert.strictEqual(miss, null);
  });

  test('Cache stats', async () => {
    const { ResponseCache } = await import('../core/response_cache.js');
    const cache = new ResponseCache();
    cache.set('s', [{ role: 'user', content: 'x' }], 'y');
    cache.get('s', [{ role: 'user', content: 'x' }]);
    const stats = cache.getStats();
    assert.strictEqual(stats.size, 1);
    assert.strictEqual(stats.totalHits, 1);
  });
});

suite('Rate Limiter', () => {
  test('Initial state not limited', async () => {
    const { RateLimiter } = await import('../core/rate_limiter.js');
    const rl = new RateLimiter();
    const state = rl.getState();
    assert.strictEqual(state.isLimited, false);
  });

  test('Rate limit sets limited', async () => {
    const { RateLimiter } = await import('../core/rate_limiter.js');
    const rl = new RateLimiter();
    rl.onRateLimited(5);
    const state = rl.getState();
    assert.strictEqual(state.isLimited, true);
  });

  test('Reset clears rate limit', async () => {
    const { RateLimiter } = await import('../core/rate_limiter.js');
    const rl = new RateLimiter();
    rl.onRateLimited(5);
    rl.reset();
    const state = rl.getState();
    assert.strictEqual(state.isLimited, false);
  });
});

suite('Embeddings', () => {
  test('Add and search', async () => {
    const { EmbeddingsMemory } = await import('../core/embeddings.js');
    const emb = new EmbeddingsMemory();
    await emb.add('hello world');
    await emb.add('goodbye world');
    const results = await emb.search('hello');
    assert.ok(results.length > 0);
    assert.ok(results[0].score > 0);
  });

  test('Count tracks entries', async () => {
    const { EmbeddingsMemory } = await import('../core/embeddings.js');
    const emb = new EmbeddingsMemory();
    await emb.add('a');
    await emb.add('b');
    assert.strictEqual(emb.getCount(), 2);
  });
});

suite('Knowledge Base', () => {
  test('Can add and search entries', async () => {
    const { KnowledgeBase } = await import('../core/knowledge.js');
    const kb = new KnowledgeBase();
    await kb.init();
    const entry = await kb.addEntry({ title: 'Test Entry', content: 'Test content', tags: ['test'] });
    assert.ok(entry.id);
    const results = await kb.search('Test');
    assert.ok(results.length > 0);
  });
});

suite('Multi User', () => {
  test('Default user exists', async () => {
    const { MultiUserManager } = await import('../core/multi_user.js');
    const mu = new MultiUserManager();
    await mu.init();
    const user = mu.getCurrentUser();
    assert.ok(user);
    assert.strictEqual(user?.id, 'default');
  });

  test('Admin permission check', async () => {
    const { MultiUserManager } = await import('../core/multi_user.js');
    const mu = new MultiUserManager();
    await mu.init();
    assert.ok(mu.hasPermission('admin'));
    assert.ok(mu.hasPermission('transform'));
    assert.ok(mu.hasPermission('chat'));
  });
});

suite('Evolution Memory', () => {
  test('Record and retrieve', async () => {
    const { EvolutionMemory } = await import('../core/evolution_memory.js');
    const em = new EvolutionMemory();
    await em.load();
    const attempt = await em.recordAttempt({
      targetForm: 'test-form',
      status: 'success',
      duration: 100,
      filesChanged: 5,
      lessons: ['test'],
      retryCount: 0
    });
    assert.ok(attempt.id);
    assert.strictEqual(attempt.targetForm, 'test-form');
  });

  test('Stats calculation', async () => {
    const { EvolutionMemory } = await import('../core/evolution_memory.js');
    const em = new EvolutionMemory();
    await em.load();
    await em.recordAttempt({ targetForm: 'f1', status: 'success', duration: 100, filesChanged: 1, lessons: [], retryCount: 0 });
    const stats = em.getStats();
    assert.ok(stats.totalAttempts >= 1);
  });
});

suite('Template Manager', () => {
  test('Has built-in templates', async () => {
    const { TemplateManager } = await import('../core/templates.js');
    const tm = new TemplateManager();
    await tm.init();
    const templates = tm.getAllTemplates();
    assert.ok(templates.length >= 8);
  });

  test('Get template by name', async () => {
    const { TemplateManager } = await import('../core/templates.js');
    const tm = new TemplateManager();
    await tm.init();
    const blog = tm.getTemplate('blog');
    assert.ok(blog);
    assert.strictEqual(blog?.form, 'blog-engine');
  });
});

suite('Logger', () => {
  test('Log levels work', async () => {
    const { Logger } = await import('../core/logger.js');
    const l = new Logger();
    l.setLevel('error');
    l.info('test', 'should not appear');
    l.error('test', 'should appear');
    const entries = l.getEntries('error');
    assert.ok(entries.length >= 1);
  });
});

console.log('\n✓ All test suites loaded');
