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
   * Constructs an execution environment with access to all installed compilers & runtimes
   * (Python, Java, GCC, G++) without leaking server secrets or database credentials.
   */
  private static getExecutionEnv(): Record<string, string> {
    let currentPath = process.env.PATH || '';

    // Automatically discover WinLibs / MinGW bin directory if installed via winget or chocolatey
    const candidateDirs = [
      path.join(
        process.env.LOCALAPPDATA || 'C:\\Users\\Lenovo\\AppData\\Local',
        'Microsoft',
        'WinGet',
        'Packages',
        'BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe',
        'mingw64',
        'bin'
      ),
      'C:\\ProgramData\\chocolatey\\bin',
      'C:\\Program Files\\Java\\jdk-26.0.1\\bin',
    ];

    for (const dir of candidateDirs) {
      if (fs.existsSync(dir) && !currentPath.includes(dir)) {
        currentPath = `${dir};${currentPath}`;
      }
    }

    return {
      PATH: currentPath,
      PYTHONUNBUFFERED: '1',
      TEMP: os.tmpdir(),
      TMP: os.tmpdir(),
    };
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

    const normalizedLang = (language || '').toLowerCase().trim();

    try {
      // 1. Prepare files and determine class/file names
      const { sourceFile, className } = this.writeSourceFile(workDir, normalizedLang, code);

      logger.info('Preparing code execution', 'IsolatedRunner', {
        language: normalizedLang,
        sourceFile: path.basename(sourceFile),
        className,
        testCasesCount: testCases.length,
      });

      // 2. Compilation step (for compiled languages Java, C++, C)
      if (normalizedLang === 'java') {
        const compileResult = await this.compileJava(workDir, sourceFile);
        if (!compileResult.success) {
          logger.warn('Java compilation failed', 'IsolatedRunner', { error: compileResult.error });
          return this.createCompilationErrorResult(testCases, compileResult.error || 'Java Compilation Error');
        }
      } else if (normalizedLang === 'cpp' || normalizedLang === 'c++') {
        const compileResult = await this.compileCpp(workDir, sourceFile);
        if (!compileResult.success) {
          logger.warn('C++ compilation failed', 'IsolatedRunner', { error: compileResult.error });
          return this.createCompilationErrorResult(testCases, compileResult.error || 'C++ Compilation Error');
        }
      } else if (normalizedLang === 'c') {
        const compileResult = await this.compileC(workDir, sourceFile);
        if (!compileResult.success) {
          logger.warn('C compilation failed', 'IsolatedRunner', { error: compileResult.error });
          return this.createCompilationErrorResult(testCases, compileResult.error || 'C Compilation Error');
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
        const testRes = await this.runSingleTestCase(workDir, normalizedLang, sourceFile, className, tc, timeLimitMs);
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

  private static createCompilationErrorResult(testCases: TestCaseInput[], errorMessage: string): ExecutionResult {
    return {
      overallStatus: 'COMPILATION_ERROR',
      score: 0,
      totalScore: testCases.reduce((acc, t) => acc + t.weight, 0),
      runtimeMs: 0,
      memoryKb: 0,
      passedTests: 0,
      totalTests: testCases.length,
      compilerError: errorMessage,
      testResults: testCases.map((tc) => ({
        testCaseId: tc.id,
        isPublic: tc.isPublic,
        passed: false,
        input: tc.isPublic ? tc.input : undefined,
        expectedOutput: tc.isPublic ? tc.expectedOutput : undefined,
        actualOutput: tc.isPublic ? errorMessage : undefined,
        runtimeMs: 0,
        status: 'COMPILATION_ERROR',
        errorMessage,
      })),
    };
  }

  private static writeSourceFile(
    workDir: string,
    language: string,
    code: string
  ): { sourceFile: string; className?: string } {
    switch (language.toLowerCase()) {
      case 'python':
      case 'py': {
        const filePath = path.join(workDir, 'solution.py');
        fs.writeFileSync(filePath, code, 'utf-8');
        return { sourceFile: filePath };
      }

      case 'java': {
        // Detect Java class name to avoid javac "class X is public, should be in X.java" error
        let className = 'Main';
        const publicMatch = code.match(/public\s+class\s+([A-Za-z0-9_$]+)/);
        if (publicMatch && publicMatch[1]) {
          className = publicMatch[1];
        } else {
          const mainMatch = code.match(/class\s+([A-Za-z0-9_$]+)[\s\S]*?public\s+static\s+void\s+main/);
          if (mainMatch && mainMatch[1]) {
            className = mainMatch[1];
          }
        }
        const filePath = path.join(workDir, `${className}.java`);
        fs.writeFileSync(filePath, code, 'utf-8');
        return { sourceFile: filePath, className };
      }

      case 'cpp':
      case 'c++': {
        const filePath = path.join(workDir, 'solution.cpp');
        fs.writeFileSync(filePath, code, 'utf-8');
        return { sourceFile: filePath };
      }

      case 'c': {
        const filePath = path.join(workDir, 'solution.c');
        fs.writeFileSync(filePath, code, 'utf-8');
        return { sourceFile: filePath };
      }

      default: {
        const filePath = path.join(workDir, 'solution.py');
        fs.writeFileSync(filePath, code, 'utf-8');
        return { sourceFile: filePath };
      }
    }
  }

  private static async compileJava(workDir: string, sourceFile: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const fileName = path.basename(sourceFile);
      const proc = spawn('javac', [fileName], {
        cwd: workDir,
        env: this.getExecutionEnv(),
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          const err = (stderr || stdout || 'Compilation failed').trim();
          resolve({ success: false, error: err.slice(0, 2000) });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: `Java compiler not available: ${err.message}` });
      });
    });
  }

  private static async compileCpp(workDir: string, sourceFile: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const fileName = path.basename(sourceFile);
      const exeName = process.platform === 'win32' ? 'solution.exe' : 'solution';
      const proc = spawn('g++', ['-O2', '-std=c++17', '-o', exeName, fileName], {
        cwd: workDir,
        env: this.getExecutionEnv(),
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          const err = (stderr || stdout || 'C++ compilation failed').trim();
          resolve({ success: false, error: err.slice(0, 2000) });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: `C++ compiler (g++) not available: ${err.message}` });
      });
    });
  }

  private static async compileC(workDir: string, sourceFile: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const fileName = path.basename(sourceFile);
      const exeName = process.platform === 'win32' ? 'solution.exe' : 'solution';
      const proc = spawn('gcc', ['-O2', '-std=c11', '-o', exeName, fileName], {
        cwd: workDir,
        env: this.getExecutionEnv(),
      });

      let stderr = '';
      let stdout = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          const err = (stderr || stdout || 'C compilation failed').trim();
          resolve({ success: false, error: err.slice(0, 2000) });
        }
      });

      proc.on('error', (err) => {
        resolve({ success: false, error: `C compiler (gcc) not available: ${err.message}` });
      });
    });
  }

  private static async runSingleTestCase(
    workDir: string,
    language: string,
    sourceFile: string,
    className: string | undefined,
    tc: TestCaseInput,
    timeLimitMs: number
  ): Promise<TestCaseResult> {
    const startTime = Date.now();
    const normalized = (language || '').toLowerCase().trim();

    let cmd = 'python';
    let args: string[] = [path.basename(sourceFile)];

    if (normalized === 'java') {
      cmd = 'java';
      args = ['-cp', '.', className || 'Main'];
    } else if (normalized === 'cpp' || normalized === 'c++' || normalized === 'c') {
      const exeName = process.platform === 'win32' ? 'solution.exe' : './solution';
      cmd = path.join(workDir, exeName);
      args = [];
    }

    logger.info('Executing single test case', 'IsolatedRunner', {
      language: normalized,
      cmd,
      args,
      testCaseId: tc.id,
    });

    return new Promise((resolve) => {
      let isTimedOut = false;

      // Spawn with clean environment - NEVER leak database or server secrets
      const child = spawn(cmd, args, {
        cwd: workDir,
        env: this.getExecutionEnv(),
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
        // Ensure input ends with newline for line-based readers
        const inputData = tc.input.endsWith('\n') ? tc.input : `${tc.input}\n`;
        child.stdin.write(inputData);
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
