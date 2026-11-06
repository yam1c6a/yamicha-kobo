/** Curated summaries, not live web results or claims about the studio's experience.
 * Review the linked primary sources before changing checkedAt. Never add secrets.
 * Search remains local: no database, crawler, embedding API or new credentials.
 */
export const technicalNotes = [
  {
    id: 'aws-compute', title: 'AWSの実行基盤と運用責任', checkedAt: '2026-11-06',
    keywords: ['AWS', 'EC2', 'Lambda', 'Fargate', 'ECS', 'クラウド', 'サーバー', 'IIS', 'コンテナ', 'ホスティング'],
    text: '【責任分界】EC2のゲストOSの更新・パッチ・アプリ・セキュリティグループは利用者が管理する。EC2をフルマネージドOSと説明してはいけない。Fargateはコンテナを動かす基盤の構築・パッチをAWSが受け持つが、利用者はコンテナイメージ内のOSパッケージ・ライブラリ・アプリ、IAM、ネットワークを管理する。ECSはコンテナの配置やサービス管理、Fargateは実行基盤であり、役割が異なる。\n【条件付き設計案】コンテナ化していないWindows/IISの既存アプリなら、Windows EC2を移行検証の主案とし、DB・依存関係・ライセンスを確認する。Linuxコンテナ化済みでホスト管理を減らすならECSサービス＋Fargateタスクを比較する。EC2のホスト管理は外せるが、コンテナイメージの更新と再デプロイは残る。小規模でも認証・ネットワーク制限・監視は必要。単一インスタンスや単一タスクは高可用性を保証しない。OSをそのまま移す案とイベント駆動の関数へ改修する案は同一ではない。特定構成への移行可否や費用を確約せず、実際の依存関係を試作で確認する。',
    url: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-shared-model.html',
    sourceTitle: 'AWS公式：EC2・Fargateの責任分界',
  },
  {
    id: 'aws-operations', title: 'クラウドの運用・費用を含む設計', checkedAt: '2026-11-06',
    keywords: ['AWS', 'クラウド', '運用', 'バックアップ', '監視', '費用', '料金', 'コスト', '可用性', '障害', '復旧'],
    text: 'クラウド構成は実行基盤だけでなく、セキュリティ、信頼性、運用、性能、費用も評価する。用途に応じて監視、障害対応、バックアップと復元確認、変更管理を計画する。構成提案では「最小構成」と「可用性を高める追加構成」を区別し、運用担当と許容停止時間を確認する。料金はリージョン、稼働時間、台数、ストレージ、通信等の条件で変わる。この資料には最新単価はないため、金額や無料利用を保証せず、前提を整理して公式見積りへつなぐ。',
    url: 'https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html',
    sourceTitle: 'AWS公式：Well-Architectedフレームワーク',
  },
  {
    id: 'aws-security', title: 'AWSの認証・最小権限', checkedAt: '2026-11-06',
    keywords: ['IAM', '権限', '認証', 'アクセスキー', 'セキュリティ', '秘密鍵', 'MFA', 'ロール'],
    text: 'AWSでは必要な操作だけを許可する最小権限を基本とし、ワークロードにはIAMロールによる一時認証情報を優先する。人のアクセスにはフェデレーションや多要素認証を検討する。長期アクセスキーをブラウザや公開リポジトリへ埋め込まない。不要な権限・認証情報を見直し、公開アクセスやクロスアカウントアクセスを確認する。相談のために実際のキー、パスワード、機密設定を送る必要はない。',
    url: 'https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/best-practices.html',
    sourceTitle: 'AWS公式：IAMのセキュリティベストプラクティス',
  },
  {
    id: 'llm-selection', title: 'LLMの選定と比較評価', checkedAt: '2026-11-06',
    keywords: ['LLM', '生成AI', 'モデル', '選び', '比較', '評価', '賢く', '日本語', 'ベンチマーク'],
    text: 'モデルは用途を表す共通の質問セットで比較する。日本語の正確さ、指示への追従、出力形式、根拠の扱いを確認し、人による評価も組み合わせる。設計提案として、応答時間、入力・出力を含む利用費用、機密情報の扱い、運用負担も比較軸にする。一般ベンチマークの順位だけで用途への適性を断定しない。このノートに最新モデルの順位や単価は含まれない。RAGの検索精度と、与えた資料から答えるモデルの能力は分けて評価する。',
    url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html',
    sourceTitle: 'AWS公式：モデル・RAGの評価',
  },
  {
    id: 'llm-local', title: 'ローカルLLMとAPI利用の検討', checkedAt: '2026-11-06',
    keywords: ['ローカル', 'Ollama', 'GPU', 'VRAM', 'オンプレ', '外に出', '外部に出', '社外に出', '機密', 'APIと'],
    text: '【公式設定】Ollamaにはローカル実行とクラウド機能がある。ローカル専用ではローカルモデルを選び、OLLAMA_NO_CLOUD=1またはserver.jsonのdisable_ollama_cloudでクラウド機能を無効化し、再起動と設定確認を行う。これだけでシステム全体の外部通信がなくなる保証にはならない。\n【条件付き設計案】文書取込み・検索・埋め込み・生成・再ランキング・ログを別部品として確認する。生成LLMがローカルでも、埋め込みAPIやログ収集が社外へ送ることはあり得る。社外送信禁止なら各部品を社内に置き、外向き通信を制限し、テスト用データと通信記録で送信先を検証する。認証付きの社内検索アプリ→社内索引→必要な根拠だけをローカル生成LLMへ渡す構成を試作できる。ベクトル検索を使う場合は埋め込みもローカル生成。本文・質問ログは保存しないか必要最小限にし、アクセス制限と保持期間を設定する。\n【選定】APIは機器管理を減らせるが送信・保存・学習利用等の契約条件を確認する。許可が未確認なら公開・合成データだけで比較する。許可された評価環境で共通の質問セットを使い、品質と速度を比べる。ローカルではモデル・コンテキスト長・同時実行数によってメモリと速度が変わる。暗号化だけで送信禁止を満たすとは言わず、ローカル採用だけで安全と断言しない。',
    url: 'https://docs.ollama.com/faq', sourceTitle: 'Ollama公式：実行環境・メモリ・設定のFAQ',
  },
  {
    id: 'rag-design', title: 'RAGの構成と用途', checkedAt: '2026-11-06',
    keywords: ['RAG', 'ラグ', '社内文書', '社内資料', '文書検索', 'ナレッジ', 'ベクトル', 'Embedding', 'チャンク', 'pgvector', 'ファインチューニング'],
    text: 'RAGは質問に関係する資料を検索し、その内容をLLMへ渡して回答を生成する方式で、モデルの再学習とは異なる。資料取込み→テキスト抽出→適切な単位への分割→索引作成→質問に応じた検索→根拠付き回答、を基本構成とする。検索にはキーワード、ベクトル、ハイブリッド等の選択肢があり、必ずベクトルDBが必要というわけではない。文書の出典・版・更新日時・閲覧権限を持たせ、更新や削除も索引に反映する設計にする。RAGだけで誤答がなくなるとは保証しない。',
    url: 'https://learn.microsoft.com/ja-jp/azure/foundry/concepts/retrieval-augmented-generation',
    sourceTitle: 'Microsoft公式：RAGと検索インデックス',
  },
  {
    id: 'rag-quality', title: 'RAGの誤答の切り分け', checkedAt: '2026-11-06',
    keywords: ['RAG', '精度', '誤答', '間違', 'ハルシネーション', '根拠', '検索結果', '評価', 'rerank', '再ランキング'],
    text: 'RAGの評価では、まず正解に必要な資料が検索結果に含まれるかを調べ、次に回答がその資料に忠実か・質問に十分答えているかを分けて確認する。検索に問題があれば文書抽出、チャンク、索引、検索条件等を見直す。正しい資料が取れているのに誤答する場合は、プロンプト、資料の渡し方、生成モデルを評価する。回答できない質問や資料の更新・訂正もテストに含める。モデルを大きくするだけで検索側の欠落が直るとは限らない。効果は共通の評価セットで確認する。',
    url: 'https://learn.microsoft.com/ja-jp/azure/architecture/ai-ml/guide/rag/rag-llm-evaluation-phase',
    sourceTitle: 'Microsoft公式：RAGのエンドツーエンド評価',
  },
  {
    id: 'rag-security', title: 'RAGの閲覧権限と入力の安全性', checkedAt: '2026-11-06',
    keywords: ['RAG', '権限', '部署', 'テナント', '機密', '漏えい', '漏洩', '認証', 'プロンプトインジェクション', 'アクセス制御'],
    text: '社内文書検索では利用者の認証と文書単位のアクセス制御を設計し、検索時に許可された文書だけを取得する。プロンプトに「他部署の情報を出すな」と書くだけでは権限制御にならない。索引へ権限情報を反映し、参照元リンクでもアクセス権を検証する。取得した文書の文章は命令として実行しない。生成AIの出力や参照資料を無条件に信用せず、アプリ側の認可・検証を維持する。公開相談窓口へ機密文書そのものを入力しない。',
    url: 'https://learn.microsoft.com/en-us/azure/search/search-security-best-practices',
    sourceTitle: 'Microsoft公式：検索サービスのセキュリティ',
  },
  {
    id: 'rag-postgres', title: 'Python・PostgreSQLで組むRAGの具体例', checkedAt: '2026-11-06',
    requiresAny: ['PostgreSQL', 'Postgres', 'pgvector'],
    keywords: ['Python', 'PostgreSQL', 'Postgres', 'pgvector', 'RAG', '社内文書', '社内資料', '文書検索', '構成', '設計', '検索'],
    text: '【条件付きの主案】既存PostgreSQLを活用し、自然文の言い換えから資料を探したい場合は、Pythonの取込み処理＋PostgreSQL/pgvector＋検索API＋生成LLMを最小の試作案とする。公式のPython/PostgreSQL例を踏まえた設計例であり、工房の導入実績でも、Azureや特定LLMの利用を必須にするものでもない。\n【処理の流れ】文書→Pythonでテキスト抽出・見出し等を考慮した分割・埋め込み生成→PostgreSQLに本文・文書ID・出典・版・埋め込みを保存→Pythonの検索APIで認証・権限を確認して類似検索SQLを実行→許可済みの本文と出典だけをLLMへ渡し、根拠付きで回答。埋め込み生成と回答生成は別の処理。資料が足りなければ回答不能とする。\n【選ぶ理由と負担】既存DBで本文とベクトルを管理でき、専用ベクトルDBを別途増やさず始められる。一方、埋め込みの計算・保存と、文書更新時の再計算が必要。外部モデルを使えるかは機密性・契約条件を確認し、勝手に外部送信を前提にしない。\n【代替案】文書番号や固定用語の一致が中心ならキーワード検索から始める。両方が必要なら同じ質問セットで比較してハイブリッド検索を検討する。日本語は分かち書き等の検索構成を確認し、標準全文検索だけで十分とは断言しない。\n【権限・更新・検証】文書IDに閲覧権限をひも付け、サーバーで確認した利用者の権限を検索SQLに強制する。許可されない本文をLLMや外部の再ランキング処理へ渡さない。更新・削除・権限変更を検索対象へ反映し、参照リンクにも認可を適用する。正解資料が検索上位にあるか、回答がその資料に忠実かを別々に測る。別部署の資料が出ないことと、根拠のない質問に答えないこともテストする。',
    url: 'https://learn.microsoft.com/en-us/training/modules/build-rag-applications-azure-database-postgresql/5-build-rag-application-postgresql-python',
    sourceTitle: 'Microsoft公式：Python・PostgreSQLのRAG構築例',
  },
];
