/** Curated summaries, not live web results or claims about the studio's experience.
 * Review the linked primary sources before changing checkedAt. Never add secrets.
 * Search remains local: no database, crawler, embedding API or new credentials.
 */
export const technicalNotes = [
  {
    id: 'aws-compute', title: 'AWSの実行基盤の選び方', checkedAt: '2026-11-06',
    keywords: ['AWS', 'EC2', 'Lambda', 'Fargate', 'ECS', 'クラウド', 'サーバー', 'IIS', 'コンテナ', 'ホスティング'],
    text: 'AWSではOSを含む柔軟な制御が必要ならEC2、コンテナ化した処理ならECS等とFargate、イベント駆動の関数ならLambdaなどを比較する。既存OS・ライブラリ依存、常時実行かイベント駆動か、負荷変動、可用性、運用体制を選定軸にする。これは候補の整理であり、特定構成の導入可否を確約するものではない。小規模な用途に最初からKubernetes等の複雑な構成を必須としない。現行サービスの制限・料金は導入時に公式資料で確認する。',
    url: 'https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-compute-service.html',
    sourceTitle: 'AWS公式：コンピューティングサービスの選定',
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
    text: 'ローカル推論ではモデル、コンテキスト長、同時実行数などがメモリ使用や応答速度に影響する。Ollamaにはローカル実行とクラウド関連機能があるため、外部送信禁止の用途では実際の設定と通信経路を確認する。設計上、API利用は機器管理の負担を抑えやすい一方で、保存・学習利用・送信先等の契約条件を確認する。ローカルというだけで安全とはせず、認証、ネットワーク公開、ログやバックアップも確認する。どの構成が最適かは実際の文書と質問で評価する。',
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
];
