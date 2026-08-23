# Pico開発ガイド

Picoは、ReactとViteで構築し、Cloudflare Workersから静的ファイルとして配信するシングルページアプリケーションです。
サーバー側のスクリプト、レンダリング、ストレージは使用しません。

## 開発環境

[mise](https://mise.jdx.dev/)を使うと、リポジトリで指定しているNode.js、pnpm、pinactのバージョンをまとめて導入できます。

```sh
mise install
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` が表示するURLをブラウザで開いてください。

## コマンド

| コマンド               | 用途                                   |
| ---------------------- | -------------------------------------- |
| `pnpm dev`             | 開発サーバーを起動する                 |
| `pnpm check`           | フォーマット、Lint、型を検査する       |
| `pnpm test`            | 単体テストを1回実行する                |
| `pnpm test:coverage`   | カバレッジを計測する                   |
| `pnpm build`           | 本番用の静的ファイルを生成する         |
| `pnpm storybook`       | Storybookを起動する                    |
| `pnpm build-storybook` | Storybookをビルドする                  |
| `pnpm security:audit`  | moderate以上の依存関係脆弱性を検査する |

変更を送る前に、最低限次の検査を実行します。

```sh
pnpm check
pnpm test
pnpm build
```

## ディレクトリ構成

| パス                     | 責務                                         |
| ------------------------ | -------------------------------------------- |
| `src/features/editor/`   | コード編集、言語判定、シンタックスハイライト |
| `src/features/preview/`  | 画面上のコードフレームと出力対象の描画       |
| `src/features/settings/` | テーマ、フォント、フレーム設定とURLへの同期  |
| `src/features/export/`   | PNGとSVGの生成、フォントの埋め込み           |
| `src/features/toolbar/`  | 言語選択とコピー、保存、リンク共有の操作     |
| `src/components/`        | 複数の機能から使うUIコンポーネント           |
| `public/fonts/`          | 配信するUDEV Gothicのサブセットとライセンス  |

コードと表示設定はURLのクエリパラメーターへ同期します。
共有時はコードを圧縮してURLへ格納するため、アプリケーション用のサーバー側ストレージは不要です。

## 設計方針

- 初回表示では、エディターと出力に必要な操作だけを見せる。
- 設定項目を増やすより、用途が明確な選択肢を厳選する。
- 詳細設定はサイドバーにまとめ、編集と出力の流れから分離する。

## 対応言語

言語選択には、Shiki 4.4.3に含まれる単独利用可能な言語とPico独自のCUDA文法を登録しています。
カタログはShikiと自動同期せず、依存関係の更新で選択肢が意図せず増減しないように管理します。

次の30言語は自動判定にも対応しています。

TSX、TypeScript、JSX、JavaScript、C、C++、CUDA、Rust、LLVM IR、Python、Java、Go、C#、Kotlin、Swift、Dart、Scala、Ruby、PHP、Shell、PowerShell、SQL、JSON、YAML、HTML、XML、CSS、Lua、R、Elixir。

## フォント

Geist Mono、JetBrains Mono、日本語用のUDEV Gothicサブセットを同梱しています。
画面では選択したフォントだけを読み込み、画像には選択したフォントだけを埋め込みます。

UDEV Gothicのサブセットを更新する手順は[`public/fonts/README.md`](../public/fonts/README.md)を参照してください。

## デプロイ

GitHub Actionsは、CIが成功した同一リポジトリ内のPull Requestを公開プレビューへデプロイします。
ForkからのPull Requestにはデプロイ用の認証情報を渡さないため、プレビューを作成しません。

`main`へのpushは、CIの成功後に本番環境の<https://pico.r4ai.dev>へデプロイします。
どちらも[`wrangler.jsonc`](../wrangler.jsonc)の設定に従い、Cloudflare Workers Static Assetsを利用します。

リポジトリには次のGitHub Actions secretsが必要です。

| Secret                  | 値                                                                        |
| ----------------------- | ------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & PagesのAccount ID。Zone IDではありません。                      |
| `CLOUDFLARE_API_TOKEN`  | Workers Scripts Writeと`r4ai.dev`のWorkers Routes Writeを許可したトークン |

トークンにDNS、KV、R2の権限は不要です。
Custom DomainのDNSレコードと証明書はCloudflareが作成します。

依存関係とGitHub Actionsの更新方針は[サプライチェーンガイド](./supply-chain.md)を参照してください。
