import { execa, Result, ExecaError } from "execa";
import * as vscode from "vscode";
import { z } from "zod";

import { RuleSchema, Rule } from "./config";
import { registerFormatter } from "./formatter";
import { Logger } from "./logger";
import { registerLsp } from "./lsp";

type RuleContext = {
  rule: Rule;
  ruleKey: string;
  service?: vscode.Disposable;
  conditionMatched?: boolean;
};

type Results = Record<string, Result | ExecaError>;
type ResultsMap = Record<string, Results>;

export class ToolManager {
  ruleContexts: RuleContext[] = [];
  oldRuleContexts: RuleContext[] = [];
  formatterService?: vscode.Disposable;

  public static getConfig(): { rules: Rule[] } {
    const config = vscode.workspace.getConfiguration("customLanguageTools");
    const result = z.array(RuleSchema).safeParse(config.get("rules") ?? []);
    if (!result.success) {
      vscode.window.showErrorMessage(`Failed to parse configuration: ${result.error.message}`);
    }
    return { rules: result.data ?? [] };
  }

  public syncRules(): void {
    Logger.debug("Syncing rules...");
    const { rules } = ToolManager.getConfig();
    this.oldRuleContexts = [...this.ruleContexts];

    this.ruleContexts = rules.map((rule) => {
      const ruleKey = JSON.stringify(rule);
      const oldRuleContext = this.oldRuleContexts.find((ctx) => ctx.ruleKey === ruleKey);
      return {
        rule,
        ruleKey,
        service: oldRuleContext?.service,
        conditionMatched: oldRuleContext?.conditionMatched,
      };
    });

    Logger.info(`Synced rules:`);
    Logger.info(`  [${this.ruleContexts.map((ctx) => ctx.rule.name).join(", ")}]`);
  }

  public async syncConditions(): Promise<void> {
    Logger.debug("Syncing conditions...");
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const isWorkspaceEmpty = !workspaceFolders || workspaceFolders.length === 0;
    if (isWorkspaceEmpty) {
      this.ruleContexts.forEach((ctx) => {
        ctx.conditionMatched = !ctx.rule.condition?.when;
      });
      return;
    }

    const workspacePaths = workspaceFolders.map((w) => w.uri.fsPath);

    const conditionCommands = [
      ...new Set(
        this.ruleContexts.flatMap((ctx) => [
          ...(ctx.rule.condition?.when ?? []),
          ...(ctx.rule.condition?.whenNot ?? []),
        ]),
      ),
    ];
    const resultsMap: ResultsMap = Object.fromEntries(
      await Promise.all(
        workspacePaths.map(async (workspacePath) => [
          workspacePath,
          Object.fromEntries(
            await Promise.all(
              conditionCommands.map(async (cmd) => [cmd, await executeCommand(cmd, workspacePath)]),
            ),
          ),
        ]),
      ),
    );

    this.ruleContexts.forEach((ctx) => {
      ctx.conditionMatched = workspacePaths
        .map((workspacePath) => {
          const { when, whenNot } = ctx.rule.condition || {};
          const results = resultsMap[workspacePath]!;
          const isWhenSatisfied = !when || when.every((cmd) => results[cmd].exitCode === 0);
          const isWhenNotSatisfied =
            !whenNot || whenNot.every((cmd) => results[cmd].exitCode !== 0);

          return isWhenSatisfied && isWhenNotSatisfied;
        })
        .some(Boolean);
    });

    const matchedRuleNames = this.ruleContexts
      .filter((ctx) => ctx.conditionMatched)
      .map((ctx) => ctx.rule.name);
    const unmatchedRuleNames = this.ruleContexts
      .filter((ctx) => !ctx.conditionMatched)
      .map((ctx) => ctx.rule.name);
    Logger.info(`Synced conditions:`);
    Logger.info(`  matched: [${matchedRuleNames.join(", ")}]`);
    Logger.info(`  unmatched: [${unmatchedRuleNames.join(", ")}]`);
  }

  public async syncServices(): Promise<void> {
    Logger.debug("Syncing services...");

    await this.syncConditions();

    if (!this.formatterService) {
      this.formatterService = registerFormatter("*", this);
      Logger.info("Registered formatter");
    }

    const staleServices = this.oldRuleContexts.filter(
      (oldCtx) =>
        oldCtx.service && !this.ruleContexts.some((newCtx) => newCtx.ruleKey === oldCtx.ruleKey),
    );
    const notMatchedServices = this.ruleContexts.filter(
      (newCtx) => !newCtx.conditionMatched && newCtx.service,
    );
    const newServices = this.ruleContexts.filter(
      (newCtx) => newCtx.conditionMatched && !newCtx.service,
    );
    const keepServices = this.ruleContexts.filter(
      (newCtx) => newCtx.conditionMatched && newCtx.service,
    );

    [...staleServices, ...notMatchedServices].forEach((ctx) => {
      ctx.service?.dispose();
      ctx.service = undefined;
    });

    await Promise.all(
      newServices.map(async (ctx) => {
        const services: vscode.Disposable[] = await Promise.all(
          (ctx.rule.action.lsp ?? []).map((lspCommand) =>
            registerLsp(ctx.rule.document, lspCommand, ctx.rule.name),
          ),
        );
        ctx.service = vscode.Disposable.from(...services);
      }),
    );

    Logger.info(
      `Unregistered services: [${[...staleServices, ...notMatchedServices].map((ctx) => ctx.rule.name).join(", ")}]`,
    );
    Logger.info(`Registered services: [${newServices.map((ctx) => ctx.rule.name).join(", ")}]`);
    Logger.info(`Keeped services: [${keepServices.map((ctx) => ctx.rule.name).join(", ")}]`);
  }

  public async unregisterAll(): Promise<void> {
    Logger.info("Unregistering all");

    this.formatterService?.dispose();
    this.formatterService = undefined;

    this.ruleContexts.forEach((ctx) => {
      ctx.service?.dispose();
      ctx.service = undefined;
    });
    this.ruleContexts = [];
    this.oldRuleContexts = [];

    Logger.info("Unregistered all");
  }
}

async function executeCommand(
  command: string,
  workspacePath: string,
): Promise<Result | ExecaError> {
  return await execa({
    shell: true,
    stdin: "ignore",
    cwd: workspacePath,
    reject: false,
  })`${command}`;
}
