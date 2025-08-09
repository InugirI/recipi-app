# レシピアプリ

Node.js + Express + PostgreSQL を使用したレシピ管理アプリケーション

## 環境要件

- Node.js (v16以上推奨)
- PostgreSQL データベース（ローカルまたはクラウド）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成し、以下の環境変数を設定：

```env
DATABASE_URL="postgresql://username:password@host:port/database"
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. データベースの初期化

PostgreSQLデータベースに接続し、テーブルを作成：

```bash
# PostgreSQLクライアントでSQLファイルを実行
psql -d your_database_url -f database/init.sql

# または、pgAdminやSupabaseのSQL Editorで database/init.sql の内容を実行
```

### 4. データベース接続テスト

```bash
node database/test-connection.js
```

### 5. サーバー起動

```bash
npm start
```

サーバーは http://localhost:3000 で起動します。

## トラブルシューティング

### データベース接続エラーの場合

1. **接続情報の確認**: `.env` ファイルの `DATABASE_URL` が正しいか確認
2. **テーブル作成**: `database/init.sql` を実行してテーブルを作成
3. **接続テスト**: `node database/test-connection.js` でデバッグ情報を確認

### よくあるエラー

- **ENOTFOUND**: ネットワーク接続またはホスト名の問題
- **28P01**: 認証情報（ユーザー名/パスワード）の問題
- **42P01**: テーブルが存在しない（init.sqlを実行）

## API エンドポイント

- `GET /api/recipes` - レシピ一覧取得
- `POST /api/recipes` - レシピ作成
- `PUT /api/recipes/:id` - レシピ更新
- `DELETE /api/recipes/:id` - レシピ削除
- `GET/POST /api/recipes/:id/comments` - コメント関連
- `POST/DELETE /api/recipes/:id/like` - いいね関連
- `GET /api/categories` - カテゴリー一覧
- `PUT /api/categories/order` - カテゴリー順序変更