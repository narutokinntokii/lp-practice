# LP制作練習

HTML・CSSを学びながら、複数のランディングページを制作する練習用プロジェクトです。

## 目的

- HTML・CSSの基礎を身につける
- レスポンシブデザインを学ぶ
- ポートフォリオに掲載できる作品を作る

## 制作作品

### 第1作目：Bakery こもれび
- **コンセプト**: 「家族の毎日に寄り添う」パン屋さんのランディングページ
- **使用技術**: HTML5（セマンティックマークアップ）、CSS3（Flexbox / CSS変数 / レスポンシブ対応）
- **フォルダ**: `bakery-lp/`
- **GitHub Pages**: [公開ページ](https://narutokinntokii.github.io/lp-practice/bakery-lp/)

### 第2作目：NEXUS FITNESS
- **コンセプト**: 「最新鋭の設備で、理想の身体を最短で。」フィットネスジムのランディングページ
- **使用技術**: HTML5、CSS3（Grid / Flexbox / CSS変数 / レスポンシブ対応）
- **フォルダ**: `fitness-gym-lp/`
- **GitHub Pages**: [公開ページ](https://narutokinntokii.github.io/lp-practice/fitness-gym-lp/)

### 第3作目：NEXUS FITNESS STORY LP
- **コンセプト**: 「スクロールするほど、理想の身体に近づいていく。」NEXUS FITNESSの発展版ランディングページ
- **使用技術**: HTML5、CSS3、JavaScript（IntersectionObserver / requestAnimationFrame / スクロール連動表現）
- **アクセシビリティ**: `prefers-reduced-motion`、JavaScript無効時の通常表示、レスポンシブ対応
- **フォルダ**: `nexus-fitness-story-lp/`
- **GitHub Pages**: [公開ページ](https://narutokinntokii.github.io/lp-practice/nexus-fitness-story-lp/)

### 第4作目：為替日和
- **コンセプト**: 「世界のお金を、暮らしの目線で。」実データを取得する為替チェックLP
- **使用技術**: HTML5、CSS3、JavaScript（Fetch API / SVGグラフ / レスポンシブ対応）
- **データ**: Frankfurter API経由のECB日次参考レート。主要4通貨、円→外貨 / 外貨→円のタブ切替、1か月 / 3か月 / 1年の推移グラフ
- **フォルダ**: `forex-check-lp/`
- **確認方法**: [index.html](forex-check-lp/index.html) をブラウザで開く。詳しくは [README](forex-check-lp/README.md)
- **GitHub Pages**: [公開ページ](https://narutokinntokii.github.io/lp-practice/forex-check-lp/)

- **操作**: 円は1,000円刻み、外貨は1通貨単位で増減。方向ごとの入力金額を保持
