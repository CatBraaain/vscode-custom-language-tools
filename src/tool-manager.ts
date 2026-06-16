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
    await Promise.all(
      this.ruleContexts.map(async (ctx) => {
        const results = await Promise.all(
          workspacePaths.map(
            async (workspacePath) => await isConditionSatisfied(ctx.rule, workspacePath),
          ),
        );
        ctx.conditionMatched = results.some(Boolean);
      }),
    );

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
        const services: vscode.Disposable[] = [];
        if (ctx.rule.action.lsp) {
          services.push(await registerLsp(ctx.rule.document, ctx.rule.action.lsp, ctx.rule.name));
        }
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

async function isConditionSatisfied(rule: Rule, workspacePath: string): Promise<boolean> {
  const { when, whenNot } = rule.condition;
  const isWhenSatisfied = !when || (await executeCommand(when, workspacePath)).exitCode === 0;
  const isWhenNotSatisfied =
    !whenNot || (await executeCommand(whenNot, workspacePath)).exitCode === 1;

  const isSatisfied = isWhenSatisfied && isWhenNotSatisfied;
  return isSatisfied;
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
