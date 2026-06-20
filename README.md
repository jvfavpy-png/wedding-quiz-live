# Wedding Quiz Live

結婚式・二次会向けのリアルタイム早押し4択クイズWebアプリです。主催者PC、ゲストのスマホ、プロジェクター用スクリーンを Supabase Realtime で同期します。

## 技術

- Next.js App Router / TypeScript / Tailwind CSS
- Supabase PostgreSQL / Realtime / RPC / RLS
- Vercel デプロイ想定

## セットアップ

1. 依存関係を入れます。

```bash
npm install
```

2. `.env.example` を参考に `.env.local` を作成します。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` はサーバー側のイベント作成と管理者セッション検証で使います。ブラウザへは出しません。

3. Supabase SQL Editor で以下を順に実行します。

```sql
-- 1. テーブル、RLS、RPC、Realtime publication
-- supabase/schema.sql の全文

-- 2. 開発確認用デモデータ
-- supabase/seed.sql の全文
```

4. ローカル起動します。

```bash
npm run dev
```

## 画面

- 主催者作成: `/admin`
- 管理画面: `/admin/[roomCode]`
- ゲスト参加: `/join/[roomCode]`
- スクリーン表示: `/screen/[roomCode]`

## 事前準備の流れ

1. `/admin` でイベントを作成します。
2. 管理者用パスワードを設定します。
3. `/admin/[roomCode]` を安全な場所に保存します。
4. 管理画面の `A. イベント基本情報` でイベント名を確認・編集します。
5. `B. URL管理` で参加URL、スクリーンURL、管理URLを確認・コピーします。
5. `C. クイズ作成・編集` で問題、選択肢、正解、制限時間、難易度、基本得点、速度ボーナス有無を保存します。
6. `D. リハーサル・練習` で参加URLとスクリーンURLを開き、当日の動作を確認します。
7. リハーサル後は `回答・得点をリセット` を押してから本番を開始します。
8. 終了後も管理画面から `終了状態を解除して待機に戻す`、または `回答・得点をリセットして再利用する` ができます。

友人やゲストへ送るのは参加URLだけです。管理URLでは、問題編集や進行操作ができます。ゲスト、スクリーン、公開チャットには共有しないでください。

## Vercel デプロイ前チェック

友人テストで共有する前に、以下を必ず確認してください。

- GitHub に `.env.local` をコミットしない。
- `SUPABASE_SERVICE_ROLE_KEY` は GitHub、ブラウザ、スクリーン、ゲスト画面に絶対に出さない。
- `SUPABASE_SERVICE_ROLE_KEY` に `NEXT_PUBLIC_` を付けない。
- 友人へ送るのは `join URL` だけです。
- 管理URLは管理操作ができる大切なURLなので、絶対に共有しないでください。
- Vercel 本番環境で `NEXT_PUBLIC_APP_URL=http://localhost:3000` のままにしない。

Vercel の Environment Variables には以下を登録します。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=https://wedding-quiz-live.vercel.app
```

`NEXT_PUBLIC_APP_URL` は実際に公開される Vercel の本番URLにしてください。例:

```bash
NEXT_PUBLIC_APP_URL=https://wedding-quiz-live.vercel.app
```

この値はイベント作成時の管理URL、参加URL、スクリーンURLの生成に使われます。Vercelで設定を変更した場合は再デプロイしてください。

URL生成の優先順位:

1. `NEXT_PUBLIC_APP_URL`
2. ブラウザで取得できる `window.location.origin`
3. `http://localhost:3000`

ローカル開発では以下にしてください。

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vercel本番では以下のような公開URLにしてください。

```bash
NEXT_PUBLIC_APP_URL=https://wedding-quiz-live.vercel.app
```

Vercel 公開後に成立するURL:

- 主催者作成: `https://your-project.vercel.app/admin`
- ゲスト参加: `https://your-project.vercel.app/join/[roomCode]`
- スクリーン表示: `https://your-project.vercel.app/screen/[roomCode]`
- 管理画面: `https://your-project.vercel.app/admin/[roomCode]`

公開前の最終コマンド:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## 主催者の使い方

1. `/admin` でイベントを作成します。
2. イベント作成時に、管理者用パスワードを6文字以上で設定します。
3. 自動遷移した管理画面でイベント名、URL、問題を確認・編集します。
3. 表示された参加URLだけをゲストへ共有します。
4. スクリーンURLをプロジェクターで開きます。
5. 本番前に同じURLでリハーサルします。
6. リハーサル後は `回答・得点をリセット` してから本番を開始します。
7. `問題開始`、`回答締切`、`正解発表`、`ランキング表示` の順に進行します。
8. 最後に `イベント終了` を押します。
9. 終了後に再利用する場合は `終了状態を解除して待機に戻す`、または `回答・得点をリセットして再利用する` を押します。

採点事故を避けるため、回答済みのある問題はそのまま編集・削除できません。終了後に問題文や正解、得点を直す場合は、先に `回答・得点をリセット` してください。イベント名、問題、URLはリセットしても残ります。

管理画面を開くときは、管理者用パスワードを入力します。認証されていない場合、問題編集や進行操作はできません。
管理URLは大切なURLです。ゲスト、友人、スクリーン投影先には共有しないでください。

管理URLを共有してしまった場合は、管理画面の `管理者用パスワード` セクションからパスワードを変更してください。参加URLとスクリーンURLは変わりません。

## ゲストの使い方

1. 参加URLまたはQRコードを開きます。
2. 名前を入力して参加します。同じ名前も利用できます。
3. 問題が表示されたら4択から1つ選びます。
4. 回答後は変更できません。
5. 正解発表時に自分の回答、正誤、獲得点が表示されます。
6. ランキング表示時に自分の順位が表示されます。

参加者情報は端末の `localStorage` に保存されます。消した場合は再参加扱いです。

## スクリーン画面

スクリーン画面は表示専用です。回答ボタンや管理操作は置いていません。

- 待機中: QRコード、参加URL、参加人数
- 回答受付中: 問題、選択肢、大きなカウントダウン、回答数
- 締切後: 回答分布
- 正解発表: 正解と分布
- ランキング: TOP10
- 終了: 最終結果

## DB / RPC の安全設計

- `answers` は `unique(question_id, participant_id)` で二重回答を防止します。
- 回答可否、時間切れ、participantToken照合、採点、score加算は `submit_answer` RPC で実行します。
- 問題ごとの `difficulty`、`base_points`、`speed_bonus_enabled` は `questions` に保存します。
- 正解時の点数は `questions.base_points + speed_bonus` です。`speed_bonus_enabled=false` の問題は基本得点のみです。
- `answers` には最終点 `point` に加えて、発表時の表示用に `base_points` と `speed_bonus` も保存します。
- 管理者用パスワードは `events.admin_password_hash` にハッシュとして保存します。平文では保存しません。
- `participants.score`、`answers`、`live_state` はクライアントから直接変更できません。
- 公開RPCは内部管理情報、`participant_token`、回答前の `correct_index` を返しません。
- `get_ranking` は `ranking` / `finished` phase の時だけ公開ランキングを返します。
- 回答分布は `question_stats` に集計し、Realtime は集計テーブルを購読します。

速度ボーナス:

- 0〜2000ms: +50
- 2001〜4000ms: +40
- 4001〜6000ms: +30
- 6001〜8000ms: +20
- 8001ms以降: +10

難易度ごとの初期得点:

- `easy`: 50点
- `normal`: 100点
- `hard`: 150点
- `special`: 200点
- `final`: 300点

Supabaseに適用するSQL:

新規Supabaseプロジェクトの場合:

1. `supabase/schema.sql` の全文を実行します。
2. 必要であれば `supabase/seed.sql` を実行します。

既存Supabaseプロジェクトを更新する場合:

1. `supabase/migrations/20260620_safe_update_admin_password_and_rehearsal.sql` を実行します。
2. すでに上記migrationを適用済みで、`function gen_salt(unknown) does not exist` が出る場合は `supabase/migrations/20260620_fix_pgcrypto_schema_and_password_min_length.sql` を追加で実行します。
2. 既存データは削除されません。
3. このmigrationには `DROP TABLE`、`TRUNCATE`、実行時に既存データを消す `DELETE FROM` は含めていません。

既存イベントで管理者用パスワードが未設定の場合、古い管理URLに含まれていた内部キーを一度だけパスワード欄に入力して管理画面へ入れます。その後、管理画面の `管理者用パスワード` セクションから新しいパスワードに変更してください。

## リハーサル手順

1. `/admin` でイベントを作成できる。
2. roomCode が発行され、参加URL・スクリーンURL・QRが表示される。
3. `/join/[roomCode]` から名前入力で参加できる。
4. 同じ名前でも別参加者として参加できる。
5. ゲスト画面をリロードしても同じ参加者として復元される。
6. `/screen/[roomCode]` にQRと参加人数が表示される。
7. 主催者が問題開始でき、ゲストとスクリーンに問題が出る。
8. ゲストが4択回答でき、回答後は再回答できない。
9. 連打しても二重回答にならない。
10. 制限時間後の回答が拒否される。
11. 回答締切、正解発表、ランキング表示の順に進行できる。
12. 正解者に問題ごとの基本得点と、設定に応じた速度ボーナスが入る。
13. 不正解者は0点になる。
14. 回答分布が表示される。
15. TOP10ランキングが表示される。
16. 管理者用パスワードなしでは操作できない。
17. スマホ幅 360px / 390px で横スクロールせず使える。
18. 1366x768 と 1920x1080 のスクリーンで文字が読める。
19. `npm run lint` が成功する。
20. `npm run build` が成功する。

## 友人テスト前チェック

管理画面の `友人テスト前チェック` で、以下を確認してください。チェック状態はブラウザの `localStorage` に保存されます。

- イベント名を設定した
- 問題を1問以上作成した
- 参加URLをスマホで開けた
- スクリーンURLを開けた
- 回答・得点をリセットした
- 管理URLを友人に送らないことを確認した
- 友人には参加URLだけ送る
- 問題開始からランキング表示まで1回通した

回答や得点が残っている場合、管理画面に「リハーサルの回答や得点が残っています。本番前にリセットしてください。」と表示されます。本番前は `回答・得点をリセット` を押してください。イベント名、問題、URLは残ります。

## 本番中の事故対応

### 主催者が間違ったボタンを押しそうな時

- 操作ボタンは phase に応じて disabled になります。
- `正解発表` は回答数が参加者数より少ない場合に確認が出ます。
- `ランキング表示` は直前に最新状態を再取得して確認が出ます。
- `イベント終了` は roomCode 入力が一致しないと実行されません。

### 画面を閉じた、またはリロードした時

- 管理画面は `/admin/[roomCode]` から現在 phase、現在問題、回答分布、ランキングを再取得します。操作には管理者用パスワード認証が必要です。
- ゲスト画面は `localStorage` の `participantId` と `participantToken` から同じ参加者として復元します。
- スクリーン画面は roomCode から現在状態を再取得します。
- Realtime が遅延しても 15 秒間隔のバックアップ再取得と手動 `再取得` ボタンで復旧できます。

### QRコードが読めない時

- スクリーン画面には参加URLと roomCode を併記しています。
- ゲストには参加URLを直接送るか、roomCode を主催者に確認してもらってください。

### ゲストが名前を間違えた時

- 参加後のゲスト画面に `名前修正` があります。
- 同姓同名は許可されます。内部の `participantId` と `participantToken` で別参加者として扱います。

### 管理URLを共有してしまった時

- 管理URLは表示をマスクし、コピー時に警告を出します。
- 管理者用パスワードが未入力、または不正な場合は管理操作画面をロックします。
- 管理URLをゲストへ共有してしまった場合は、管理者用パスワードを変更してください。参加URLとスクリーンURLは変わりません。

### 回答やランキングが不安な時

- 回答判定、締切判定、採点、score 加算は `submit_answer` RPC 側で行います。
- 二重回答は `unique(question_id, participant_id)` と RPC 内チェックで拒否します。
- 正解発表やランキング前に主催者画面の `最新状態に更新` を押してください。

## 事故別対応状況

| 事故 | 対応状況 | 実装・復旧導線 |
|---|---|---|
| 主催者が間違ったボタンを押す | 対応済み | phase別disabled、次操作表示、低回答数確認 |
| 主催者画面を閉じる/リロードする | 対応済み | roomCode + httpOnly Cookie で管理snapshot再取得 |
| スクリーン画面がリロードされる | 対応済み | roomCode で現在状態へ復帰 |
| ゲストがリロードする | 対応済み | localStorage から参加者復元 |
| ゲストが回答ボタンを連打する | 対応済み | 送信中disabled、DB unique、RPC重複拒否 |
| 締切直後に回答が送信される | 対応済み | サーバー時刻で締切再判定 |
| 通信が一時的に切れる | 対応済み | エラー表示、手動再取得、15秒バックアップ再取得 |
| Realtimeが遅延する | 対応済み | 集計テーブル購読、手動/定期再取得 |
| QRコードが読み取れない | 対応済み | 参加URLとroomCode併記 |
| ゲストが名前を入れ間違える | 対応済み | 参加後の名前修正 |
| 同姓同名がいる | 対応済み | 内部ID/tokenで区別 |
| 参加URLを間違える | 対応済み | 専用エラー表示、roomCode確認案内 |
| 管理URLがゲストに共有される | 対応済み | 表示マスク、コピー警告、管理者用パスワード変更 |
| 管理者用パスワードが不正 | 対応済み | 管理画面ロック、API 401 |
| イベント終了を誤って押す | 対応済み | roomCode入力確認 |
| 回答数が少ないまま正解発表 | 対応済み | 低回答数確認 |
| スコアが二重加算される | 対応済み | RPC内insert後加算、unique制約 |
| ランキングが古いまま表示される | 対応済み | 表示前再取得、手動/定期再取得 |
| 制限時間がズレて見える | 対応済み | snapshotのserverNowで表示補正 |
| 100人同時回答でDB更新が競合する | 対応済み | RPC同一transaction、atomic score加算、集計upsert |

## 自動テスト

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

追加済みの主なテスト:

- `src/lib/scoring.test.ts`: 速度ボーナス、難易度別初期点、基本得点範囲、得点計算
- `src/lib/admin-run-rules.test.ts`: イベント名更新、リセット時にquestions/basePointsを保持しanswers/scoreだけ初期化
- `src/lib/room.test.ts`: roomCode生成とURL生成
- `src/lib/participant-session.test.ts`: participantToken復元と壊れたlocalStorage値の削除
- `src/lib/game-rules.test.ts`: submit_answer相当の二重回答、締切後、不正participant、score二重加算防止、管理認証、phase遷移
- `src/lib/admin-password.test.ts`: 管理者用パスワードの未入力、5文字以下、6文字OK、確認不一致、placeholder
- `src/lib/rehearsal-status.test.ts`: リハーサル結果残り警告と開始前確認条件
- `src/lib/ranking.test.ts`: ranking算出

現時点の自動テストは純粋ロジック中心です。Supabase 実DBに対する RPC / RLS の結合テストと、複数ブラウザタブ E2E は手動確認が必要です。

## 既知の制限

- ゲスト認証、メールログイン、決済、景品管理、CSVエクスポートは未実装です。
- 1端末1参加を `localStorage` で扱います。端末やブラウザを変えると別参加者になります。
- Realtime が遅延・切断する環境では15秒間隔のバックアップ再取得と手動再取得で復帰します。
- 管理者用パスワードは変更できますが、より厳密な監査ログや操作履歴は未実装です。
- 実運用前に Supabase の Realtime quotas と同時接続上限を確認してください。

## 今後の拡張案

- 管理者ログイン
- 問題インポート/エクスポート
- 最終問題倍率
- チーム戦
- リハーサル用の自動回答シミュレーター
