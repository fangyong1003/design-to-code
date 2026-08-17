#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import { JsonDesignAdapter } from '@d2c/adapter-json';
import { SketchAdapter } from '@d2c/adapter-sketch';
import { ReactGenerator } from '@d2c/codegen-react';
import type { DesignNode, GeneratedArtifact } from '@d2c/contracts';
import { AdapterRegistry, ConversionPipeline } from '@d2c/core';
import { Command } from 'commander';

const registry = new AdapterRegistry([
  new SketchAdapter(),
  new JsonDesignAdapter(),
]);
const pipeline = new ConversionPipeline(registry);
const reactGenerator = new ReactGenerator();
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();

function countNodes(nodes: DesignNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countNodes(node.children),
    0,
  );
}

function artifactDestination(
  outputRoot: string,
  artifact: GeneratedArtifact,
): string {
  const destination = resolve(outputRoot, artifact.path);
  const localPath = relative(outputRoot, destination);
  if (
    localPath.length === 0 ||
    localPath === '..' ||
    localPath.startsWith('..' + sep) ||
    isAbsolute(localPath)
  ) {
    throw new Error(
      'Generator returned an unsafe artifact path: ' + artifact.path,
    );
  }
  return destination;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeArtifacts(
  outputDirectory: string,
  artifacts: GeneratedArtifact[],
  force: boolean,
): Promise<void> {
  const outputRoot = resolve(invocationDirectory, outputDirectory);
  const destinations = artifacts.map((artifact) => ({
    artifact,
    path: artifactDestination(outputRoot, artifact),
  }));

  if (!force) {
    for (const destination of destinations) {
      if (await pathExists(destination.path)) {
        throw new Error(
          'Refusing to overwrite existing file: ' +
            destination.path +
            '. Pass --force to replace generated files.',
        );
      }
    }
  }

  for (const destination of destinations) {
    if (destination.artifact.content === undefined) {
      throw new Error(
        'Artifact has no writable content: ' + destination.artifact.path,
      );
    }
    await mkdir(dirname(destination.path), { recursive: true });
    await writeFile(destination.path, destination.artifact.content, 'utf8');
  }
}

const program = new Command()
  .name('d2c')
  .description('Local-first, multi-format design-to-code compiler')
  .version('0.1.0');

program
  .command('adapters')
  .description('List registered input adapters')
  .action(() => {
    for (const adapter of registry.list()) {
      console.log(
        adapter.manifest.id +
          '\t' +
          adapter.manifest.displayName +
          '\t' +
          adapter.manifest.supportedExtensions.join(', '),
      );
    }
  });

program
  .command('inspect')
  .description('Parse a source and print a compact Design IR summary')
  .argument('<input>', 'Input design file')
  .action(async (input: string) => {
    const inputPath = resolve(invocationDirectory, input);
    const result = await pipeline.parse(
      { kind: 'file', path: inputPath },
      {
        jobId: 'cli-inspect',
        workspaceDir: invocationDirectory,
      },
    );

    const summary = {
      adapter: result.adapter.manifest.id,
      irVersion: result.document.irVersion,
      source: result.document.source.name,
      pages: result.document.pages.length,
      nodes: result.document.pages.reduce(
        (total, page) => total + countNodes(page.nodes),
        0,
      ),
      components: result.document.components.length,
      assets: result.document.assets.length,
      diagnostics: result.document.diagnostics.length,
    };

    console.log(JSON.stringify(summary, null, 2));
  });

program
  .command('generate')
  .description('Generate React + CSS Modules source from a design input')
  .argument('<input>', 'Input design file')
  .option('-o, --output <directory>', 'Output directory', './generated')
  .option('-f, --force', 'Allow overwriting files in the output directory')
  .action(
    async (
      input: string,
      options: { output: string; force?: boolean },
    ): Promise<void> => {
      const inputPath = resolve(invocationDirectory, input);
      const parsed = await pipeline.parse(
        { kind: 'file', path: inputPath },
        { jobId: 'cli-generate', workspaceDir: invocationDirectory },
      );
      const target = {
        framework: 'react' as const,
        language: 'typescript' as const,
        styling: 'css-modules' as const,
      };
      const outputDirectory = resolve(invocationDirectory, options.output);
      const plan = await reactGenerator.plan(parsed.document, {
        projectRoot: invocationDirectory,
        target,
      });
      const artifacts = await reactGenerator.generate(plan, {
        projectRoot: invocationDirectory,
        outputDir: outputDirectory,
        document: parsed.document,
      });
      await writeArtifacts(options.output, artifacts, options.force ?? false);

      console.log(
        JSON.stringify(
          {
            adapter: parsed.adapter.manifest.id,
            output: outputDirectory,
            files: artifacts.map((artifact) => artifact.path),
          },
          null,
          2,
        ),
      );
    },
  );

const nodeExecutable = process.argv[0] ?? 'node';
const cliScript = process.argv[1] ?? 'd2c';
const commandArguments =
  process.argv[2] === '--'
    ? [nodeExecutable, cliScript, ...process.argv.slice(3)]
    : process.argv;

program.parseAsync(commandArguments).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('d2c: ' + message);
  process.exitCode = 1;
});
