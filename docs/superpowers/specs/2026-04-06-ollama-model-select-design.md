# Design: OLLAMA MODEL NAME セレクトボックス化

**Date:** 2026-04-06
**Status:** Approved

## Overview

設定画面の OLLAMA MODEL NAME フィールドをテキスト入力からセレクトボックスに変更する。選択肢は Ollama API から動的に取得する。

## Architecture

### New: `app/api/ollama-models/route.ts`

- `GET /api/ollama-models` エンドポイントを新設
- サーバー側で curl を使い `http://localhost:11434/api/tags` を呼ぶ（既存 `lib/ollama.ts` と同じパターン）
- レスポンス:
  - 成功: `{ models: string[] }` — モデル名の配列 (200)
  - 失敗: `{ error: string, models: [] }` (500)

### Modified: `components/settings/ModelSelector.tsx`

- テキスト input → `<select>` に置き換え
- マウント時に `/api/ollama-models` を fetch
- リフレッシュボタンで再取得可能
- ローディング中: セレクト無効化 + "Loading..." 表示
- 取得失敗時: "Failed to load models" エラー表示、セレクト無効化
- 現在の設定値がリストにない場合: リスト先頭を自動選択
- 既存のサジェストボタン（6個）は削除

## Data Flow

```
ModelSelector mount
  → fetch /api/ollama-models
    → server: curl http://localhost:11434/api/tags
    → parse model names
    → return { models: [...] }
  → render <select> with options
  → onChange → updateModel(value) → localStorage
```

## Out of Scope

- "その他" による手動入力フォールバック
- ハードコードリストへのフォールバック
- モデルのバリデーション
