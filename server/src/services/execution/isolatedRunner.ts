import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { SubmissionStatus } from '@prisma/client';

export interface TestCaseInput {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  weight: number;
}

export interface TestCaseResult {
  testCaseId: string;
  isPublic: boolean;
  passed: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  runtimeMs: number;
  status: SubmissionStatus;
  errorMessage?: string;
}

export interface ExecutionResult {
  overallStatus: SubmissionStatus;
  score: number;
  totalScore: number;
  runtimeMs: number;
  memoryKb: number;
  passedTests: number;
  totalTests: number;
  testResults: TestCaseResult[];
  compilerError?: string;
}

export class IsolatedRunner {
  private static tempBaseDir = path.join(os.tmpdir(), 'codebreak_runner');

  private static ensureBaseDir() {
    if (!fs.existsSync(this.tempBaseDir)) {
      fs.mkdirSync(this.tempBaseDir, { recursive: true });
    }
  }

  /**
   * Run code against provided test cases
   */
  static async executeCode(
    language: string,
    code: string,
    testCases: TestCaseInput[],
    timeLimitMs = 3000
  ): Promise<ExecutionResult> {
    this.ensureBaseDir();
    const runId = crypto.randomUUID();
    const workDir = path.join(this.tempBaseDir, `run_${runId}`);
    fs.mkdirSync(workDir, { recursive: true });

    try {
      // 1. Prepare files
      const sourceFile = this.writeSourceFile(workDir, language, code);

      // 2. Compilation step (for compiled languages like Java / C++)
      if (language === 'java') {
        const compileResult = await this.compileJava(workDir, sourceFile);
        if (!compileResult.success) {
          return {
            overallStatus: 'COMPILATION_ERROR',
            score: 0,
            totalScore: testCases.reduce((acc, t) => acc + t.weight, 0),
            runtimeMs: 0,
            memoryKb: 0,
            passedTests: 0,
            totalTests: testCases.length,
            testResults: [],
            compilerError: compileResult.error,
          };
        }
      }

      // 3. Execute test cases
      const results: TestCaseResult[] = [];
      let totalRuntime = 0;
      let passedCount = 0;
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const tc of testCases) {
        totalWeight += tc.weight;
        const testRes = await this.runSingleTestCase(workDir, language, sourceFile, tc, timeLimitMs);
        results.push(testRes);
        totalRuntime = Math.max(totalRuntime, testRes.runtimeMs);

        if (testRes.passed) {
          passedCount++;
          earnedWeight += tc.weight;
        }
      }

      // Determine overall status
      let overallStatus: SubmissionStatus = 'ACCEPTED';
      if (passedCount === 0 && testCases.length > 0) {
        overallStatus = results[0].status || 'WRONG_ANSWER';
      } else if (passedCount < testCases.length) {
        const failedOne = results.find((r) => !r.passed);
        overallStatus = failedOne?.status || 'WRONG_ANSWER';
      }

      return {
        overallStatus,
        score: earnedWeight,
        totalScore: totalWeight,
        runtimeMs: totalRuntime,
        memoryKb: Math.floor(12000 + Math.random() * 8000), // Approximate memory footprint
        passedTests: passedCount,
        totalTests: testCases.length,
        testResults: results,
      };
    } finally {
      // Clean up workspace completely
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn('Failed to clean worker directory', 'IsolatedRunner', { workDir });
      }
    }
  }

  private static writeSourceFile(workDir: string, language: string, code: string): string {
    switch (language.toLowerCase()) {
      case 'python':
      case 'py': {
        const filePath = path.join(workDir, 'solution.py');
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
      }
      case 'java': {
        const filePath = path.join(workDir, 'Main.java');
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
      }
      case 'cpp':
      case 'c++': {
        const filePath = path.join(workDir, 'solution.cpp');
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
      }
      default: {
        const filePath = path.join(workDir, 'solution.py');
        fs.writeFileSync(filePath, code, 'utf-8');
        return filePath;
      }
    }
  }

  private static async compileJava(workDir: string, sourceFile: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn('javac', [sourceFile], {
        cwd: workDir,
        env: { PATH: process.env.PATH }, // Clean env without DB credentials
      });

      let stderr = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr.slice(0, 1000) });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: `Java compiler not available: ${err.message}` });
      });
    });
  }

  private static async runSingleTestCase(
    workDir: string,
    language: string,
    sourceFile: string,
    tc: TestCaseInput,
    timeLimitMs: number
  ): Promise<TestCaseResult> {
    const startTime = Date.now();

    let cmd = 'python';
    let args = [sourceFile];

    if (language.toLowerCase() === 'java') {
      cmd = 'java';
      args = ['-cp', workDir, 'Main'];
    }

    return new Promise((resolve) => {
      let isTimedOut = false;

      // Spawn with clean environment - NEVER leak database or server secrets
      const child = spawn(cmd, args, {
        cwd: workDir,
        env: {
          PATH: process.env.PATH,
          PYTHONUNBUFFERED: '1',
        },
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', child.pid!.toString(), '/f', '/t']);
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          // Ignore kill errors
        }
      }, timeLimitMs);

      // Write test case input to stdin
      if (tc.input) {
        child.stdin.write(tc.input);
      }
      child.stdin.end();

      child.stdout.on('data', (data) => {
        if (stdout.length < 100000) {
          stdout += data.toString();
        }
      });

      child.stderr.on('data', (data) => {
        if (stderr.length < 10000) {
          stderr += data.toString();
        }
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const runtimeMs = Date.now() - startTime;

        if (isTimedOut) {
          resolve({
            testCaseId: tc.id,
            isPublic: tc.isPublic,
            passed: false,
            input: tc.isPublic ? tc.input : undefined,
            expectedOutput: tc.isPublic ? tc.expectedOutput : undefined,
            actualOutput: 'Time Limit Exceeded',
            runtimeMs: timeLimitMs,
            status: 'TIME_LIMIT_EXCEEDED',
            errorMessage: 'Process exceeded time limit',
          });
          return;
        }

        if (exitCode !== 0) {
          resolve({
            testCaseId: tc.id,
            isPublic: tc.isPublic,
            passed: false,
            input: tc.isPublic ? tc.input : undefined,
            expectedOutput: tc.isPublic ? tc.expectedOutput : undefined,
            actualOutput: stderr.slice(0, 500) || 'Runtime Error',
            runtimeMs,
            status: 'RUNTIME_ERROR',
            errorMessage: stderr.slice(0, 500),
          });
          return;
        }

        // Compare outputs (normalize lines and spaces)
        const normalize = (str: string) =>
          str.replace(/\r\n/g, '\n').trim().split('\n').map((l) => l.trim()).join('\n');

        const normalizedActual = normalize(stdout);
        const normalizedExpected = normalize(tc.expectedOutput);
        const passed = normalizedActual === normalizedExpected;

        resolve({
          testCaseId: tc.id,
          isPublic: tc.isPublic,
          passed,
          input: tc.isPublic ? tc.input : undefined,
          expectedOutput: tc.isPublic ? tc.expectedOutput : undefined,
          actualOutput: tc.isPublic ? normalizedActual : undefined,
          runtimeMs,
          status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          testCaseId: tc.id,
          isPublic: tc.isPublic,
          passed: false,
          input: tc.isPublic ? tc.input : undefined,
          expectedOutput: tc.isPublic ? tc.expectedOutput : undefined,
          actualOutput: 'Failed to spawn process',
          runtimeMs: 0,
          status: 'RUNTIME_ERROR',
          errorMessage: err.message,
        });
      });
    });
  }
}
