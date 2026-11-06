/**
 * Public, anonymized system examples. Keep personal career details and client
 * identifiers out of this file. Both the website and AI consultation use it.
 * @typedef {{id: string, category: string, title: string, overview: string,
 * purpose: string, features: {title: string, description: string}[],
 * design: string[], stack: {label: string, value: string}[], tech: string[]}} CaseStudy
 */

/** @type {readonly CaseStudy[]} */
export const caseStudies = [
  {
    id: 'ec-operations', category: 'EC・業務自動化',
    title: 'ECサイト運営のAI管理・自動化システム',
    overview: '商品リサーチから出品・在庫管理、顧客対応までを統合するEC運営システム。生成AIと外部APIを組み合わせ、Web管理画面から商品情報と処理状況を確認できます。',
    purpose: '日々のEC運営業務を一元管理し、情報の分析と定型作業の自動化を支援。',
    features: [
      { title: '商品リサーチ・分析', description: '商品情報・画像の解析、需要と収益性の分析、リサーチ結果の管理に対応。' },
      { title: '商品情報生成・出品管理', description: 'タイトル・説明文の生成と、外部ECプラットフォームAPIを介した出品・在庫管理を連携。' },
      { title: '顧客対応・商品台帳', description: '問い合わせ対応の自動化と、商品情報・在庫情報・処理状況の管理を統合。' },
      { title: '定期実行・履歴管理', description: 'バックグラウンド処理を定期実行し、実行履歴とエラーを管理。' },
    ],
    design: [
      'FastAPIのバックエンドAPIとJinja2のWeb管理画面を連携し、商品情報・処理履歴をSQLiteで管理。',
      '複数LLM・APIプロバイダーの差異を共通インターフェースで吸収。環境変数で接続先を切り替える構成。',
      '管理画面と自動化処理を連携させ、操作からバックグラウンド実行までの動作を検証。',
    ],
    stack: [
      { label: '画面・API', value: 'Python / FastAPI / Jinja2 / HTML / CSS / JavaScript' },
      { label: 'データ・連携', value: 'SQLite / 外部ECプラットフォームAPI / マルチLLM' },
      { label: '実行環境', value: 'Linux' },
    ],
    tech: ['Python', 'FastAPI', 'Jinja2', 'SQLite', 'マルチLLM'],
  },
  {
    id: 'ai-agent-platform', category: 'AI・業務判断支援',
    title: '会計・税務業務を支援するAIエージェント基盤',
    overview: '取引の背景や関連資料を参照し、必要な業務処理を選択・実行するAIエージェント基盤。勘定科目の候補提示、税務判断の材料整理、不足資料の確認を支援し、税務上の最終判断は税理士が行う構成です。',
    purpose: '業務データと参照情報を結び付け、専門家が根拠を確認できる判断支援を実現。',
    features: [
      { title: '仕訳・勘定科目の候補提示', description: '領収書、取引履歴、事業内容を踏まえ、勘定科目の候補と判断根拠を提示。' },
      { title: '税務情報の検索・照合', description: 'RAGで税法・通達等を検索し、取引の事実関係と照合して判断材料を整理。' },
      { title: '不足資料の検出・照会', description: '入出金と請求書等を照合し、不足資料の検出、照会文面の生成、後続処理を制御。' },
      { title: 'ツール連携・処理選択', description: 'Tool Callingで外部ツールや業務データを参照し、状況に応じた処理を選択・実行。' },
    ],
    design: [
      'Python・JavaScriptとPiを用いてエージェントの実行・制御を構成し、Claude APIと外部ツールを連携。',
      'AIの提示内容を人が確認するHuman-in-the-Loop方式を採用。税務上の最終判断をAIだけで確定しない。',
      'エージェント制御、外部ツール連携、業務処理、専門家による確認フローを検証。',
    ],
    stack: [
      { label: '実行・制御', value: 'Python / JavaScript / Pi / Tool Calling' },
      { label: 'AI・データ', value: 'Claude API / RAG / SQLite' },
      { label: '実行環境', value: 'Windows' },
    ],
    tech: ['Python', 'JavaScript', 'Pi', 'Claude API', 'SQLite', 'RAG'],
  },
  {
    id: 'knowledge-memory', category: '社内ナレッジ・対話',
    title: 'Teams連携の対話・ナレッジ管理システム',
    overview: 'Teams上の業務コミュニケーションから、知識・決定事項・判断経緯を収集して構造化するシステム。蓄積した情報を対話で参照でき、情報の訂正・更新・忘却までを管理します。',
    purpose: '業務知識の属人化や消失を防ぎ、過去の決定とその経緯を再利用できる状態へ。',
    features: [
      { title: 'Teams連携・継続収集', description: 'Microsoft Graph APIでメッセージを継続収集し、Teams Botでメッセージ送受信と対話を実行。' },
      { title: '知識の抽出・参照', description: 'ローカルLLMで業務知識や判断経緯を抽出・構造化し、会話履歴とともに保存して対話時に参照。' },
      { title: '訂正・更新・履歴管理', description: '記憶の訂正、旧情報の無効化、変更履歴の管理に対応。確認済みのフィードバックを後続の対話に反映。' },
      { title: '忘却・削除の管理', description: '論理削除を基本とし、所定条件で物理削除を行うハイブリッド型の忘却機能。' },
    ],
    design: [
      'Teamsの情報収集、LLMによる知識抽出、SQLiteでの永続化、Botの対話処理を連携。',
      '保存するだけでなく、訂正・旧情報の無効化・削除までを扱う情報ライフサイクルを設計。',
      '確認済みのフィードバックを記憶に反映し、更新された情報を後続の対話で利用。',
    ],
    stack: [
      { label: 'アプリ・連携', value: 'Python / Microsoft Graph API / Microsoft Bot Framework / Teams' },
      { label: 'AI・データ', value: 'Ollama / SQLite' },
      { label: '実行環境', value: 'Windows' },
    ],
    tech: ['Python', 'Ollama', 'SQLite', 'Microsoft Graph API', 'Teams'],
  },
  {
    id: 'public-documents', category: 'AI・文書検索',
    title: 'AIを活用した公開文書管理システム',
    overview: '自治体職員向けに、公開文書の管理・自動分類・自然文検索を提供するシステム。文書を整理する画面から、検索した文書を参照した回答生成までをつなぐ構成です。',
    purpose: '蓄積された文書を分類・整理し、自然な言葉で必要な情報を検索できる仕組みへ。',
    features: [
      { title: '文書管理・分類表示', description: 'Reactの管理画面で文書を扱い、ローカルLLMによる自動分類・整理の結果を表示。' },
      { title: '文書の分割・ベクトル化', description: '文書をチャンクに分割してEmbeddingを生成し、PostgreSQLとpgvectorに保存。' },
      { title: '自然文検索・回答生成', description: '入力された質問に対して類似文書を検索し、RAGで検索内容を参照した回答を生成。' },
    ],
    design: [
      'React・TypeScriptの画面とPython・FastAPIのAPIを分け、文書管理・分類・検索を連携。',
      'OllamaのローカルLLMとPostgreSQL・pgvectorを組み合わせ、文書検索から回答生成までを構成。',
      'Windows Server上に実行環境を構築し、画面・API・データベース・LLMの連携を検証。',
    ],
    stack: [
      { label: '画面・API', value: 'React / TypeScript / Python / FastAPI' },
      { label: 'AI・検索基盤', value: 'Ollama / PostgreSQL / pgvector / RAG' },
      { label: '実行環境', value: 'Windows Server' },
    ],
    tech: ['Python', 'FastAPI', 'React', 'PostgreSQL', 'pgvector', 'Ollama'],
  },
  {
    id: 'geospatial-versions', category: 'GIS・データ管理',
    title: '地理空間データの世代管理システム',
    overview: '変更前後の道路ネットワークを自動比較し、道路の新設・廃止・形状変更を検出するシステム。ノード・リンクの接続関係を考慮し、分断・統合を含む変化と世代ごとの履歴を管理します。',
    purpose: '道路ネットワークの変化を差分データとして蓄積し、更新履歴と世代を管理。',
    features: [
      { title: '道路ネットワークの自動比較', description: '変更前後のデータを照合し、新設・廃止・形状変更を検出。' },
      { title: '接続関係・分断・統合の判定', description: 'ノードとリンクの接続関係を踏まえ、リンクの分断・統合を含む変化を検出。' },
      { title: '差分の蓄積・世代管理', description: '検出した変化差分を独自DBに登録・蓄積し、道路ネットワークの変更履歴を管理。' },
    ],
    design: [
      '図形の形状だけでなく、道路ネットワークの接続構造を考慮した比較方式と差分データ管理方式を設計。',
      '運用上の要望に合わせた機能改善と、不具合の調査・修正を継続できる保守・拡張に対応。',
    ],
    stack: [
      { label: 'アプリケーション', value: 'C++ / Windowsデスクトップ' },
      { label: 'データ管理', value: '独自DB / 道路ネットワーク / 世代間差分' },
      { label: '実行環境', value: 'Windows' },
    ],
    tech: ['C++', '独自DB', '道路ネットワーク', 'Windows'],
  },
  {
    id: 'gis-viewer', category: 'GIS・可視化・共有',
    title: 'GISビューア・地理空間データ共有システム',
    overview: '地理空間情報の表示・編集と、サーバーを介したデータ共有に対応するWindowsアプリケーション。図形と属性情報を関連付け、必要な範囲のデータを取得して複数クライアントで利用します。',
    purpose: '地図の閲覧だけでなく、図形の編集・属性確認・データ共有までを支援。',
    features: [
      { title: '地図表示・図形編集', description: 'ポリゴン・ラインの表示、追加・編集、図形の属性情報表示、レイヤー管理に対応。' },
      { title: '位置データの取り込み', description: 'CSVに含まれる緯度経度からポイントを生成して地図上に表示。' },
      { title: '範囲取得・サーバー共有', description: 'SQL・WFS等で必要範囲のデータを取得し、編集結果をサーバーに保存して共有。' },
    ],
    design: [
      'C++のクライアントと独自DBを組み合わせ、図形・属性情報の管理とサーバーへの保存を連携。',
      'AWS EC2上にWindows Server・IISを構築。セキュリティグループや通信設定を行い、接続と動作を検証。',
    ],
    stack: [
      { label: 'アプリ・データ', value: 'C++ / 独自DB / SQL / WFS' },
      { label: 'サーバー基盤', value: 'AWS EC2 / Windows Server / IIS' },
      { label: 'クライアント', value: 'Windows' },
    ],
    tech: ['C++', '独自DB', 'WFS', 'AWS EC2', 'IIS'],
  },
  {
    id: 'public-accounting', category: '業務システム・財務会計',
    title: '自治体向け財務会計システム',
    overview: '自治体の予算管理・予算執行、支出負担行為・支出命令に関する業務を扱う財務会計システム。業務画面とサーバー側の処理、会計データの登録・検索・更新を連携する構成です。',
    purpose: '予算と支出に関わる業務手続きを、画面・業務ロジック・会計データで支える。',
    features: [
      { title: '予算管理・予算執行', description: '予算を管理・執行するための画面と業務処理を実装。' },
      { title: '支出に関する業務処理', description: '支出負担行為・支出命令に関する画面設計と処理を実装。' },
      { title: '会計データの管理', description: 'Oracleを用いて会計データの登録・検索・更新処理を実行。' },
    ],
    design: [
      'PHP・JavaScriptの画面・業務処理とOracleを組み合わせ、既存の業務要件に沿って機能を設計。',
      '設計・ソースコードのレビュー、単体テスト、業務フローに沿った動作検証で品質を確認。',
    ],
    stack: [
      { label: '画面・業務処理', value: 'PHP / JavaScript' },
      { label: 'データベース', value: 'Oracle' },
      { label: 'サーバー環境', value: 'UNIX' },
    ],
    tech: ['PHP', 'JavaScript', 'Oracle', 'UNIX'],
  },
  {
    id: 'game-localization', category: '既存システム改修・移植',
    title: 'PCゲームの日本向け移植・ローカライズ',
    overview: '海外製PCゲームの日本国内向けWindows対応と日本語ローカライズ。既存のC++コードを解析し、文字コード・フォント・画面レイアウトを日本語表示に合わせて改修する開発事例です。',
    purpose: '既存ソフトウェアの構造を把握し、日本語表示と対象環境に合わせて機能を改修。',
    features: [
      { title: '既存コードの解析・改修', description: 'C++のソースコードと仕様を調査し、日本向けWindows環境への移植に必要な処理を改修。' },
      { title: '文字コード・フォント対応', description: '日本語表示に対応する文字コード処理を改修し、日本語フォントの表示を調整。' },
      { title: '画面レイアウトの調整', description: '日本語テキストに合わせて画面上の配置・表示を調整。' },
    ],
    design: [
      '既存C++コードの調査・解析を起点に、移植と日本語化に必要な変更箇所を整理。',
      '文字コード、フォント、画面レイアウトをそれぞれ調整し、日本語表示に対応。',
    ],
    stack: [
      { label: '実装言語', value: 'C++' },
      { label: '対象環境', value: 'Windows' },
    ],
    tech: ['C++', 'Windows', '日本語ローカライズ'],
  },
];

// Keep chat context compact; only facts visible in the case-study cards are used.
export const publicCaseKnowledge = caseStudies.map((project) =>
  `- ${project.title}: ${project.overview}\n  主な機能: ${project.features.map((feature) => feature.title).join('、')}。\n  構成: ${project.stack.map((item) => item.value).join(' / ')}。`
).join('\n');
