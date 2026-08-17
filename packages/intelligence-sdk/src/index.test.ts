import { describe, expect, it, vi } from 'vitest';

import { OpenAICompatibleIntelligenceProvider } from './index.js';

describe('OpenAICompatibleIntelligenceProvider', () => {
  it('requests an OpenAI-compatible endpoint and parses HTML/CSS JSON', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  html: '<section class="card">Hello</section>',
                  css: '.card { display: grid; }',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAICompatibleIntelligenceProvider(
      { endpoint: 'http://127.0.0.1:8000/v1', model: 'local-model' },
      request,
    );

    const result = await provider.generateHtmlCss({
      documentName: 'Demo',
      node: {
        name: 'Card',
        x: 10,
        y: 20,
        width: 320,
        height: 180,
        borderRadius: 12,
        fill: '#ffffff',
      },
      children: ['Text / Title'],
    });

    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const requestBody = JSON.parse(
      request.mock.calls[0]![1]!.body as string,
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      max_tokens: 4096,
      thinking_budget: 0,
      chat_template_kwargs: { enable_thinking: false },
    });
    const messages = requestBody.messages as Array<{ content: string }>;
    expect(messages[1]!.content).toContain(
      'Generate the HTML and CSS JSON now',
    );
    expect(messages[1]!.content.trimStart()).not.toMatch(/^\{/);
    expect(result).toEqual({
      html: '<section class="card">Hello</section>',
      css: '.card { display: grid; }',
    });
  });

  it('supports a same-origin proxy endpoint', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ html: '<main />', css: '' }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAICompatibleIntelligenceProvider(
      { endpoint: '/omlx-api/v1', model: 'local-model' },
      request,
    );

    await provider.generateHtmlCss({
      documentName: 'Demo',
      node: {
        name: 'Main',
        x: 0,
        y: 0,
        width: 320,
        height: 180,
        borderRadius: 0,
        fill: '#ffffff',
      },
      children: [],
    });

    expect(request).toHaveBeenCalledWith(
      '/omlx-api/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls browser fetch with the global context', async () => {
    let requestContext: unknown;
    const request = vi.fn(function (this: unknown) {
      requestContext = this;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ html: '<main />', css: '' }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }) as unknown as typeof fetch;
    const provider = new OpenAICompatibleIntelligenceProvider(
      { endpoint: '/omlx-api/v1', model: 'local-model' },
      request,
    );

    await provider.generateHtmlCss({
      documentName: 'Demo',
      node: {
        name: 'Main',
        x: 0,
        y: 0,
        width: 320,
        height: 180,
        borderRadius: 0,
        fill: '#ffffff',
      },
      children: [],
    });

    expect(requestContext).toBe(globalThis);
  });

  it('repairs literal line breaks inside model JSON strings', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"html":"<main>\nHello\n</main>","css":"main {\n  display: grid;\n}"}',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenAICompatibleIntelligenceProvider(
      { endpoint: '/omlx-api/v1', model: 'local-model' },
      request,
    );

    const result = await provider.generateHtmlCss({
      documentName: 'Demo',
      node: {
        name: 'Main',
        x: 0,
        y: 0,
        width: 320,
        height: 180,
        borderRadius: 0,
        fill: '#ffffff',
      },
      children: [],
    });

    expect(result.html).toBe('<main>\nHello\n</main>');
    expect(result.css).toContain('display: grid');
  });
});
