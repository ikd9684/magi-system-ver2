# MAGI System ver.2 — アーキテクチャ & 仕様

## 概要

エヴァンゲリオンのMAGIシステムをインスパイアした、3つのAI人格が議論・投票して回答を出すWebアプリ。
MELCHIOR・BALTHASAR・CASPERが順番に発言し、最終的に各人格が「承認/否決/保留」で投票してNGE風の合議結果を表示する。

---

## Tech Stack

| 項目 | 技術 |
|------|------|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| LLM | Ollama (ローカル), デフォルト: `gpt-oss:20b` |
| State管理 | useReducer (クライアント) |
| 通信 | SSE (Server-Sent Events) |
| 設定永続化 | localStorage |
| 会話履歴永続化 | SQLite (`better-sqlite3`, `data/magi.db`) |

---

## 議論フロー

1クエリあたり9回のLLM呼び出し（Phase 1,2 は逐次、Phase 3 は並列）

```
Phase 1 - 初期見解（逐次、前の発言を読んで発言）
  MELCHIOR  → 初期見解
  BALTHASAR → MELを読んで初期見解
  CASPER    → MEL+BALを読んで初期見解

Phase 2 - 反論・議論（逐次、Phase1全体を読んで発言）
  MELCHIOR  → Phase1全体を踏まえ反論/補足
  BALTHASAR → Phase1全体+MEL反論を踏まえ反論/補足
  CASPER    → 上記全てを踏まえ反論/補足

Phase 3 - 投票（並列実行）
  MELCHIOR  → [承認/否決/保留] + 一言コメント (JSON形式で取得)
  BALTHASAR → [承認/否決/保留] + 一言コメント
  CASPER    → [承認/否決/保留] + 一言コメント
  ━━━━━━━━━━━━━━━━━━━━━
  MAGI SYSTEM: 2/3 APPROVED
```

---

## ディレクトリ構成

```
/magi-system-ver2
├── app/
│   ├── layout.tsx                 # ルートレイアウト（ダークテーマ・フォント）
│   ├── page.tsx                   # メインページ（MAGIシステム本体）
│   ├── globals.css                # ダークテーマ・グリッド背景・発光アニメーション
│   ├── settings/
│   │   └── page.tsx               # 設定ページ（人格プロンプト・モデル編集）
│   └── api/
│       ├── magi/
│       │   └── route.ts           # SSEエンドポイント（POST）
│       └── history/
│           └── route.ts           # 会話履歴 CRUD（GET/POST/DELETE）
├── components/
│   ├── magi/
│   │   ├── MAGIHeader.tsx         # タイトル・フェーズインジケーター
│   │   ├── DebateArena.tsx        # 3カラムグリッドコンテナ
│   │   ├── MAGIPanel.tsx          # 各人格パネル（カラー・状態連動）
│   │   ├── VotingResult.tsx       # 投票結果表示（X/3 APPROVED）
│   │   ├── QueryInput.tsx         # 入力フォーム（マルチターン対応）
│   │   ├── ConversationHistory.tsx # 過去の会話一覧（アコーディオン）
│   │   └── StreamingText.tsx      # リアルタイムテキスト表示
│   └── settings/
│       ├── PersonalityEditor.tsx  # 人格プロンプト編集フォーム
│       └── ModelSelector.tsx      # Ollamaモデル名入力
├── hooks/
│   ├── useMAGI.ts                 # 状態管理（useReducer）+ SSE接続
│   └── useSettings.ts             # localStorage設定管理
├── lib/
│   ├── ollama.ts                  # Ollama クライアント（サーバーサイド専用）
│   ├── magi-engine.ts             # 議論エンジン（9回呼び出しのオーケストレーション）
│   ├── personalities.ts           # デフォルト人格プロンプト・カラー定義
│   ├── sse-utils.ts               # SSEパース・エンコードヘルパー
│   └── db.ts                      # SQLite ヘルパー（getAllTurns/insertTurn/clearAllTurns）
├── types/
│   └── magi.ts                    # 全型定義
├── data/
│   └── magi.db                    # SQLite DB（gitignore 対象）
└── docs/
    └── architecture.md            # 本ドキュメント
```

---

## 主要な型定義

```typescript
type PersonalityId = 'MELCHIOR' | 'BALTHASAR' | 'CASPER';
type DebatePhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'complete' | 'error';
type PersonalityStatus = 'idle' | 'thinking' | 'streaming' | 'done';
type VoteResult = '承認' | '否決' | '保留';

interface PersonalityOutput {
  status: PersonalityStatus;
  content: string;           // ストリーミング中の蓄積テキスト
  phase1: string;            // 初期見解（確定済み）
  phase2: string;            // 反論（確定済み）
  vote?: VoteResult;
  voteComment?: string;
}

// SSEイベント（サーバー→クライアント通信プロトコル）
type SSEEvent =
  | { type: 'phase_start'; phase: 1|2|3; personality: PersonalityId }
  | { type: 'text_delta'; personality: PersonalityId; phase: 1|2|3; delta: string }
  | { type: 'vote'; personality: PersonalityId; vote: VoteResult; comment: string }
  | { type: 'personality_done'; personality: PersonalityId; phase: 1|2|3 }
  | { type: 'debate_complete'; approvedCount: number }
  | { type: 'error'; message: string };

// マルチターン会話
interface ConversationTurn {
  id: string;
  query: string;
  outputs: Record<PersonalityId, PersonalityOutput>;
  approvedCount: number;
  timestamp: number;
}
```

---

## SSEプロトコル

APIエンドポイント: `POST /api/magi`

**リクエスト:**
```json
{
  "query": "転職すべきか？",
  "history": [...ConversationTurn],
  "settings": {
    "model": "gpt-oss:20b",
    "personalities": {
      "MELCHIOR": "...",
      "BALTHASAR": "...",
      "CASPER": "..."
    }
  }
}
```

**レスポンス:** `text/event-stream`
```
data: {"type":"phase_start","phase":1,"personality":"MELCHIOR"}

data: {"type":"text_delta","personality":"MELCHIOR","phase":1,"delta":"論理的に"}

data: {"type":"personality_done","personality":"MELCHIOR","phase":1}

...

data: {"type":"vote","personality":"MELCHIOR","vote":"承認","comment":"リスク許容範囲内"}

data: {"type":"debate_complete","approvedCount":2}
```

---

## マルチターン実装

各ターンで過去の会話を人格ごとのコンテキストとして渡す：

```typescript
function buildMessageHistory(history, personalityId) {
  return history.flatMap(turn => [
    { role: 'user', content: turn.query },
    { role: 'assistant', content: turn.outputs[personalityId].phase1
        + '\n[反論・補足]\n' + turn.outputs[personalityId].phase2 },
  ]);
}
```

---

## UIビジュアル設計

**カラーコーディング:**
- MELCHIOR: 青系 (`blue-400`, glow: `#60a5fa`)
- BALTHASAR: 緑系 (`emerald-400`, glow: `#34d399`)
- CASPER: 琥珀色 (`amber-400`, glow: `#fbbf24`)

**テーマ:** ダーク・サイバーパンク風
- 深黒背景 + ファインドグリッドライン
- ネオン発光ボーダー（状態変化でアニメーション）
- thinking中: ボーダー点滅
- streaming中: 安定した発光
- 等幅フォント (JetBrains Mono)

**パネル状態:**
| 状態 | 表示 |
|------|------|
| idle | STANDBY / グレー |
| thinking | PROCESSING / 黄色・点滅 |
| streaming | TRANSMITTING / 緑 |
| done | COMPLETE / グレー |

---

## 会話履歴の永続化

**DBファイル:** `data/magi.db`（gitignore 対象）

**スキーマ:**
```sql
CREATE TABLE conversation_turns (
  id             TEXT    PRIMARY KEY,
  query          TEXT    NOT NULL,
  outputs        TEXT    NOT NULL,  -- JSON (Record<PersonalityId, PersonalityOutput>)
  approved_count INTEGER NOT NULL,
  timestamp      INTEGER NOT NULL
);
```

**API:**
| メソッド | パス | 内容 |
|---------|------|------|
| GET | `/api/history` | 全ターンを timestamp 昇順で返す |
| POST | `/api/history` | `ConversationTurn` を1件保存 |
| DELETE | `/api/history` | 全ターン削除 |

**クライアント側フロー (`useMAGI.ts`):**
- マウント時 → `GET /api/history` → `LOAD_HISTORY` dispatch
- 議論完了時 → `POST /api/history`（fire-and-forget）
- NEW SESSION → `DELETE /api/history`

---

## 設定

**localStorage キー:** `magi-settings`

```json
{
  "model": "gpt-oss:20b",
  "personalities": {
    "MELCHIOR": "カスタムシステムプロンプト",
    "BALTHASAR": "...",
    "CASPER": "..."
  }
}
```

---

## 起動方法

```bash
# ローカル（デフォルト: http://localhost:11434）
npm run dev

# LAN内の別マシンで Ollama が動いている場合
OLLAMA_BASE_URL=http://192.168.1.x:11434 npm run dev

# プロダクション
OLLAMA_BASE_URL=http://192.168.1.x:11434 npm run build
OLLAMA_BASE_URL=http://192.168.1.x:11434 npm run start
```

`OLLAMA_BASE_URL` は起動コマンドにシェル変数として渡す。`.env` ファイルは使用しない。

---

## 人格デフォルトプロンプト

| 人格 | 役割 | スタイル |
|------|------|---------|
| MELCHIOR-1 | 科学者・論理家 | 客観的データ・演繹的・300字 |
| BALTHASAR-2 | 慈母・倫理家 | 共感的・倫理優先・300字 |
| CASPER-3 | 直感・創造家 | 自由奔放・革新的・300字 |
