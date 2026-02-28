# MAGI SYSTEM ver.2

エヴァンゲリオンの [MAGI システム](https://evangelion.fandom.com/wiki/Magi) をインスパイアした、ローカル LLM による合議型 AI Web アプリ。

3つの AI 人格 **MELCHIOR**・**BALTHASAR**・**CASPER** が問いに対して議論し、最終的に「承認 / 否決 / 保留」で投票して合議結果を出す。

```
MAGI SYSTEM: 2/3 APPROVED
```

---

## デモ

```
Phase 1 — 初期見解（逐次、前の発言を踏まえて）
  MELCHIOR  → 論理・データに基づく初期見解
  BALTHASAR → MELCHIOR を読んで倫理的観点から見解
  CASPER    → 両者を読んで直感・創造的視点から見解

Phase 2 — 反論・議論（逐次、Phase 1 全体を踏まえて）
  MELCHIOR  → 反論 / 補足
  BALTHASAR → 反論 / 補足
  CASPER    → 反論 / 補足

Phase 3 — 投票（並列実行）
  MELCHIOR  [承認]  BALTHASAR [否決]  CASPER [承認]
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MAGI SYSTEM: 2/3 APPROVED
```

---

## 特徴

- **リアルタイムストリーミング** — SSE (Server-Sent Events) で3人格の発言を逐次表示
- **会話継続** — 過去のターンを各人格のコンテキストとして引き継ぎ
- **SQLite 永続化** — ページリロード後も会話履歴を復元
- **セッション管理** — NEW SESSION / 続きから / 個別削除でフレキシブルに履歴を活用
- **カスタマイズ** — モデル名・人格プロンプトを設定画面から変更可能
- **ローカル完結** — Ollama を使用。データが外部に出ない

---

## 必要なもの

- [Node.js](https://nodejs.org/) v18 以上
- [Ollama](https://ollama.com/) — ローカル LLM ランタイム

---

## セットアップ

### 1. Ollama のインストールとモデルの準備

```bash
# Ollama をインストール（https://ollama.com/download）

# お好みのモデルを pull（デフォルト: gpt-oss:20b）
ollama pull gpt-oss:20b

# Ollama サーバーを起動（通常は自動起動）
ollama serve
```

### 2. リポジトリのクローンとインストール

```bash
git clone https://github.com/ikd9684/magi-system-ver2.git
cd magi-system-ver2
npm install
```

### 3. 起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

---

## Ollama が別マシン（LAN）にある場合

```bash
OLLAMA_BASE_URL=http://192.168.1.x:11434 npm run dev
```

> **Note** — `.env` ファイルは使用しません。起動コマンドにシェル変数として渡してください。

---

## 使い方

### 問いを投げる

入力欄に問いを入力して送信。3人格が順番に議論し、投票結果が表示される。

### モデル・人格プロンプトの変更

右上の **SETTINGS** から変更できる（ストリーミング中はアクセス不可）。

### 会話の続け方

| 操作 | 説明 |
|------|------|
| そのまま次の問いを入力 | 同じセッション内で会話を継続（過去ターンがコンテキストに含まれる） |
| **続きから** ボタン | 特定のターン以降をコンテキストとして再開 |
| **NEW SESSION** | コンテキストをリセット（履歴は残る） |
| **HISTORY (N)** | ヘッダーのボタンで履歴セクションを表示 |

> 入力欄のプレースホルダーが「N件の履歴をコンテキストに含めて会話中...」になっていれば、過去の発言が LLM に渡されている状態。

---

## 3人格のデフォルト設定

| 人格 | 役割 | スタイル |
|------|------|---------|
| **MELCHIOR-1** | 科学者・論理家 | 客観的データ・演繹的・300字 |
| **BALTHASAR-2** | 慈母・倫理家 | 共感的・倫理優先・300字 |
| **CASPER-3** | 直感・創造家 | 自由奔放・革新的・300字 |

設定画面からシステムプロンプトを自由に書き換えられる。

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| LLM | Ollama (ローカル) |
| 通信 | SSE (Server-Sent Events) |
| 履歴永続化 | SQLite (`better-sqlite3`) |
| 設定永続化 | localStorage |

---

## ディレクトリ構成

```
├── app/
│   ├── api/magi/          # SSE エンドポイント
│   ├── api/history/       # 会話履歴 CRUD
│   ├── settings/          # 設定ページ
│   └── page.tsx           # メインページ
├── components/magi/       # UI コンポーネント
├── contexts/              # React Context（グローバル状態）
├── hooks/                 # useMAGI / useSettings
├── lib/                   # エンジン・DB・Ollama クライアント
├── types/                 # 型定義
└── docs/architecture.md   # 詳細アーキテクチャ仕様
```

詳細は [`docs/architecture.md`](docs/architecture.md) を参照。

---

## macOS でのローカルネットワーク制限について

macOS 16 (Sequoia 以降) では、Node.js プロセスからのローカルネットワークアクセスがプライバシー制限でブロックされる場合がある。本プロジェクトでは `curl` サブプロセス経由で Ollama と通信することでこれを回避している（`lib/ollama.ts`）。

---

## ライセンス

MIT
