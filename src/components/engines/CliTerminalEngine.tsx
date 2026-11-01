'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Lesson } from '@/types/course';
import {
  Terminal as TerminalIcon,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CornerDownLeft,
} from 'lucide-react';

let cliIdCounter = 0;
function nextCliId(prefix: string): string {
  cliIdCounter += 1;
  return `${prefix}_${cliIdCounter}`;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

interface CliTerminalEngineProps {
  lesson: Lesson;
  isBrokenProdMode: boolean;
  onLessonPassed: () => void;
}

export function CliTerminalEngine({
  lesson,
  isBrokenProdMode,
  onLessonPassed,
}: CliTerminalEngineProps) {
  // Virtual File System State
  const [currentDir, setCurrentDir] = useState<string>('~/project');
  const [vfs, setVfs] = useState<Record<string, string>>({
    '~/project/orders.csv': 'order_id,user_id,amount,status\n101,42,150.00,SUCCESS\n102,15,450.00,PENDING\n103,42,90.00,FAILED\n104,89,1200.00,SUCCESS',
    '~/project/pipeline.sh': '#!/bin/bash\nhdfs dfs -put orders.csv /raw/orders/\necho "Ingestion complete"',
    '~/project/Dockerfile': 'FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nRUN pip install pandas\nCMD ["python", "main.py"]',
    '~/project/README.md': '# DE Academy Production Pipeline\nProduction daily batch ETL data ingestion job.',
    'hdfs:///raw/orders/': '<DIR>',
    'hdfs:///lakehouse/bronze/': '<DIR>',
  });

  // Git state
  const [gitBranch, setGitBranch] = useState('main');
  const [gitStaged, setGitStaged] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<{ hash: string; msg: string }[]>([
    { hash: 'e4a29c1', msg: 'feat(ingest): initial hdfs ingestion script' },
    { hash: 'b1702f8', msg: 'fix(schema): handle nullable customer_id' },
  ]);

  // Kafka state
  const [kafkaTopics, setKafkaTopics] = useState<
    Record<string, { partitions: number; replicationFactor: number; messages: string[] }>
  >({
    'postgres.public.orders': {
      partitions: 3,
      replicationFactor: 2,
      messages: [
        '{"before":null,"after":{"id":101,"user_id":42,"amount":150},"op":"c"}',
        '{"before":null,"after":{"id":102,"user_id":15,"amount":450},"op":"c"}',
      ],
    },
    'notifications.events': {
      partitions: 1,
      replicationFactor: 1,
      messages: ['{"type":"SMS","to":"+79991234567","status":"SENT"}'],
    },
  });

  // Terminal History & Input
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init_1',
      type: 'system',
      text: 'DE Academy Linux, HDFS & Kafka Virtual Console (v2.4.0-de)',
    },
    {
      id: 'init_2',
      type: 'system',
      text: isBrokenProdMode
        ? '⚠️ ВНИМАНИЕ: Режим «Сломанный прод». Обнаружены критические ошибки сервиса. Проанализируйте логи и восстановите работу!'
        : 'Type "help" to see available commands or run CLI tools.',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [executedCommands, setExecutedCommands] = useState<string[]>([]);
  const [isPassed, setIsPassed] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = inputVal.trim();
    if (!rawCmd) return;

    // Append to lines
    const inputLine: TerminalLine = {
      id: nextCliId('in'),
      type: 'input',
      text: `${currentDir} (${gitBranch}) $ ${rawCmd}`,
    };

    setCmdHistory((prev) => [...prev, rawCmd]);
    setHistoryIdx(-1);
    setInputVal('');
    setExecutedCommands((prev) => [...prev, rawCmd]);

    const newOutputs: TerminalLine[] = [];

    // Process CLI commands
    const parts = rawCmd.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    // 1. CLEAR
    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    // 2. HELP
    if (cmd === 'help') {
      newOutputs.push({
        id: nextCliId('out'),
        type: 'output',
        text: `Доступные команды в тренажере:\n  Linux:  ls [-la], cd, cat, head, tail, grep, awk, sed, chmod, ps aux, crontab, pwd, echo\n  Git:    git status, git checkout -b <name>, git add <file>, git commit -m "...", git log\n  Hadoop: hdfs dfs -ls, hdfs dfs -mkdir -p, hdfs dfs -put, hdfs dfs -cat, hdfs dfs -du -h, hdfs fsck\n  Kafka:  kafka-topics.sh [--create|--describe], kafka-console-consumer.sh, kafka-consumer-groups.sh\n  clear:  очистить экран`,
      });
    }

    // 3. PWD
    else if (cmd === 'pwd') {
      newOutputs.push({ id: nextCliId('out'), type: 'output', text: currentDir });
    }

    // 4. LS
    else if (cmd === 'ls') {
      const isDetailed = parts.includes('-la') || parts.includes('-l');
      const files = Object.keys(vfs)
        .filter((k) => k.startsWith(currentDir))
        .map((k) => k.replace(`${currentDir}/`, ''))
        .filter((k) => !k.includes('/') && k !== '');

      if (isDetailed) {
        let text = 'total ' + files.length * 4 + '\n';
        text += 'drwxr-xr-x  4 dataeng  staff   128 Nov  1 02:40 .\n';
        text += 'drwxr-xr-x  8 dataeng  staff   256 Nov  1 02:30 ..\n';
        files.forEach((f) => {
          text += `-rw-r--r--  1 dataeng  staff   ${vfs[`${currentDir}/${f}`]?.length || 42} Nov  1 02:40 ${f}\n`;
        });
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: text.trim() });
      } else {
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: files.join('   ') || '(директория пуста)' });
      }
    }

    // 5. CD
    else if (cmd === 'cd') {
      const target = parts[1] || '~';
      if (target === '..' || target === '../') {
        setCurrentDir('~');
      } else if (target === '~' || target === '~/') {
        setCurrentDir('~');
      } else if (target === 'project' || target === '~/project') {
        setCurrentDir('~/project');
      } else {
        newOutputs.push({ id: nextCliId('err'), type: 'error', text: `bash: cd: ${target}: No such file or directory` });
      }
    }

    // 6. CAT
    else if (cmd === 'cat') {
      const filename = parts[1];
      const fullPath = `${currentDir}/${filename}`;
      if (vfs[fullPath]) {
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: vfs[fullPath] });
      } else {
        newOutputs.push({ id: nextCliId('err'), type: 'error', text: `cat: ${filename}: No such file or directory` });
      }
    }

    // 7. GREP
    else if (cmd === 'grep') {
      const pattern = parts[1];
      const filename = parts[2];
      const fullPath = `${currentDir}/${filename}`;
      if (vfs[fullPath]) {
        const matches = vfs[fullPath]
          .split('\n')
          .filter((line) => line.includes(pattern));
        newOutputs.push({
          id: nextCliId('out'),
          type: 'output',
          text: matches.join('\n') || `(совпадений не найдено)`,
        });
      } else {
        newOutputs.push({ id: nextCliId('err'), type: 'error', text: `grep: ${filename}: No such file or directory` });
      }
    }

    // 8. PS AUX
    else if (cmd === 'ps' && parts[1] === 'aux') {
      const psText =
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' +
        'root         1  0.0  0.1  20456  3240 ?        Ss   00:00   0:02 /sbin/init\n' +
        'kafka     1024  3.2  8.4 4294967 856000 ?     Sl   00:01   4:12 /usr/bin/java -cp /opt/kafka/libs/* kafka.Kafka\n' +
        'hdfs      2048  1.8  4.2 2147483 428000 ?     Sl   00:02   2:45 org.apache.hadoop.hdfs.server.namenode.NameNode\n' +
        'airflow   3072  2.1  3.1 1048576 312000 ?     S    00:05   1:18 airflow scheduler --daemon\n' +
        'dataeng   4096  0.0  0.1  12450  1820 pts/0    R+   02:40   0:00 ps aux';
      newOutputs.push({ id: nextCliId('out'), type: 'output', text: psText });
    }

    // 9. GIT COMMANDS
    else if (cmd === 'git') {
      const sub = parts[1];
      if (sub === 'status') {
        let msg = `On branch ${gitBranch}\n`;
        if (gitStaged.length > 0) {
          msg += 'Changes to be committed:\n' + gitStaged.map((f) => `  \tnew file:   ${f}`).join('\n');
        } else {
          msg += 'nothing to commit, working tree clean';
        }
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: msg });
      } else if (sub === 'checkout' && parts[2] === '-b') {
        const branchName = parts[3];
        if (branchName) {
          setGitBranch(branchName);
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: `Switched to a new branch '${branchName}'` });
        } else {
          newOutputs.push({ id: nextCliId('err'), type: 'error', text: 'fatal: missing branch name' });
        }
      } else if (sub === 'add') {
        const file = parts[2];
        if (file === '.' || file === '-A') {
          setGitStaged(['orders.csv', 'pipeline.sh']);
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: 'Staged all changes.' });
        } else {
          setGitStaged((prev) => [...prev, file]);
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: `Staged ${file}` });
        }
      } else if (sub === 'commit') {
        const mIdx = parts.indexOf('-m');
        const commitMsg = mIdx !== -1 ? parts.slice(mIdx + 1).join(' ').replace(/['"]/g, '') : 'commit';
        const newHash = Math.random().toString(36).slice(2, 9);
        setGitCommits((prev) => [{ hash: newHash, msg: commitMsg }, ...prev]);
        setGitStaged([]);
        newOutputs.push({
          id: nextCliId('out'),
          type: 'output',
          text: `[${gitBranch} ${newHash}] ${commitMsg}\n 2 files changed, 48 insertions(+)`,
        });
      } else if (sub === 'log') {
        const logText = gitCommits.map((c) => `${c.hash} ${c.msg}`).join('\n');
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: logText });
      } else {
        newOutputs.push({ id: nextCliId('err'), type: 'error', text: `git: '${sub}' is not a recognized git command.` });
      }
    }

    // 10. HDFS COMMANDS
    else if (cmd === 'hdfs') {
      const sub = parts[1];
      if (sub === 'dfs') {
        const action = parts[2];
        if (action === '-ls') {
          const path = parts[3] || '/';
          const entries = Object.keys(vfs).filter((k) => k.startsWith(`hdfs://${path}`));
          let msg = `Found ${entries.length} items\n`;
          entries.forEach((e) => {
            msg += `drwxr-xr-x   - hdfs supergroup          0 2026-11-01 02:00 ${e.replace('hdfs://', '')}\n`;
          });
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: msg.trim() });
        } else if (action === '-mkdir') {
          const path = parts.find((p) => p.startsWith('/')) || '/raw/new_dir';
          setVfs((prev) => ({ ...prev, [`hdfs://${path}`]: '<DIR>' }));
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: `Created directory in HDFS: ${path}` });
        } else if (action === '-put') {
          const localFile = parts[3];
          const dest = parts[4] || '/raw/';
          setVfs((prev) => ({ ...prev, [`hdfs://${dest}/${localFile}`]: vfs[`${currentDir}/${localFile}`] || 'DATA' }));
          newOutputs.push({
            id: nextCliId('out'),
            type: 'output',
            text: `Uploaded local file ${localFile} into HDFS path ${dest} (Block Size: 128 MB, Replication: 3)`,
          });
        } else if (action === '-du' && parts[3] === '-h') {
          newOutputs.push({
            id: nextCliId('out'),
            type: 'output',
            text: '124.5 M  373.5 M  /raw/orders\n2.4 G    7.2 G    /lakehouse/bronze',
          });
        } else {
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: `hdfs dfs: completed operation ${action}` });
        }
      } else if (sub === 'fsck') {
        newOutputs.push({
          id: nextCliId('out'),
          type: 'output',
          text: isBrokenProdMode
            ? 'Connecting to NameNode at hdfs://namenode:9000...\nFSCK started by dataeng for path / at 2026-11-01 02:40:00\n\nTotal size: 452910240 B\nTotal dirs: 12\nTotal files: 45\nTotal blocks (validated): 45 (avg. block size 10064672 B)\n********************************\nCORRUPT FILES:        0\nMISSING BLOCKS:       0\nUNDER-REPLICATED BLOCKS: 8 (Target replication: 3, actual: 1)\n********************************\nStatus: CORRUPT (Under-replicated blocks present on DataNode 3 failure)'
            : 'Connecting to NameNode at hdfs://namenode:9000...\nStatus: HEALTHY (Total blocks: 45, all blocks replicated at factor 3).',
        });
      }
    }

    // 11. KAFKA COMMANDS
    else if (cmd.startsWith('kafka-')) {
      if (cmd === 'kafka-topics.sh') {
        if (parts.includes('--list')) {
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: Object.keys(kafkaTopics).join('\n') });
        } else if (parts.includes('--create')) {
          const topicIdx = parts.indexOf('--topic');
          const topicName = topicIdx !== -1 ? parts[topicIdx + 1] : 'test.topic';
          const pIdx = parts.indexOf('--partitions');
          const partitions = pIdx !== -1 ? parseInt(parts[pIdx + 1], 10) : 3;
          setKafkaTopics((prev) => ({
            ...prev,
            [topicName]: { partitions, replicationFactor: 2, messages: [] },
          }));
          newOutputs.push({ id: nextCliId('out'), type: 'output', text: `Created topic ${topicName} with ${partitions} partitions.` });
        } else if (parts.includes('--describe')) {
          const topicIdx = parts.indexOf('--topic');
          const topicName = topicIdx !== -1 ? parts[topicIdx + 1] : Object.keys(kafkaTopics)[0];
          const t = kafkaTopics[topicName];
          if (t) {
            let desc = `Topic: ${topicName}\tTopicId: ${Math.random().toString(36).slice(2, 10)}\tPartitionCount: ${t.partitions}\tReplicationFactor: ${t.replicationFactor}\tConfigs: min.insync.replicas=2\n`;
            for (let i = 0; i < t.partitions; i++) {
              desc += `\tTopic: ${topicName}\tPartition: ${i}\tLeader: ${i}\tReplicas: ${i},${(i + 1) % 3}\tIsr: ${i},${(i + 1) % 3}\n`;
            }
            newOutputs.push({ id: nextCliId('out'), type: 'output', text: desc.trim() });
          } else {
            newOutputs.push({ id: nextCliId('err'), type: 'error', text: `Topic ${topicName} does not exist.` });
          }
        }
      } else if (cmd === 'kafka-consumer-groups.sh' && parts.includes('--describe')) {
        const groupIdx = parts.indexOf('--group');
        const grp = groupIdx !== -1 ? parts[groupIdx + 1] : 'analytics_service';
        const lagText =
          `GROUP           TOPIC                   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID     HOST            CLIENT-ID\n` +
          `${grp} postgres.public.orders 0          140291          140295          4               consumer_1      /10.0.1.15      consumer-app\n` +
          `${grp} postgres.public.orders 1          89102           145000          ${isBrokenProdMode ? '55898 (ALERT)' : '12'}      consumer_2      /10.0.1.16      consumer-app\n` +
          `${grp} postgres.public.orders 2          94200           94202           2               consumer_3      /10.0.1.17      consumer-app`;
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: lagText });
      } else {
        newOutputs.push({ id: nextCliId('out'), type: 'output', text: `Kafka command executed successfully.` });
      }
    }

    // Default unknown command
    else {
      newOutputs.push({ id: nextCliId('err'), type: 'error', text: `bash: ${cmd}: command not found` });
    }

    setLines((prev) => [...prev, inputLine, ...newOutputs]);
  };

  // Keyboard navigation for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocompletion
      const cmds = ['hdfs dfs -ls', 'hdfs dfs -mkdir', 'git status', 'git commit', 'kafka-topics.sh', 'cat', 'grep', 'clear'];
      const match = cmds.find((c) => c.startsWith(inputVal.trim()));
      if (match) setInputVal(match);
    }
  };

  // Check Solution
  const handleVerifySolution = () => {
    // Check if expected commands were run
    const reqPatterns = lesson.testConfig.requiredAstPatterns || [];
    const missing: string[] = [];

    for (const pat of reqPatterns) {
      const found = executedCommands.some((c) => c.toLowerCase().includes(pat.toLowerCase()));
      if (!found) missing.push(pat);
    }

    if (missing.length > 0) {
      setIsPassed(false);
      setVerificationFeedback(
        `Не выполнены обязательные команды: «${missing.join(', ')}». Изучите задание и выполните требуемые команды в терминале.`
      );
    } else {
      setIsPassed(true);
      setVerificationFeedback('✓ Все команды задания и проверка состояния VFS/кластера выполнены безупречно!');
      onLessonPassed();
    }
  };

  const handleResetTerminal = () => {
    setLines([
      { id: 'rst_1', type: 'system', text: 'Terminal session reset.' },
      { id: 'rst_2', type: 'system', text: 'Type "help" to view command manual.' },
    ]);
    setExecutedCommands([]);
    setVerificationFeedback(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#090C10] text-[#E6EDF3] overflow-hidden select-none font-mono">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-[#21262D] bg-[#0D1117] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-[#E6EDF3]">Интерактивный терминал (VFS, HDFS, Kafka CLI)</span>
          {isBrokenProdMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-[10px] text-red-300 font-bold animate-pulse">
              <Flame className="w-3 h-3 fill-current text-red-400" />
              Инцидент в проде
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetTerminal}
            className="w-7 h-7 rounded flex items-center justify-center bg-[#151B23] border border-[#21262D] hover:bg-[#21262D] text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            title="Очистить терминал"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleVerifySolution}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Проверить решение</span>
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationFeedback && (
        <div
          className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
            isPassed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{verificationFeedback}</span>
          </div>
          <button onClick={() => setVerificationFeedback(null)} className="text-[#7D8590] hover:text-[#E6EDF3]">
            ×
          </button>
        </div>
      )}

      {/* Terminal Screen */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 text-xs select-text cursor-text bg-[#090C10]"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l) => (
          <div key={l.id} className="leading-relaxed">
            {l.type === 'input' && (
              <span className="text-emerald-400 font-bold">{l.text}</span>
            )}
            {l.type === 'output' && (
              <pre className="text-[#E6EDF3] whitespace-pre-wrap font-mono mt-0.5">{l.text}</pre>
            )}
            {l.type === 'error' && (
              <pre className="text-red-400 whitespace-pre-wrap font-mono mt-0.5">{l.text}</pre>
            )}
            {l.type === 'system' && (
              <p className="text-[#7D8590] italic">{l.text}</p>
            )}
          </div>
        ))}

        {/* Active Command Prompt Line */}
        <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold shrink-0">
            {currentDir} ({gitBranch}) $
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-[#E6EDF3] font-mono text-xs focus:ring-0 p-0"
            placeholder="Введите команду (например: hdfs dfs -ls / или git status)..."
          />
          <CornerDownLeft className="w-3.5 h-3.5 text-[#7D8590] shrink-0" />
        </form>
        <div ref={terminalEndRef} />
      </div>

      {/* Bottom Quick Action Pills */}
      <div className="h-9 px-4 border-t border-[#21262D] bg-[#0D1117] flex items-center gap-2 text-[11px] text-[#7D8590] overflow-x-auto shrink-0">
        <span className="shrink-0">Быстрые команды:</span>
        <button
          onClick={() => setInputVal('hdfs dfs -ls /')}
          className="px-2 py-0.5 rounded bg-[#151B23] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shrink-0"
        >
          hdfs dfs -ls /
        </button>
        <button
          onClick={() => setInputVal('kafka-consumer-groups.sh --describe --group analytics_service')}
          className="px-2 py-0.5 rounded bg-[#151B23] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shrink-0"
        >
          kafka-consumer-groups.sh
        </button>
        <button
          onClick={() => setInputVal('git status')}
          className="px-2 py-0.5 rounded bg-[#151B23] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shrink-0"
        >
          git status
        </button>
        <button
          onClick={() => setInputVal('hdfs fsck / -files -blocks -locations')}
          className="px-2 py-0.5 rounded bg-[#151B23] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shrink-0"
        >
          hdfs fsck /
        </button>
      </div>
    </div>
  );
}
