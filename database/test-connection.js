// データベース接続テスト用スクリプト
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  console.log('データベース接続をテストしています...');
  
  try {
    // 接続テスト
    const client = await pool.connect();
    console.log('✅ データベース接続成功');
    
    // テーブル存在確認
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 既存テーブル:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // カテゴリーデータ確認
    if (tableCheck.rows.some(row => row.table_name === 'categories')) {
      const categoriesResult = await client.query('SELECT * FROM categories ORDER BY position');
      console.log('📝 カテゴリー一覧:');
      categoriesResult.rows.forEach(cat => {
        console.log(`  - ${cat.name} (位置: ${cat.position})`);
      });
    }
    
    // レシピ数確認
    if (tableCheck.rows.some(row => row.table_name === 'recipes')) {
      const recipeCount = await client.query('SELECT COUNT(*) as count FROM recipes');
      console.log(`📖 登録レシピ数: ${recipeCount.rows[0].count}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ データベース接続エラー:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('🔧 解決策: ネットワーク接続またはDATABASE_URLを確認してください');
    } else if (error.code === '28P01') {
      console.log('🔧 解決策: データベースの認証情報を確認してください');
    } else if (error.code === '42P01') {
      console.log('🔧 解決策: データベースのテーブルが存在しません。init.sqlを実行してください');
    }
    
    process.exit(1);
  }
  
  console.log('✨ テスト完了');
  process.exit(0);
}

// 実行
testConnection();